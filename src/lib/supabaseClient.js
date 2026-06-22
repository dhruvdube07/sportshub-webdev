import { createClient } from '@supabase/supabase-js';

const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

function makeClient(url, key) {
  try {
    return createClient(url, key);
  } catch (e) {
    return null;
  }
}

/**
 * Returns a Supabase client from (in order): Vite env, or sessionStorage dev overrides.
 * Use sessionStorage keys `DEV_SUPABASE_URL` and `DEV_SUPABASE_ANON_KEY` for temporary testing.
 */
export function getSupabase() {
  if (envUrl && envKey) return makeClient(envUrl, envKey);

  if (typeof window === 'undefined') return null;

  const devUrl = sessionStorage.getItem('DEV_SUPABASE_URL');
  const devKey = sessionStorage.getItem('DEV_SUPABASE_ANON_KEY');
  if (devUrl && devKey) return makeClient(devUrl, devKey);

  return null;
}

export const supabase = getSupabase();

export const supabaseErrorMessage =
  !envUrl || !envKey
    ? 'Missing Supabase environment variables. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to Webdev/.env.local or use the temporary Dev Key form on the Survey page.'
    : null;
