import { FormEvent, useState } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { toast } from 'sonner';

export function LoginPage() {
  const supabase = useSupabaseClient();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email) return;
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
      if (error) throw error;
      toast.success('Sprawdź skrzynkę pocztową – wysłaliśmy link logowania.');
    } catch (error) {
      toast.error('Nie udało się wysłać linku logowania.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-6 py-16">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/70 p-10 shadow-2xl backdrop-blur">
        <h1 className="text-2xl font-semibold text-white">Zaloguj się do Asystenta Zarządu</h1>
        <p className="mt-2 text-sm text-slate-400">
          Podaj służbowy adres e-mail. Wyślemy Ci bezpieczny link logowania (MFA w Supabase).
        </p>
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
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition hover:from-sky-400 hover:to-indigo-400 disabled:opacity-60"
          >
            {loading ? 'Wysyłanie...' : 'Wyślij link logowania'}
          </button>
        </form>
      </div>
    </div>
  );
}
