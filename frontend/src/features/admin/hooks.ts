import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createApiClient } from '../../api/client';
import { useSupabaseAuth } from '../../lib/supabaseClient';

export const USER_ROLES = ['ADMIN', 'BOARD_MEMBER', 'SECURITY_OFFICER'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface AdminUser {
  id: string;
  email: string | null;
  role: UserRole;
  createdAt: string | null;
  lastSignInAt: string | null;
}

interface CreateUserPayload {
  email: string;
  password: string;
  role: UserRole;
}

interface UpdateUserPayload {
  id: string;
  password?: string;
  role?: UserRole;
}

export function useAdminUsers() {
  const { session } = useSupabaseAuth();
  const token = session?.access_token;
  return useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const api = createApiClient(token);
      const { data } = await api.get<{ users: AdminUser[] }>('/admin/users');
      return data.users;
    },
    enabled: Boolean(token),
  });
}

export function useCreateAdminUser() {
  const queryClient = useQueryClient();
  const { session } = useSupabaseAuth();
  const token = session?.access_token;

  return useMutation({
    mutationFn: async (payload: CreateUserPayload) => {
      const api = createApiClient(token);
      const { data } = await api.post<AdminUser>('/admin/users', payload);
      return data;
    },
    onSuccess: () => {
      toast.success('Użytkownik został utworzony.');
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Nie udało się utworzyć użytkownika.';
      toast.error(message);
    },
  });
}

export function useUpdateAdminUser() {
  const queryClient = useQueryClient();
  const { session } = useSupabaseAuth();
  const token = session?.access_token;

  return useMutation({
    mutationFn: async (payload: UpdateUserPayload) => {
      const api = createApiClient(token);
      const { data } = await api.patch<AdminUser>(`/admin/users/${payload.id}`, payload);
      return data;
    },
    onSuccess: () => {
      toast.success('Użytkownik został zaktualizowany.');
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Nie udało się zaktualizować użytkownika.';
      toast.error(message);
    },
  });
}

export function useDeleteAdminUser() {
  const queryClient = useQueryClient();
  const { session } = useSupabaseAuth();
  const token = session?.access_token;

  return useMutation({
    mutationFn: async (userId: string) => {
      const api = createApiClient(token);
      await api.delete(`/admin/users/${userId}`);
    },
    onSuccess: () => {
      toast.success('Użytkownik został usunięty.');
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Nie udało się usunąć użytkownika.';
      toast.error(message);
    },
  });
}


