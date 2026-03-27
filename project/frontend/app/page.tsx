"use client";
export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  BookOpen, PlayCircle, Flame,
  Volume2, PlusCircle, Code, Terminal, Menu, Loader2, CheckCircle2, Search, X
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ── Types ────────────────────────────────────────────────────
interface TranscriptItem {
  text: string;
  start: number;
  duration: number;
}

interface SelectedWord {
  word: string;
  phonetic: string;
  definition: string;
  example: string;
}

interface VideoResult {
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string;
  description: string;
  publishedAt: string;
}

// ── Quick search suggestions ──────────────────────────────────
const SUGGESTIONS: Record<string, string[]> = {
  language: ['BBC English learning', 'English conversation practice', 'English grammar basics', 'Deutsch lernen A1', 'Easy German'],
  coding: ['JavaScript tutorial', 'React for beginners', 'Python basics', 'Next.js crash course', 'TypeScript tutorial'],
};

export default function LearnTubeMain() {
  const [learningMode, setLearningMode] = useState<'language' | 'coding'>('language');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<VideoResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);

  // Player state
  const [videoId, setVideoId] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [isLoadingTranscript, setIsLoadingTranscript] = useState(false);

  // Learning state
  const [selectedWord, setSelectedWord] = useState<SelectedWord | null>(null);
  const [isDictionaryLoading, setIsDictionaryLoading] = useState(false);
  const [codeNote, setCodeNote] = useState('');
  const [savedCount, setSavedCount] = useState({ vocab: 0, snippets: 0 });
  const [toast, setToast] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // ── Theme ─────────────────────────────────────────────────
  const theme = {
    accent: learningMode === 'language' ? '#f5a623' : '#3b82f6',
    accentLight: learningMode === 'language' ? 'rgba(245,166,35,0.15)' : 'rgba(59,130,246,0.15)',
    border: learningMode === 'language' ? 'rgba(245,166,35,0.3)' : 'rgba(59,130,246,0.3)',
    buttonText: learningMode === 'language' ? '#0d0f14' : '#ffffff',
  };

  // ── Fetch stats ───────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    const { count: vCount } = await supabase
      .from('vocab_words')
      .select('*', { count: 'exact', head: true });
    const { count: sCount } = await supabase
      .from('snippets')
      .select('*', { count: 'exact', head: true });
    setSavedCount({ vocab: vCount || 0, snippets: sCount || 0 });
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // ── Toast ─────────────────────────────────────────────────
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // ── YouTube Search ────────────────────────────────────────
  const searchVideos = useCallback(async (q: string, pageToken?: string) => {
    if (!q.trim()) return;
    setIsSearching(true);
    setSearchError('');

    try {
      const lang = learningMode === 'language' ? 'en' : 'en';
      const params = new URLSearchParams({ q, lang, ...(pageToken && { pageToken }) });
      const res = await fetch(`/api/youtube/search?${params}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Search failed');

      if (pageToken) {
        setSearchResults(prev => [...prev, ...data.videos]);
      } else {
        setSearchResults(data.videos);
      }
      setNextPageToken(data.nextPageToken || null);
      setHasSearched(true);
    } catch (err: unknown) {
      setSearchError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  }, [learningMode]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    searchVideos(searchQuery);
  }

  function handleSuggestion(s: string) {
    setSearchQuery(s);
    searchVideos(s);
  }

  // ── Load video ────────────────────────────────────────────
  const loadVideo = async (video: VideoResult) => {
    setVideoId(video.videoId);
    setVideoTitle(video.title);
    setTranscript([]);
    setIsLoadingTranscript(true);

    try {
      const res = await fetch(
        `https://learntube-backend-mqtg.onrender.com/api/transcript?video_url=https://www.youtube.com/watch?v=${video.videoId}`
      );
      const data = await res.json();
      setTranscript(res.ok ? data.transcript : []);
    } catch {
      setTranscript([]);
    } finally {
      setIsLoadingTranscript(false);
    }
  };

  // ── Dictionary lookup ─────────────────────────────────────
  const lookupWord = async (word: string) => {
    if (learningMode !== 'language') return;
    const cleanWord = word.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '').toLowerCase();
    if (!cleanWord) return;
    setIsDictionaryLoading(true);
    try {
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${cleanWord}`);
      const data = await res.json();
      if (data && data[0]) {
        setSelectedWord({
          word: data[0].word,
          phonetic: data[0].phonetic || '/no phonetic/',
          definition: data[0].meanings[0].definitions[0].definition,
          example: data[0].meanings[0].definitions[0].example || 'Study hard to see results.',
        });
      }
    } catch {
      // silent fail
    } finally {
      setIsDictionaryLoading(false);
    }
  };

  // ── Save to vocab (vocab_words table) ────────────────────
  const saveToVocab = async () => {
    if (!selectedWord) return;
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      showToast('Please login to save vocabulary!');
      return;
    }

    const { error } = await supabase.from('vocab_words').insert({
      user_id: user.id,
      word: selectedWord.word,
      phonetic: selectedWord.phonetic,
      definition: selectedWord.definition,
      example: selectedWord.example,
      language: 'en',
      source_video_id: videoId || null,
      source_video_title: videoTitle || null,
    });

    if (!error) {
      showToast(`✓ "${selectedWord.word}" added to your library!`);
      fetchStats();
    } else if (error.code === '23505') {
      showToast('Already in your library!');
    }
  };

  // ── Save snippet ──────────────────────────────────────────
  const saveSnippet = async () => {
    if (!codeNote || !videoId) return;
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      showToast('Please login to save code snippets!');
      return;
    }

    const { error } = await supabase.from('snippets').insert([{
      user_id: user.id,
      title: `Note from ${videoTitle || videoId}`,
      code: codeNote,
      language: 'javascript',
      source_video_id: videoId,
      source_video_title: videoTitle,
    }]);

    if (!error) {
      showToast('Code snippet saved!');
      setCodeNote('');
      fetchStats();
    }
  };

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#0b0d11] text-[#e8eaf0] font-sans">

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-[#1a1e2a] border border-[#4ecb8d4d] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="text-[#4ecb8d]" size={20} />
          <p className="text-sm font-bold tracking-tight">{toast}</p>
        </div>
      )}

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 bg-[#11141b] border-b border-[#1f222c] sticky top-0 z-50 shadow-xl">
        <div className="text-2xl font-black flex items-center gap-1">
          <span style={{ color: theme.accent }}>Learn</span>Tube
        </div>

        <div className="hidden lg:flex bg-[#1a1e2a] p-1 rounded-xl border border-[#252836]">
          <button
            onClick={() => setLearningMode('language')}
            className={`px-8 py-2 rounded-lg text-xs font-bold transition-all ${learningMode === 'language' ? 'bg-[#f5a623] text-black' : 'text-[#8890a4]'}`}
          >LANGUAGE</button>
          <button
            onClick={() => setLearningMode('coding')}
            className={`px-8 py-2 rounded-lg text-xs font-bold transition-all ${learningMode === 'coding' ? 'bg-[#3b82f6] text-white' : 'text-[#8890a4]'}`}
          >PROGRAMMING</button>
        </div>

        <div className="flex items-center gap-4">
          <div className="px-4 py-1.5 rounded-full text-sm font-bold border flex items-center gap-2"
            style={{ backgroundColor: theme.accentLight, borderColor: theme.border, color: theme.accent }}>
            <Flame size={16} fill={theme.accent} /> 5 Day Streak
          </div>
          <button className="lg:hidden" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            <Menu style={{ color: theme.accent }} />
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* ── Left: Player + Transcript ── */}
          <div className="lg:col-span-8 space-y-6">

            {/* Player */}
            <div className="bg-black border border-[#1f222c] rounded-3xl overflow-hidden aspect-video shadow-2xl relative">
              {videoId
                ? <iframe
                  key={videoId}
                  className="w-full h-full"
                  src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`}
                  allowFullScreen
                  title={videoTitle || 'LearnTube Player'}
                />
                : <div className="absolute inset-0 flex flex-col items-center justify-center opacity-20">
                  <PlayCircle size={80} strokeWidth={1} />
                  <p className="mt-4 font-black tracking-[0.3em] text-xs">READY FOR LEARNING</p>
                </div>
              }
            </div>

            {/* Transcript */}
            <div className="bg-[#11141b] border border-[#1f222c] rounded-3xl p-6 md:p-8">
              <h3 className="text-[#555d72] uppercase text-[10px] font-black tracking-widest mb-6 flex items-center gap-2">
                {learningMode === 'coding' ? <Terminal size={14} /> : <BookOpen size={14} />}
                {learningMode === 'coding' ? 'Concepts' : 'Click words to translate'}
              </h3>

              <div className="text-base md:text-xl leading-[2.3] text-[#8890a4] h-96 overflow-y-auto pr-4 custom-scrollbar">
                {isLoadingTranscript ? (
                  <div className="flex items-center justify-center h-full opacity-40">
                    <Loader2 className="animate-spin mr-2" />
                    <span className="text-xs font-bold uppercase tracking-widest">Loading transcript...</span>
                  </div>
                ) : transcript.length > 0 ? (
                  transcript.map((item, i) => (
                    <span
                      key={i}
                      onClick={() => lookupWord(item.text)}
                      className="cursor-pointer hover:text-white px-1 rounded transition-all"
                      style={{ borderBottom: `1px solid ${theme.accent}1a` }}
                    >{item.text} </span>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full opacity-20 text-center">
                    <BookOpen size={48} strokeWidth={1} className="mb-3" />
                    <p className="text-xs font-black uppercase tracking-widest">
                      {videoId ? 'No transcript available' : 'Select a video to see transcript'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Right: Search + Dictionary ── */}
          <div className="lg:col-span-4 space-y-6">

            {/* ── Search Box ── */}
            <div className="bg-[#11141b] border border-[#1f222c] rounded-3xl p-6">
              <h3 className="text-[#555d72] uppercase text-[10px] font-black tracking-widest mb-5 flex items-center gap-2">
                <Search size={14} /> Find Videos
              </h3>

              {/* Search input */}
              <form onSubmit={handleSearchSubmit} className="flex gap-2 mb-4">
                <div className="flex-1 flex items-center gap-2 bg-[#0b0d11] border border-[#1f222c] rounded-xl px-3 py-2.5 focus-within:border-opacity-60 transition-all"
                  style={{ '--tw-border-opacity': 1 } as React.CSSProperties}>
                  <Search size={14} className="text-[#555d72] flex-shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder={learningMode === 'language' ? 'Search English videos...' : 'Search coding tutorials...'}
                    className="flex-1 bg-transparent text-sm text-white placeholder-[#555d72] outline-none"
                  />
                  {searchQuery && (
                    <button type="button" onClick={() => { setSearchQuery(''); setSearchResults([]); setHasSearched(false); }}>
                      <X size={14} className="text-[#555d72] hover:text-white" />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isSearching || !searchQuery.trim()}
                  className="px-4 py-2.5 rounded-xl font-black text-xs transition-all disabled:opacity-40"
                  style={{ backgroundColor: theme.accent, color: theme.buttonText }}
                >
                  {isSearching ? <Loader2 size={14} className="animate-spin" /> : 'Go'}
                </button>
              </form>

              {/* Suggestions */}
              {!hasSearched && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {SUGGESTIONS[learningMode].map(s => (
                    <button
                      key={s}
                      onClick={() => handleSuggestion(s)}
                      className="text-[10px] px-2.5 py-1 bg-[#1a1e2a] border border-[#252836] rounded-lg text-[#8890a4] hover:text-white hover:border-[#555d72] transition-all"
                    >{s}</button>
                  ))}
                </div>
              )}

              {/* Error */}
              {searchError && (
                <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-xl px-3 py-2 mb-3">
                  ⚠ {searchError}
                </p>
              )}

              {/* Results */}
              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
                  {searchResults.map(video => (
                    <button
                      key={video.videoId}
                      onClick={() => loadVideo(video)}
                      className={`flex gap-3 w-full p-2.5 rounded-2xl border text-left transition-all group
                        ${videoId === video.videoId
                          ? 'border-opacity-60 bg-opacity-5'
                          : 'border-[#1f222c] hover:border-[#252836] hover:bg-[#1a1e2a]'
                        }`}
                      style={videoId === video.videoId ? { borderColor: theme.accent, backgroundColor: theme.accentLight } : {}}
                    >
                      {/* Thumbnail */}
                      <div className="relative w-[90px] h-[52px] rounded-xl overflow-hidden bg-[#1a1e2a] flex-shrink-0">
                        <Image
                          src={video.thumbnail}
                          alt={video.title}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                        <div className={`absolute inset-0 flex items-center justify-center transition-opacity
                          ${videoId === video.videoId ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                          <div className="w-6 h-6 rounded-full bg-black/60 flex items-center justify-center">
                            <PlayCircle size={14} className="text-white ml-0.5" />
                          </div>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-bold leading-tight line-clamp-2 mb-0.5
                          ${videoId === video.videoId ? '' : 'text-[#e8eaf0]'}`}
                          style={videoId === video.videoId ? { color: theme.accent } : {}}>
                          {video.title}
                        </p>
                        <p className="text-[10px] text-[#555d72]">{video.channel}</p>
                      </div>
                    </button>
                  ))}

                  {/* Load more */}
                  {nextPageToken && (
                    <button
                      onClick={() => searchVideos(searchQuery, nextPageToken)}
                      disabled={isSearching}
                      className="w-full py-2 text-[10px] font-bold text-[#555d72] border border-[#1f222c] rounded-xl hover:border-[#252836] hover:text-[#8890a4] transition-all disabled:opacity-40 uppercase tracking-wider"
                    >
                      {isSearching ? 'Loading...' : 'Load more'}
                    </button>
                  )}
                </div>
              )}

              {/* Empty search result */}
              {hasSearched && searchResults.length === 0 && !isSearching && (
                <div className="text-center py-6 opacity-30">
                  <Search size={32} className="mx-auto mb-2" strokeWidth={1} />
                  <p className="text-xs font-black uppercase tracking-widest">No results found</p>
                </div>
              )}
            </div>

            {/* ── Dictionary / Code Vault ── */}
            <div className="rounded-3xl p-0.5" style={{ background: `linear-gradient(to bottom, ${theme.accent}, transparent)` }}>
              <div className="bg-[#11141b] rounded-3xl p-6 md:p-8 min-h-80">
                <div className="flex items-center justify-between mb-8 text-[#555d72]">
                  <h3 className="uppercase text-[10px] font-black tracking-widest">
                    {learningMode === 'coding' ? 'Code Vault' : 'Dictionary'}
                  </h3>
                  {learningMode === 'coding' ? <Code size={20} /> : <Volume2 size={20} />}
                </div>

                {learningMode === 'coding' ? (
                  <div className="space-y-4">
                    <textarea
                      className="w-full bg-[#0b0d11] border border-[#1f222c] rounded-2xl p-5 text-xs font-mono text-[#4ecb8d] h-48 focus:outline-none resize-none"
                      placeholder="// Save code here..."
                      value={codeNote}
                      onChange={e => setCodeNote(e.target.value)}
                    />
                    <button
                      onClick={saveSnippet}
                      disabled={!codeNote || !videoId}
                      className="w-full py-4 rounded-2xl font-black text-sm uppercase disabled:opacity-40 transition-all"
                      style={{ backgroundColor: theme.accent, color: theme.buttonText }}
                    >Save Snippet</button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {isDictionaryLoading ? (
                      <div className="flex flex-col items-center justify-center h-40 opacity-40">
                        <Loader2 className="animate-spin mb-2" />
                        <p className="text-[10px] font-bold uppercase tracking-widest">Looking up...</p>
                      </div>
                    ) : selectedWord ? (
                      <div className="animate-in slide-in-from-bottom-4 duration-500">
                        <h2 className="text-4xl font-black mb-1 capitalize" style={{ color: theme.accent }}>{selectedWord.word}</h2>
                        <p className="text-[#555d72] text-[10px] font-black tracking-[0.2em] mb-6 uppercase">{selectedWord.phonetic}</p>
                        <div className="space-y-4 text-sm">
                          <p><span className="text-[#555d72] font-bold mr-2">DEF:</span>{selectedWord.definition}</p>
                          <p className="text-[#8890a4] italic"><span className="text-[#555d72] font-bold not-italic mr-2">EX:</span>&quot;{selectedWord.example}&quot;</p>
                        </div>
                        <button
                          onClick={saveToVocab}
                          className="w-full mt-8 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 uppercase transition-all hover:opacity-90"
                          style={{ backgroundColor: theme.accent, color: theme.buttonText }}
                        >
                          <PlusCircle size={18} /> Add to Library
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-40 opacity-10 text-center">
                        <BookOpen size={64} strokeWidth={1} className="mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em]">Select words to learn</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── Activity ── */}
            <div className="bg-[#11141b] border border-[#1f222c] rounded-3xl p-8 shadow-2xl">
              <h3 className="uppercase text-[10px] font-black tracking-widest text-[#555d72] mb-8">Activity</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-[#1a1e2a] p-4 rounded-2xl">
                  <span className="text-[10px] font-black text-[#555d72] uppercase tracking-wider">Vocab</span>
                  <span className="text-xl font-black" style={{ color: '#f5a623' }}>{savedCount.vocab}</span>
                </div>
                <div className="flex justify-between items-center bg-[#1a1e2a] p-4 rounded-2xl">
                  <span className="text-[10px] font-black text-[#555d72] uppercase tracking-wider">Snippets</span>
                  <span className="text-xl font-black" style={{ color: '#3b82f6' }}>{savedCount.snippets}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #0b0d11; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1f222c; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: ${theme.accent}; }
      `}</style>
    </div>
  );
}