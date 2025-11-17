import { FormEvent, useMemo, useState } from 'react';
import { useAssistantFeedback, useAssistantQuery } from '../../hooks/useAssistant';
import { motion } from 'framer-motion';
import { Sparkles, SendHorizonal } from 'lucide-react';
import { toast } from 'sonner';

export function ChatPage() {
  const [question, setQuestion] = useState('Co nowego w moich tematach ESG?');
  const { mutateAsync, data, isPending } = useAssistantQuery();
  const feedback = useAssistantFeedback();

  const articles = useMemo(() => data?.articles ?? [], [data]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!question.trim()) return;
    const response = await mutateAsync({ question });
    if (response.topics.length) {
      feedback.mutate({
        queryId: response.query_id,
        importantTopics: response.topics.map((t) => t.id ?? '').filter(Boolean),
      });
      toast.success('Zebraliśmy Twój feedback – dopasowujemy rekomendacje.');
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.7fr,1fr]">
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col rounded-3xl border border-white/5 bg-slate-900/70 p-6"
      >
        <form onSubmit={handleSubmit} className="flex gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-3">
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            className="min-h-[60px] flex-1 resize-none rounded-xl border border-transparent bg-transparent px-4 py-3 text-sm text-white outline-none focus:border-sky-500"
            placeholder="Zadaj pytanie asystentowi..."
          />
          <button
            type="submit"
            disabled={isPending}
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-500 text-white shadow-lg shadow-sky-500/30 transition hover:from-sky-400 hover:to-indigo-400 disabled:opacity-50"
          >
            <SendHorizonal className="h-5 w-5" />
          </button>
        </form>
        <div className="mt-6 flex-1 space-y-4 overflow-y-auto pr-2">
          {data ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="rounded-3xl border border-white/5 bg-slate-900/60 p-6"
            >
              <div className="flex items-center gap-3 text-slate-300">
                <Sparkles className="h-5 w-5 text-sky-400" />
                <span className="text-sm uppercase tracking-[0.3em]">Odpowiedź asystenta</span>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate-200">{data.tldr}</p>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Artykuły do przeczytania</h3>
                  <ul className="mt-2 space-y-2 text-sm">
                    {data.articles.map((article) => (
                      <li key={article.id} className="rounded-2xl border border-white/5 bg-slate-900/70 px-4 py-3">
                        <p className="font-medium text-slate-100">{article.title}</p>
                        {article.summary && <p className="text-xs text-slate-400">{article.summary}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Rekomendowane działania</h3>
                  <ul className="mt-2 space-y-2 text-sm">
                    {data.actions.map((action) => (
                      <li key={action.title} className="rounded-2xl border border-white/5 bg-slate-900/70 px-4 py-3">
                        <p className="font-semibold text-slate-100">{action.title}</p>
                        <p className="text-xs text-slate-400">{action.description}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          ) : (
            <p className="text-sm text-slate-400">Zadaj pytanie, aby otrzymać analizę.</p>
          )}
        </div>
      </motion.section>
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="rounded-3xl border border-white/5 bg-slate-900/60 p-6"
      >
        <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">Ostatnie źródła</h2>
        <div className="mt-4 space-y-3 text-sm">
          {articles.slice(0, 5).map((article) => (
            <a
              key={article.id}
              href={article.url ?? '#'}
              target="_blank"
              rel="noreferrer"
              className="block rounded-2xl border border-white/5 bg-slate-900/70 px-4 py-3 transition hover:border-sky-500/40"
            >
              <p className="font-medium text-slate-100">{article.title}</p>
              <p className="text-xs text-slate-400">{article.summary ?? 'Zobacz szczegóły w źródle'}</p>
            </a>
          ))}
        </div>
      </motion.section>
    </div>
  );
}
