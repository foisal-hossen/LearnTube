// frontend/lib/supabase.ts
// Browser-side Supabase client (Client Components এ ব্যবহার করো)

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database-types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Singleton — সারা app এ একটাই instance
export const supabase = createClient()