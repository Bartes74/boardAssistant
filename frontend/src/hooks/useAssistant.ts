import { useMutation } from '@tanstack/react-query';
import { createApiClient } from '../api/client';
import { useSupabaseAuth } from '../lib/supabaseClient';

export interface AssistantResponse {
  query_id: string;
  tldr: string;
  events: string[];
  articles: Array<{ id: string; title: string; summary?: string; url?: string }>;
  actions: Array<{ title: string; description: string }>;
  topics: Array<{ id?: string; title?: string; status?: string }>;
  confidence: number;
}

export function useAssistantQuery() {
  const { session } = useSupabaseAuth();
  return useMutation<AssistantResponse, unknown, { question: string }>({
    mutationFn: async ({ question }) => {
      const api = createApiClient(session?.access_token);
      const { data } = await api.post('/assistant/query', { question });
      return data;
    },
  });
}

export function useAssistantFeedback() {
  const { session } = useSupabaseAuth();
  return useMutation({
    mutationFn: async (payload: { queryId: string; importantTopics?: string[] }) => {
      const api = createApiClient(session?.access_token);
      await api.post('/assistant/feedback', {
        queryId: payload.queryId,
        importantTopics: payload.importantTopics ?? [],
        markAsUseful: true,
      });
    },
  });
}
