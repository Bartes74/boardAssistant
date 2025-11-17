import { useQuery } from '@tanstack/react-query';
import { useSessionContext } from '@supabase/auth-helpers-react';
import { createApiClient } from '../api/client';

export interface TopicSummary {
  id: string;
  title: string;
  topicStatus: string;
  userScore: number;
  pinned: boolean;
  hidden: boolean;
  lastEventAt?: string;
}

export interface TopicDetail extends TopicSummary {
  documents: Array<{
    id: string;
    title: string;
    summary: string | null;
    status: string;
    docType: string | null;
    publishedAt: string | null;
  }>;
}

export function useTopics() {
  const { session } = useSessionContext();
  return useQuery<TopicSummary[]>({
    queryKey: ['topics'],
    queryFn: async () => {
      const api = createApiClient(session?.access_token);
      const { data } = await api.get('/topics');
      return data;
    },
    enabled: Boolean(session?.access_token),
  });
}

export function useTopic(topicId: string) {
  const { session } = useSessionContext();
  return useQuery<TopicDetail>({
    queryKey: ['topics', topicId],
    queryFn: async () => {
      const api = createApiClient(session?.access_token);
      const { data } = await api.get(`/topics/${topicId}`);
      return data;
    },
    enabled: Boolean(topicId && session?.access_token),
  });
}
