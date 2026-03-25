// frontend/src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bgialdqcmyflyswuwtib.supabase.co';
const supabaseKey = 'sb_publishable_00ne5NRpAj4NOeF65tGtGA_mIy94EQ1';

export const supabase = createClient(supabaseUrl, supabaseKey);