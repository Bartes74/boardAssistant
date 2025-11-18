import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTopic, useTopics } from '../../hooks/useTopics';
import { Pin, EyeOff, ChevronLeft, ChevronRight } from 'lucide-react';

const listVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (index: number) => ({ opacity: 1, y: 0, transition: { delay: index * 0.05 } }),
};

export function TopicsPage() {
  const [page, setPage] = useState(0);
  const pageSize = 20;
  const { data: topicsData, isLoading: isTopicsLoading, error: topicsError } = useTopics({ limit: pageSize, offset: page * pageSize });
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const { data: topicDetail, isLoading: isTopicDetailLoading, error: topicDetailError } = useTopic(selectedTopic ?? '');

  const topics = topicsData?.topics ?? [];
  const pagination = topicsData?.pagination;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr,1.6fr]">
      <section className="rounded-3xl border border-white/5 bg-slate-900/60 p-6">
        <h2 className="text-lg font-semibold text-white">Tematy strategiczne</h2>
        <p className="text-sm text-slate-400">Zobacz najważniejsze wątki i oceń ich priorytet.</p>
        {topicsError ? (
          <div className="mt-4 rounded-xl border border-rose-500/50 bg-rose-500/10 p-4">
            <p className="text-sm font-semibold text-rose-300">Błąd ładowania tematów</p>
            <p className="mt-1 text-xs text-rose-400">
              {topicsError instanceof Error ? topicsError.message : 'Nie udało się pobrać listy tematów'}
            </p>
          </div>
        ) : isTopicsLoading ? (
          <p className="mt-4 text-sm text-slate-400">Ładowanie tematów...</p>
        ) : (
          <div className="mt-4 space-y-3">
            {topics.map((topic, index) => (
            <motion.button
              key={topic.id}
              type="button"
              onClick={() => setSelectedTopic(topic.id)}
              custom={index}
              variants={listVariants}
              initial="hidden"
              animate="visible"
              className="w-full rounded-2xl border border-white/5 bg-slate-900/70 px-4 py-4 text-left transition hover:border-sky-500/40"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-100">{topic.title}</p>
                  <p className="text-xs uppercase tracking-wide text-slate-500">{topic.topicStatus}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  {topic.pinned && (
                    <span className="flex items-center gap-1 rounded-full bg-sky-500/10 px-3 py-1 text-sky-300">
                      <Pin className="h-3 w-3" /> przypięty
                    </span>
                  )}
                  {topic.hidden && (
                    <span className="flex items-center gap-1 rounded-full bg-slate-800 px-3 py-1 text-slate-400">
                      <EyeOff className="h-3 w-3" /> ukryty
                    </span>
                  )}
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-400">Ważność: {topic.userScore.toFixed(1)}</p>
            </motion.button>
            ))}
          </div>
        )}
        {pagination && pagination.total > pageSize && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Strona {page + 1} z {Math.ceil(pagination.total / pageSize)}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={!pagination.hasMore}
                className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </section>
      <section className="rounded-3xl border border-white/5 bg-slate-900/60 p-6">
        {topicDetailError ? (
          <div className="rounded-xl border border-rose-500/50 bg-rose-500/10 p-4">
            <p className="text-sm font-semibold text-rose-300">Błąd ładowania szczegółów tematu</p>
            <p className="mt-1 text-xs text-rose-400">
              {topicDetailError instanceof Error ? topicDetailError.message : 'Nie udało się pobrać szczegółów tematu'}
            </p>
          </div>
        ) : isTopicDetailLoading && selectedTopic ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            Ładowanie szczegółów...
          </div>
        ) : topicDetail ? (
          <>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-semibold text-white">{topicDetail.title}</h3>
                <p className="mt-1 text-sm text-slate-400">
                  Status: <span className="font-semibold text-sky-300">{topicDetail.topicStatus}</span> • ostatnia aktywność {topicDetail.lastEventAt ?? 'brak danych'}
                </p>
              </div>
            </div>
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {topicDetail.documents.map((doc) => (
                <article key={doc.id} className="rounded-2xl border border-white/5 bg-slate-900/70 px-5 py-4">
                  <p className="text-sm font-semibold text-slate-100">{doc.title}</p>
                  <p className="text-xs uppercase tracking-wide text-slate-500">{doc.docType}</p>
                  {doc.summary && <p className="mt-2 text-xs text-slate-300">{doc.summary}</p>}
                </article>
              ))}
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            Wybierz temat, aby zobaczyć szczegóły i powiązane dokumenty.
          </div>
        )}
      </section>
    </div>
  );
}
