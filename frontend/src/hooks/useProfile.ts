import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSessionContext } from '@supabase/auth-helpers-react';
import { createApiClient } from '../api/client';

export interface UserProfile {
  id: string;
  regions: string[];
  industries: string[];
  competitorsWatch: string[];
  keywordsInclude: string[];
  keywordsExclude: string[];
  detailLevel: string;
  responseStyle: {
    length: string;
    format: string;
    language: string;
  };
  sourcePrefs: Record<string, unknown> | null;
}

export function useProfile() {
  const { session } = useSessionContext();
  return useQuery<UserProfile>({
    queryKey: ['profile'],
    queryFn: async () => {
      const api = createApiClient(session?.access_token);
      const { data } = await api.get('/profiles/me');
      return data;
    },
    enabled: Boolean(session?.access_token),
  });
}

export function useUpdateProfile() {
  const { session } = useSessionContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<UserProfile>) => {
      const api = createApiClient(session?.access_token);
      const { data } = await api.put('/profiles/me', payload);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}
