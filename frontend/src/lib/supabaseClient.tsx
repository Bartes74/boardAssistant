import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export function createSupabaseClient(): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      detectSessionInUrl: true,
      autoRefreshToken: true,
    },
  });
}

type SupabaseContextValue = {
  client: SupabaseClient;
  session: Session | null;
  loading: boolean;
};

const SupabaseContext = createContext<SupabaseContextValue | undefined>(undefined);

export function SupabaseProvider({ children }: PropsWithChildren) {
  const [client] = useState(() => createSupabaseClient());
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    client.auth.getSession().then(({ data }) => {
      if (isMounted) {
        setSession(data.session ?? null);
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [client]);

  const value = useMemo(() => ({ client, session, loading }), [client, session, loading]);

  return <SupabaseContext.Provider value={value}>{children}</SupabaseContext.Provider>;
}

export type { Session, SupabaseClient };

function useSupabaseContext() {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error('Supabase hooks must be used within SupabaseProvider');
  }
  return context;
}

export function useSupabaseClient(): SupabaseClient {
  return useSupabaseContext().client;
}

export function useSupabaseAuth() {
  const { session, loading } = useSupabaseContext();
  return { session, isLoading: loading };
}

export function useSupabaseSession(): Session | null {
  return useSupabaseContext().session;
}
