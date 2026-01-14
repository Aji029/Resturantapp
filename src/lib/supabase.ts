console.log('[Supabase] ============================================');
console.log('[Supabase] MODULE LOADING');
console.log('[Supabase] ============================================');

import { createClient } from '@supabase/supabase-js';

console.log('[Supabase] Imports completed');

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('[Supabase] Environment check:');
console.log('  - URL:', supabaseUrl ? 'present' : 'MISSING');
console.log('  - Key:', supabaseAnonKey ? 'present' : 'MISSING');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase] CRITICAL ERROR - Missing environment variables!');
  console.error('  VITE_SUPABASE_URL:', supabaseUrl);
  console.error('  VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '[REDACTED]' : 'undefined');
  throw new Error('Missing Supabase environment variables - check .env file');
}

console.log('[Supabase] Creating client...');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

console.log('[Supabase] ✓ Client initialized successfully');
console.log('[Supabase] ============================================');
