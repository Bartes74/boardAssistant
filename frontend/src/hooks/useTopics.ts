import { useQuery } from '@tanstack/react-query';
import { createApiClient } from '../api/client';
import { useSupabaseAuth } from '../lib/supabaseClient';

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

export interface TopicsResponse {
  topics: TopicSummary[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export function useTopics(params?: { limit?: number; offset?: number; status?: string; search?: string }) {
  const { session } = useSupabaseAuth();
  return useQuery<TopicsResponse>({
    queryKey: ['topics', params],
    queryFn: async () => {
      const api = createApiClient(session?.access_token);
      const searchParams = new URLSearchParams();
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.offset) searchParams.set('offset', params.offset.toString());
      if (params?.status) searchParams.set('status', params.status);
      if (params?.search) searchParams.set('search', params.search);
      const queryString = searchParams.toString();
      const { data } = await api.get<TopicsResponse>(`/topics${queryString ? `?${queryString}` : ''}`);
      return data;
    },
    enabled: Boolean(session?.access_token),
  });
}

export function useTopic(topicId: string) {
  const { session } = useSupabaseAuth();
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
