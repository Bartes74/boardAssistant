import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useSupabaseAuth, useSupabaseClient } from '../../lib/supabaseClient';

export function LoginPage() {
  const supabase = useSupabaseClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { session, isLoading } = useSupabaseAuth();

  useEffect(() => {
    if (!isLoading && session) {
      const role = session.user.app_metadata?.role;
      if (role === 'ADMIN') {
        navigate('/admin', { replace: true });
      } else if (role === 'SECURITY_OFFICER') {
        navigate('/security', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [isLoading, session, navigate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email || !password) {
      toast.error('Podaj adres e-mail i hasło.');
      return;
    }
    try {
      setLoading(true);
      const { error, data } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        throw error;
      }
      if (data.session) {
        toast.success('Zalogowano pomyślnie.');
        const role = data.user?.app_metadata?.role;
        if (role === 'ADMIN') {
          navigate('/admin', { replace: true });
        } else if (role === 'SECURITY_OFFICER') {
          navigate('/security', { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nie udało się zalogować.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-6 py-16">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/70 p-10 shadow-2xl backdrop-blur">
        <h1 className="text-2xl font-semibold text-white">Zaloguj się do Asystenta Zarządu</h1>
        <p className="mt-2 text-sm text-slate-400">Podaj służbowy adres e-mail i hasło, aby zalogować się do panelu.</p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
              Adres e-mail
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40"
              placeholder="imię.nazwisko@firma.com"
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
              Hasło
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40"
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition hover:from-sky-400 hover:to-indigo-400 disabled:opacity-60"
          >
            {loading ? 'Logowanie...' : 'Zaloguj się'}
          </button>
        </form>
      </div>
    </div>
  );
}
