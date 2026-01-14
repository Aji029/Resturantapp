import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('[Supabase] Initializing with URL:', supabaseUrl ? 'present' : 'missing');
console.log('[Supabase] Anon key:', supabaseAnonKey ? 'present' : 'missing');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase] Missing environment variables!');
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

console.log('[Supabase] Client initialized successfully');
