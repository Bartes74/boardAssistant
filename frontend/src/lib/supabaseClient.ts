import { createBrowserSupabaseClient } from '@supabase/auth-helpers-react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { useMemo } from 'react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export function createSupabaseClient(): SupabaseClient {
  return createBrowserSupabaseClient({
    supabaseUrl,
    supabaseKey: supabaseAnonKey,
    options: {
      auth: {
        persistSession: true,
        detectSessionInUrl: true,
      },
    },
  });
}

export function useSupabaseClientMemo(existing?: SupabaseClient) {
  return useMemo(() => existing ?? createSupabaseClient(), [existing]);
}

export type { Session, SupabaseClient };
