import { FormEvent, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useProfile, useUpdateProfile, UserProfile } from '../../hooks/useProfile';

const defaultForm: Partial<UserProfile> = {
  regions: ['PL'],
  industries: ['banking'],
  competitorsWatch: ['Bank A'],
  keywordsInclude: ['ESG'],
  keywordsExclude: ['marketing'],
  detailLevel: 'medium',
  responseStyle: { length: 'short', format: 'bullets', language: 'pl' },
};

export function ProfilePage() {
  const { data, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const [form, setForm] = useState<Partial<UserProfile>>(defaultForm);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateProfile.mutate(form, {
      onSuccess: () => toast.success('Profil został zaktualizowany'),
      onError: () => toast.error('Nie udało się zapisać zmian'),
    });
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      <header className="rounded-3xl border border-white/5 bg-slate-900/60 p-6">
        <h2 className="text-lg font-semibold text-white">Preferencje profilu</h2>
        <p className="text-sm text-slate-400">Dostosuj, jakie informacje i w jakiej formie chcesz otrzymywać.</p>
        {isLoading && <p className="mt-2 text-xs text-slate-500">Ładowanie danych Supabase…</p>}
      </header>
      <section className="grid gap-6 md:grid-cols-2">
        <ProfileField
          label="Regiony"
          value={form.regions ?? []}
          onChange={(values) => setForm((prev) => ({ ...prev, regions: values }))}
        />
        <ProfileField
          label="Branże"
          value={form.industries ?? []}
          onChange={(values) => setForm((prev) => ({ ...prev, industries: values }))}
        />
        <ProfileField
          label="Konkurenci"
          value={form.competitorsWatch ?? []}
          onChange={(values) => setForm((prev) => ({ ...prev, competitorsWatch: values }))}
        />
        <ProfileField
          label="Słowa kluczowe — uwzględnij"
          value={form.keywordsInclude ?? []}
          onChange={(values) => setForm((prev) => ({ ...prev, keywordsInclude: values }))}
        />
        <ProfileField
          label="Słowa kluczowe — wyklucz"
          value={form.keywordsExclude ?? []}
          onChange={(values) => setForm((prev) => ({ ...prev, keywordsExclude: values }))}
        />
        <div className="rounded-3xl border border-white/5 bg-slate-900/60 p-6">
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">Poziom szczegółowości</label>
          <select
            value={form.detailLevel ?? 'medium'}
            onChange={(event) => setForm((prev) => ({ ...prev, detailLevel: event.target.value }))}
            className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none focus:border-sky-500"
          >
            <option value="low">Niski</option>
            <option value="medium">Średni</option>
            <option value="high">Wysoki</option>
          </select>
        </div>
      </section>
      <div className="flex justify-end">
        <button
          type="submit"
          className="rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 transition hover:from-sky-400 hover:to-indigo-400"
        >
          Zapisz zmiany
        </button>
      </div>
    </motion.form>
  );
}

interface ProfileFieldProps {
  label: string;
  value: string[];
  onChange: (values: string[]) => void;
}

function ProfileField({ label, value, onChange }: ProfileFieldProps) {
  return (
    <div className="rounded-3xl border border-white/5 bg-slate-900/60 p-6">
      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</label>
      <input
        value={value.join(', ')}
        onChange={(event) => onChange(event.target.value.split(/,\s*/).filter(Boolean))}
        className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none focus:border-sky-500"
      />
    </div>
  );
}
