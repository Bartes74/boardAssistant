import { FormEvent, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useSupabaseAuth, useSupabaseClient } from '../../lib/supabaseClient';
import {
  USER_ROLES,
  AdminUser,
  UserRole,
  useAdminUsers,
  useCreateAdminUser,
  useDeleteAdminUser,
  useUpdateAdminUser,
} from './hooks';

function formatDate(value: string | null) {
  if (!value) {
    return '—';
  }
  try {
    return new Date(value).toLocaleString('pl-PL');
  } catch {
    return value;
  }
}

export function AdminPage() {
  const { session, isLoading } = useSupabaseAuth();
  const supabase = useSupabaseClient();

  const { data: users, isLoading: isUsersLoading } = useAdminUsers();
  const createUser = useCreateAdminUser();
  const updateUser = useUpdateAdminUser();
  const deleteUser = useDeleteAdminUser();

  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('BOARD_MEMBER');
  const [editedRoles, setEditedRoles] = useState<Record<string, UserRole>>({});
  const [editedPasswords, setEditedPasswords] = useState<Record<string, string>>({});
  const [selfPassword, setSelfPassword] = useState('');
  const [selfPasswordLoading, setSelfPasswordLoading] = useState(false);

  const isAdmin = useMemo(() => session?.user.app_metadata?.role === 'ADMIN', [session]);

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-10 text-center text-slate-300">
        Ładowanie panelu administracyjnego...
      </div>
    );
  }

  if (!session || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  const handleCreateUser = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newEmail || !newPassword) {
      toast.error('Podaj adres e-mail oraz hasło.');
      return;
    }
    createUser.mutate(
      { email: newEmail, password: newPassword, role: newRole },
      {
        onSuccess: () => {
          setNewEmail('');
          setNewPassword('');
          setNewRole('BOARD_MEMBER');
        },
      }
    );
  };

  const handleRoleChange = (userId: string, role: UserRole) => {
    setEditedRoles((previous) => ({ ...previous, [userId]: role }));
  };

  const handlePasswordChangeForUser = (userId: string, password: string) => {
    setEditedPasswords((previous) => ({ ...previous, [userId]: password }));
  };

  const handleSaveUser = (user: AdminUser) => {
    const role = editedRoles[user.id];
    const password = editedPasswords[user.id];
    if (!role && !password) {
      toast.message('Brak zmian do zapisania.');
      return;
    }
    updateUser.mutate(
      { id: user.id, role, password },
      {
        onSuccess: () => {
          setEditedRoles((prev) => {
            const next = { ...prev };
            delete next[user.id];
            return next;
          });
          setEditedPasswords((prev) => {
            const next = { ...prev };
            delete next[user.id];
            return next;
          });
        },
      }
    );
  };

  const handleSelfPasswordChange = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selfPassword) {
      toast.error('Podaj nowe hasło.');
      return;
    }
    // Walidacja po stronie klienta (podstawowa - pełna walidacja po stronie serwera)
    if (selfPassword.length < 8) {
      toast.error('Hasło powinno mieć co najmniej 8 znaków.');
      return;
    }
    try {
      setSelfPasswordLoading(true);
      const { error } = await supabase.auth.updateUser({ password: selfPassword });
      if (error) {
        throw error;
      }
      toast.success('Hasło zostało zmienione.');
      setSelfPassword('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nie udało się zmienić hasła.';
      toast.error(message);
    } finally {
      setSelfPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-xl">
        <h2 className="text-xl font-semibold text-white">Nowy użytkownik</h2>
        <form onSubmit={handleCreateUser} className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400" htmlFor="new-email">
              E-mail
            </label>
            <input
              id="new-email"
              type="email"
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40"
              placeholder="nowy.uzytkownik@firma.com"
              required
              autoComplete="off"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400" htmlFor="new-password">
              Hasło
            </label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40"
              placeholder="min. 8 znaków"
              minLength={8}
              required
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400" htmlFor="new-role">
              Rola
            </label>
            <select
              id="new-role"
              value={newRole}
              onChange={(event) => setNewRole(event.target.value as UserRole)}
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40"
            >
              {USER_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-4 flex justify-end">
            <button
              type="submit"
              disabled={createUser.isPending}
              className="rounded-xl bg-sky-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/20 transition hover:bg-sky-400 disabled:opacity-60"
            >
              {createUser.isPending ? 'Tworzenie...' : 'Dodaj użytkownika'}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-xl">
        <h2 className="text-xl font-semibold text-white">Zarządzaj użytkownikami</h2>
        {isUsersLoading ? (
          <p className="mt-6 text-sm text-slate-400">Ładowanie listy użytkowników...</p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800 text-sm text-slate-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left font-semibold uppercase tracking-wide text-slate-400">E-mail</th>
                  <th className="px-4 py-2 text-left font-semibold uppercase tracking-wide text-slate-400">Rola</th>
                  <th className="px-4 py-2 text-left font-semibold uppercase tracking-wide text-slate-400">
                    Ostatnie logowanie
                  </th>
                  <th className="px-4 py-2 text-left font-semibold uppercase tracking-wide text-slate-400">
                    Utworzono
                  </th>
                  <th className="px-4 py-2 text-right font-semibold uppercase tracking-wide text-slate-400">Akcje</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {(users ?? []).map((user) => {
                  const currentRole = editedRoles[user.id] ?? user.role;
                  const editedPassword = editedPasswords[user.id] ?? '';
                  const isSelf = user.id === session.user.id;

                  return (
                    <tr key={user.id}>
                      <td className="px-4 py-3 font-medium text-white">{user.email ?? '—'}</td>
                      <td className="px-4 py-3">
                        <select
                          value={currentRole}
                          onChange={(event) => handleRoleChange(user.id, event.target.value as UserRole)}
                          className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs uppercase tracking-wide text-slate-200 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40"
                        >
                          {USER_ROLES.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{formatDate(user.lastSignInAt)}</td>
                      <td className="px-4 py-3 text-slate-400">{formatDate(user.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-end gap-2">
                          <input
                            type="password"
                            value={editedPassword}
                            onChange={(event) => handlePasswordChangeForUser(user.id, event.target.value)}
                            placeholder="Nowe hasło"
                            minLength={8}
                            className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs text-white outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleSaveUser(user)}
                              disabled={updateUser.isPending || deleteUser.isPending}
                              className="rounded-lg bg-sky-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-sm shadow-sky-500/30 transition hover:bg-sky-400 disabled:opacity-60"
                            >
                              Zapisz
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteUser.mutate(user.id)}
                              disabled={isSelf || deleteUser.isPending || updateUser.isPending}
                              className="rounded-lg bg-rose-500 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-rose-500/30 transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Usuń
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {users && users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-400">
                      Brak użytkowników do wyświetlenia.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-xl">
        <h2 className="text-xl font-semibold text-white">Zmień swoje hasło</h2>
        <form onSubmit={handleSelfPasswordChange} className="mt-6 flex flex-col gap-4 md:flex-row">
          <div className="flex-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400" htmlFor="self-password">
              Nowe hasło
            </label>
            <input
              id="self-password"
              type="password"
              value={selfPassword}
              onChange={(event) => setSelfPassword(event.target.value)}
              minLength={8}
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40"
              placeholder="min. 8 znaków"
              autoComplete="new-password"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={selfPasswordLoading}
              className="rounded-xl bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-400 disabled:opacity-60"
            >
              {selfPasswordLoading ? 'Zapisywanie...' : 'Zmień hasło'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}


