import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ReactNode } from 'react';
import clsx from 'clsx';
import { ThemeToggle } from './ThemeToggle';
import { useSupabaseAuth, useSupabaseClient } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';

export function AppLayout(): ReactNode {
  const { session } = useSupabaseAuth();
  const { data: authUser } = useAuth();
  const supabase = useSupabaseClient();
  const navigate = useNavigate();
  const userRole = authUser?.role || session?.user.app_metadata?.role;
  const isAdmin = userRole === 'ADMIN';
  const isSecurityOfficer = userRole === 'SECURITY_OFFICER' || isAdmin;

  const navItems: Array<{ to: string; label: string; hotkey?: string }> = [
    { to: '/', label: 'Co nowego', hotkey: '1' },
    { to: '/assistant/chat', label: 'Asystent', hotkey: '2' },
    { to: '/topics', label: 'Tematy', hotkey: '3' },
    { to: '/settings/profile', label: 'Profil', hotkey: '4' },
    ...(isAdmin ? [{ to: '/admin', label: 'Administracja', hotkey: '5' as const }] : []),
    ...(isSecurityOfficer ? [{ to: '/security', label: 'Bezpieczeństwo', hotkey: '6' as const }] : []),
  ];

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate('/auth/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <header className="border-b border-white/10 bg-white/5 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-sky-400">Board Member Assistant</p>
          </div>
          <div className="flex items-center gap-3">
            <nav className="hidden gap-2 rounded-full border border-white/10 bg-slate-900/60 px-2 py-1 text-sm shadow-sm shadow-sky-500/10 md:flex">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    clsx(
                      'rounded-full px-4 py-1.5 transition',
                      isActive ? 'bg-sky-500 text-slate-950 shadow-sm shadow-sky-400/40' : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                    )
                  }
                >
                  <span className="hidden md:inline">{item.label}</span>
                  {item.hotkey && <span className="ml-2 hidden text-xs text-slate-400 xl:inline">⌘{item.hotkey}</span>}
                </NavLink>
              ))}
            </nav>
            <ThemeToggle />
            <div className="flex items-center gap-3 rounded-full border border-white/10 bg-slate-900/60 px-4 py-2 text-sm">
              <div>
                <p className="font-medium text-white">{session?.user.email ?? 'Nieznany użytkownik'}</p>
                <p className="text-xs text-slate-400">Zalogowany użytkownik</p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:bg-slate-700"
              >
                Wyloguj
              </button>
            </div>
          </div>
        </div>
        <div className="mx-auto mt-4 flex max-w-6xl gap-2 px-6 pb-4 md:hidden">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  'flex-1 rounded-xl px-3 py-2 text-center text-xs font-medium transition',
                  isActive ? 'bg-sky-500 text-slate-950' : 'bg-slate-900/60 text-slate-300'
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}
