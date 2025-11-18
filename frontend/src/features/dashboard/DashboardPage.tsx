import { useTopics } from '../../hooks/useTopics';
import { useAssistantQuery } from '../../hooks/useAssistant';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Sparkles, Files } from 'lucide-react';

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: index * 0.08, duration: 0.4, ease: 'easeOut' },
  }),
};

export function DashboardPage() {
  const { data: topics, isLoading: isTopicsLoading, error: topicsError } = useTopics();
  const { mutate, data: assistantResponse, isPending: isAssistantPending, error: assistantError } = useAssistantQuery();

  useEffect(() => {
    if (!assistantResponse) {
      mutate({ question: 'Co nowego w tym tygodniu?' });
    }
  }, [assistantResponse, mutate]);

  const topTopics = topics?.topics?.slice(0, 4) ?? [];

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-3xl border border-white/5 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-slate-900/90 p-8 shadow-2xl shadow-sky-500/10"
        >
          <div className="flex items-center gap-3 text-slate-300">
            <Sparkles className="h-6 w-6 text-sky-400" />
            <span className="text-sm uppercase tracking-[0.4em] text-sky-400">TL;DR tygodnia</span>
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-white">Strategiczne podsumowanie dla Ciebie</h2>
          {assistantError ? (
            <div className="mt-4 rounded-xl border border-rose-500/50 bg-rose-500/10 p-4">
              <p className="text-sm font-semibold text-rose-300">Błąd ładowania podsumowania</p>
              <p className="mt-1 text-xs text-rose-400">
                {assistantError instanceof Error ? assistantError.message : 'Nie udało się pobrać danych z asystenta'}
              </p>
            </div>
          ) : assistantResponse ? (
            <>
              <p className="mt-4 text-base leading-relaxed text-slate-200">{assistantResponse.tldr}</p>
              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Kluczowe wydarzenia</h3>
                  <ul className="mt-3 space-y-2 text-sm text-slate-200">
                    {assistantResponse.events.map((event) => (
                      <li key={event} className="rounded-xl border border-white/5 bg-slate-900/60 px-4 py-3">
                        {event}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Rekomendowane działania</h3>
                  <ul className="mt-3 space-y-2 text-sm text-slate-200">
                    {assistantResponse.actions.map((action) => (
                      <li key={action.title} className="rounded-xl border border-white/5 bg-slate-900/60 px-4 py-3">
                        <p className="font-semibold text-slate-100">{action.title}</p>
                        <p className="text-xs text-slate-400">{action.description}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          ) : isAssistantPending ? (
            <p className="mt-4 animate-pulse text-sm text-slate-400">Ładowanie silnika wiedzy…</p>
          ) : null}
        </motion.section>
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-3xl border border-white/5 bg-slate-900/60 p-6 shadow-xl shadow-slate-900/30"
        >
          <h2 className="flex items-center gap-3 text-lg font-semibold text-white">
            <Files className="h-5 w-5 text-sky-400" />
            Puls tematów
          </h2>
          {topicsError ? (
            <div className="mt-4 rounded-xl border border-rose-500/50 bg-rose-500/10 p-4">
              <p className="text-sm font-semibold text-rose-300">Błąd ładowania tematów</p>
              <p className="mt-1 text-xs text-rose-400">
                {topicsError instanceof Error ? topicsError.message : 'Nie udało się pobrać listy tematów'}
              </p>
            </div>
          ) : isTopicsLoading ? (
            <p className="mt-4 text-sm text-slate-400">Wczytywanie tematów…</p>
          ) : null}
          <div className="mt-4 space-y-3">
            {topTopics.map((topic, index) => (
              <motion.article
                key={topic.id}
                custom={index}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                className="rounded-2xl border border-white/5 bg-slate-900/70 px-4 py-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-100">{topic.title}</p>
                    <p className="text-xs uppercase tracking-wide text-slate-500">{topic.topicStatus}</p>
                  </div>
                  <div className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-300">
                    Ważność {topic.userScore.toFixed(1)}
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </motion.section>
      </div>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="rounded-3xl border border-white/5 bg-slate-900/50 p-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <TrendingUp className="h-5 w-5 text-emerald-400" /> Trendy & sygnały
          </h2>
          <p className="text-xs text-slate-400">Analiza AI aktualizowana w czasie rzeczywistym</p>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {assistantResponse?.articles.slice(0, 3).map((article, index) => (
            <motion.a
              key={article.id}
              href={article.url ?? '#'}
              target="_blank"
              rel="noreferrer"
              custom={index}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              className="group flex flex-col rounded-2xl border border-white/5 bg-slate-900/60 p-4 transition hover:border-sky-500/60"
            >
              <p className="text-sm font-semibold text-slate-100 group-hover:text-white">{article.title}</p>
              <p className="mt-2 text-xs text-slate-400">{article.summary ?? 'Zobacz szczegóły w źródle'}</p>
              <span className="mt-3 text-xs uppercase tracking-wide text-sky-300">Otwórz źródło →</span>
            </motion.a>
          ))}
        </div>
      </motion.section>
    </div>
  );
}
