import { useQuery } from '@tanstack/react-query';
import { createApiClient } from '../api/client';
import { useSupabaseAuth } from '../lib/supabaseClient';

export interface AuthUser {
  userId: string;
  role: 'ADMIN' | 'BOARD_MEMBER' | 'SECURITY_OFFICER';
  email?: string;
}

export function useAuth() {
  const { session, isLoading } = useSupabaseAuth();
  const token = session?.access_token;

  return useQuery<AuthUser>({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const api = createApiClient(token);
      const { data } = await api.get<AuthUser>('/auth/me');
      return data;
    },
    enabled: Boolean(token),
    staleTime: 5 * 60 * 1000, // 5 minut
  });
}

