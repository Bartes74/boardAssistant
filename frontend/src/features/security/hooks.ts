import { useQuery } from '@tanstack/react-query';
import { createApiClient } from '../../api/client';
import { useSupabaseAuth } from '../../lib/supabaseClient';

export interface AuditLog {
  id: string;
  actorId: string | null;
  actorRole: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuditLogsResponse {
  logs: AuditLog[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface AuditStats {
  total: number;
  last24h: number;
  byAction: Array<{ action: string; count: number }>;
  byRole: Array<{ role: string | null; count: number }>;
}

interface GetAuditLogsParams {
  limit: number;
  offset: number;
  action?: string;
  actorId?: string;
}

export function useSecurityAuditLogs(params: GetAuditLogsParams) {
  const { session } = useSupabaseAuth();
  const token = session?.access_token;

  return useQuery<AuditLogsResponse>({
    queryKey: ['security', 'audit-logs', params],
    queryFn: async () => {
      const api = createApiClient(token);
      const searchParams = new URLSearchParams();
      searchParams.set('limit', params.limit.toString());
      searchParams.set('offset', params.offset.toString());
      if (params.action) searchParams.set('action', params.action);
      if (params.actorId) searchParams.set('actorId', params.actorId);

      const { data } = await api.get<AuditLogsResponse>(`/security/audit-logs?${searchParams.toString()}`);
      return data;
    },
    enabled: Boolean(token),
  });
}

export function useSecurityStats() {
  const { session } = useSupabaseAuth();
  const token = session?.access_token;

  return useQuery<AuditStats>({
    queryKey: ['security', 'stats'],
    queryFn: async () => {
      const api = createApiClient(token);
      const { data } = await api.get<AuditStats>('/security/audit-logs/stats');
      return data;
    },
    enabled: Boolean(token),
  });
}

