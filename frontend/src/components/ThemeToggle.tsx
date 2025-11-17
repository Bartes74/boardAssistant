import { useThemeStore } from '../store/theme';
import { MoonStar, Sun } from 'lucide-react';

export function ThemeToggle() {
  const darkMode = useThemeStore((state) => state.darkMode);
  const toggle = useThemeStore((state) => state.toggle);

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-slate-900/60 text-slate-200 transition hover:border-sky-400 hover:text-sky-300"
      aria-label={darkMode ? 'Włącz tryb jasny' : 'Włącz tryb ciemny'}
    >
      {darkMode ? <Sun className="h-5 w-5" /> : <MoonStar className="h-5 w-5" />}
    </button>
  );
}
