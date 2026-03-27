// frontend/lib/database-types.ts
// Supabase table-এর TypeScript types — এই file টা manually লেখা

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string | null
          full_name: string | null
          avatar_url: string | null
          streak_count: number
          longest_streak: number
          last_active_date: string | null
          total_mins: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          streak_count?: number
          longest_streak?: number
          last_active_date?: string | null
          total_mins?: number
        }
        Update: {
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          streak_count?: number
          longest_streak?: number
          last_active_date?: string | null
          total_mins?: number
        }
        Relationships: []
      }
      vocab_words: {
        Row: {
          id: string
          user_id: string
          word: string
          phonetic: string | null
          definition: string | null
          example: string | null
          language: string
          source_video_id: string | null
          source_video_title: string | null
          review_count: number
          last_reviewed_at: string | null
          next_review_at: string | null
          is_mastered: boolean
          created_at: string
        }
        Insert: {
          user_id: string
          word: string
          phonetic?: string | null
          definition?: string | null
          example?: string | null
          language?: string
          source_video_id?: string | null
          source_video_title?: string | null
        }
        Update: {
          word?: string
          definition?: string | null
          review_count?: number
          last_reviewed_at?: string | null
          next_review_at?: string | null
          is_mastered?: boolean
        }
        Relationships: []
      }
      sessions: {
        Row: {
          id: string
          user_id: string
          video_id: string | null
          video_title: string | null
          duration_mins: number
          words_saved: number
          language: string
          session_date: string
          created_at: string
        }
        Insert: {
          user_id: string
          video_id?: string | null
          video_title?: string | null
          duration_mins?: number
          words_saved?: number
          language?: string
          session_date?: string
        }
        Update: {
          duration_mins?: number
          words_saved?: number
        }
        Relationships: []
      }
      snippets: {
        Row: {
          id: string
          user_id: string
          title: string
          code: string
          language: string
          description: string | null
          source_video_id: string | null
          source_video_title: string | null
          tags: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          title: string
          code: string
          language?: string
          description?: string | null
          source_video_id?: string | null
          source_video_title?: string | null
          tags?: string[] | null
        }
        Update: {
          title?: string
          code?: string
          description?: string | null
          tags?: string[] | null
        }
        Relationships: []
      }
      flashcard_sessions: {
        Row: {
          id: string
          user_id: string
          total_cards: number
          known_cards: number
          score_pct: number
          language: string
          created_at: string
        }
        Insert: {
          user_id: string
          total_cards: number
          known_cards: number
          score_pct: number
          language?: string
        }
        Update: {
          user_id?: string
          total_cards?: number
          known_cards?: number
          score_pct?: number
          language?: string
        }
        Relationships: []
      }
      daily_goals: {
        Row: {
          id: string
          user_id: string
          goal_date: string
          target_mins: number
          target_words: number
          target_flashcards: number
          actual_mins: number
          actual_words: number
          actual_flashcards: number
          created_at: string
        }
        Insert: {
          user_id: string
          goal_date?: string
          target_mins?: number
          target_words?: number
          target_flashcards?: number
        }
        Update: {
          actual_mins?: number
          actual_words?: number
          actual_flashcards?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types — সারা project এ ব্যবহার করো
export type Profile = Database['public']['Tables']['profiles']['Row']
export type VocabWord = Database['public']['Tables']['vocab_words']['Row']
export type Session = Database['public']['Tables']['sessions']['Row']
export type Snippet = Database['public']['Tables']['snippets']['Row']
export type FlashcardSession = Database['public']['Tables']['flashcard_sessions']['Row']
export type DailyGoal = Database['public']['Tables']['daily_goals']['Row']