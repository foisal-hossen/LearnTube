// frontend/lib/auth.ts
// Auth helper functions — সারা app এ ব্যবহার করো

import { supabase } from './supabase'

// ── SIGN UP ──────────────────────────────────────────────────
export async function signUp(email: string, password: string, fullName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  })

  if (error) throw error
  return data
}

// ── SIGN IN ──────────────────────────────────────────────────
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error
  return data
}

// ── SIGN OUT ─────────────────────────────────────────────────
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// ── GET CURRENT USER ─────────────────────────────────────────
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) return null
  return user
}

// ── GET PROFILE ──────────────────────────────────────────────
export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) return null
  return data
}

// ── UPDATE STREAK ────────────────────────────────────────────
// প্রতিদিন login করলে অথবা session log করলে call করো
export async function updateStreak(userId: string) {
  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

  const { data: profile } = await supabase
    .from('profiles')
    .select('streak_count, longest_streak, last_active_date')
    .eq('id', userId)
    .single()

  if (!profile) return

  const lastActive = profile.last_active_date
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  let newStreak = profile.streak_count

  if (lastActive === today) {
    // আজকে already active — কিছু করতে হবে না
    return
  } else if (lastActive === yesterdayStr) {
    // গতকাল active ছিল — streak বাড়াও
    newStreak = profile.streak_count + 1
  } else {
    // missed day — streak reset
    newStreak = 1
  }

  const newLongest = Math.max(newStreak, profile.longest_streak)

  await supabase
    .from('profiles')
    .update({
      streak_count: newStreak,
      longest_streak: newLongest,
      last_active_date: today,
    })
    .eq('id', userId)

  return newStreak
}

// ── LOG SESSION ──────────────────────────────────────────────
export async function logSession(params: {
  userId: string
  videoId?: string
  videoTitle?: string
  durationMins: number
  wordsSaved?: number
  language?: string
}) {
  const today = new Date().toISOString().split('T')[0]

  // Session insert
  const { error: sessionError } = await supabase
    .from('sessions')
    .insert({
      user_id: params.userId,
      video_id: params.videoId,
      video_title: params.videoTitle,
      duration_mins: params.durationMins,
      words_saved: params.wordsSaved ?? 0,
      language: params.language ?? 'en',
      session_date: today,
    })

  if (sessionError) throw sessionError

  // Profile total_mins update
  await supabase.rpc('increment_total_mins', {
    user_id_input: params.userId,
    mins_to_add: params.durationMins,
  }).catch(() => {
    // RPC না থাকলে manual update
    return supabase
      .from('profiles')
      .select('total_mins')
      .eq('id', params.userId)
      .single()
      .then(({ data }) => {
        return supabase
          .from('profiles')
          .update({ total_mins: (data?.total_mins ?? 0) + params.durationMins })
          .eq('id', params.userId)
      })
  })

  // Daily goal update
  await supabase
    .from('daily_goals')
    .upsert({
      user_id: params.userId,
      goal_date: today,
    }, { onConflict: 'user_id,goal_date', ignoreDuplicates: true })

  await supabase.rpc('update_daily_goal_mins', {
    user_id_input: params.userId,
    date_input: today,
    mins_to_add: params.durationMins,
  }).catch(() => {
    // Fallback: manually update
    return supabase
      .from('daily_goals')
      .select('actual_mins')
      .eq('user_id', params.userId)
      .eq('goal_date', today)
      .single()
      .then(({ data }) => {
        return supabase
          .from('daily_goals')
          .update({ actual_mins: (data?.actual_mins ?? 0) + params.durationMins })
          .eq('user_id', params.userId)
          .eq('goal_date', today)
      })
  })

  // Streak update
  await updateStreak(params.userId)
}

// ── SAVE VOCAB WORD ──────────────────────────────────────────
export async function saveVocabWord(params: {
  userId: string
  word: string
  phonetic?: string
  definition?: string
  example?: string
  language?: string
  sourceVideoId?: string
  sourceVideoTitle?: string
}) {
  // Duplicate check
  const { data: existing } = await supabase
    .from('vocab_words')
    .select('id')
    .eq('user_id', params.userId)
    .eq('word', params.word.toLowerCase())
    .eq('language', params.language ?? 'en')
    .single()

  if (existing) {
    return { duplicate: true, data: existing }
  }

  const { data, error } = await supabase
    .from('vocab_words')
    .insert({
      user_id: params.userId,
      word: params.word.toLowerCase(),
      phonetic: params.phonetic,
      definition: params.definition,
      example: params.example,
      language: params.language ?? 'en',
      source_video_id: params.sourceVideoId,
      source_video_title: params.sourceVideoTitle,
    })
    .select()
    .single()

  if (error) throw error

  // Daily goal: words count update
  const today = new Date().toISOString().split('T')[0]
  const { data: goal } = await supabase
    .from('daily_goals')
    .select('actual_words')
    .eq('user_id', params.userId)
    .eq('goal_date', today)
    .single()

  if (goal) {
    await supabase
      .from('daily_goals')
      .update({ actual_words: goal.actual_words + 1 })
      .eq('user_id', params.userId)
      .eq('goal_date', today)
  }

  return { duplicate: false, data }
}

// ── GET VOCAB WORDS ──────────────────────────────────────────
export async function getVocabWords(userId: string, language?: string) {
  let query = supabase
    .from('vocab_words')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (language) {
    query = query.eq('language', language)
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

// ── GET PROGRESS STATS ───────────────────────────────────────
export async function getProgressStats(userId: string) {
  const [profileRes, vocabRes, sessionsRes, flashRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('vocab_words').select('id, language, is_mastered').eq('user_id', userId),
    supabase.from('sessions').select('duration_mins, session_date, language').eq('user_id', userId),
    supabase.from('flashcard_sessions').select('score_pct').eq('user_id', userId).order('created_at', { ascending: false }).limit(1),
  ])

  const profile = profileRes.data
  const vocab = vocabRes.data ?? []
  const sessions = sessionsRes.data ?? []
  const lastFlash = flashRes.data?.[0]

  // Last 30 days active
  const activeDays = [...new Set(sessions.map(s => s.session_date))]

  return {
    streakCount: profile?.streak_count ?? 0,
    longestStreak: profile?.longest_streak ?? 0,
    totalMins: profile?.total_mins ?? 0,
    totalWords: vocab.length,
    masteredWords: vocab.filter(v => v.is_mastered).length,
    enWords: vocab.filter(v => v.language === 'en').length,
    deWords: vocab.filter(v => v.language === 'de').length,
    lastFlashScore: lastFlash?.score_pct ?? null,
    activeDays,
  }
}