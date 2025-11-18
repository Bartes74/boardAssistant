import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Activity, Filter, RefreshCw } from 'lucide-react';
import { useSupabaseAuth } from '../../lib/supabaseClient';
import { useSecurityAuditLogs, useSecurityStats } from './hooks';

function formatDate(value: string | null) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('pl-PL');
  } catch {
    return value;
  }
}

export function SecurityPage() {
  const { session, isLoading } = useSupabaseAuth();
  const [actionFilter, setActionFilter] = useState('');
  const [actorIdFilter, setActorIdFilter] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const { data: logsData, isLoading: isLogsLoading, refetch } = useSecurityAuditLogs({
    limit: pageSize,
    offset: page * pageSize,
    action: actionFilter || undefined,
    actorId: actorIdFilter || undefined,
  });

  const { data: stats, isLoading: isStatsLoading } = useSecurityStats();

  const isSecurityOfficer =
    session?.user.app_metadata?.role === 'SECURITY_OFFICER' ||
    session?.user.app_metadata?.role === 'ADMIN';

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-10 text-center text-slate-300">
        Ładowanie panelu bezpieczeństwa...
      </div>
    );
  }

  if (!session || !isSecurityOfficer) {
    return <Navigate to="/" replace />;
  }

  const logs = logsData?.logs ?? [];
  const pagination = logsData?.pagination;

  return (
    <div className="space-y-8">
      <header className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-xl">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-emerald-400" />
          <div>
            <h1 className="text-2xl font-semibold text-white">Panel Bezpieczeństwa</h1>
            <p className="text-sm text-slate-400">Przegląd logów audytu i statystyk bezpieczeństwa</p>
          </div>
        </div>
      </header>

      {isStatsLoading ? (
        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 text-center text-slate-400">
          Ładowanie statystyk...
        </div>
      ) : (
        stats && (
          <section className="grid gap-6 md:grid-cols-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-white/10 bg-slate-900/70 p-6"
            >
              <div className="flex items-center gap-3">
                <Activity className="h-6 w-6 text-sky-400" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Wszystkie logi</p>
                  <p className="text-2xl font-semibold text-white">{stats.total}</p>
                </div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-3xl border border-white/10 bg-slate-900/70 p-6"
            >
              <div className="flex items-center gap-3">
                <RefreshCw className="h-6 w-6 text-emerald-400" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Ostatnie 24h</p>
                  <p className="text-2xl font-semibold text-white">{stats.last24h}</p>
                </div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-3xl border border-white/10 bg-slate-900/70 p-6"
            >
              <p className="text-xs uppercase tracking-wide text-slate-400">Akcje</p>
              <p className="text-2xl font-semibold text-white">{stats.byAction.length}</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-3xl border border-white/10 bg-slate-900/70 p-6"
            >
              <p className="text-xs uppercase tracking-wide text-slate-400">Role</p>
              <p className="text-2xl font-semibold text-white">{stats.byRole.length}</p>
            </motion.div>
          </section>
        )
      )}

      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Logi audytu</h2>
          <button
            type="button"
            onClick={() => refetch()}
            className="flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400"
          >
            <RefreshCw className="h-4 w-4" />
            Odśwież
          </button>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
              Filtruj po akcji
            </label>
            <input
              type="text"
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(0);
              }}
              placeholder="np. source_ingest"
              className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
              Filtruj po ID aktora
            </label>
            <input
              type="text"
              value={actorIdFilter}
              onChange={(e) => {
                setActorIdFilter(e.target.value);
                setPage(0);
              }}
              placeholder="UUID użytkownika"
              className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40"
            />
          </div>
        </div>

        {isLogsLoading ? (
          <p className="text-sm text-slate-400">Ładowanie logów...</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800 text-sm text-slate-200">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold uppercase tracking-wide text-slate-400">
                      Data
                    </th>
                    <th className="px-4 py-2 text-left font-semibold uppercase tracking-wide text-slate-400">
                      Aktor (ID / Rola)
                    </th>
                    <th className="px-4 py-2 text-left font-semibold uppercase tracking-wide text-slate-400">
                      Akcja
                    </th>
                    <th className="px-4 py-2 text-left font-semibold uppercase tracking-wide text-slate-400">
                      Typ / ID celu
                    </th>
                    <th className="px-4 py-2 text-left font-semibold uppercase tracking-wide text-slate-400">
                      Metadane
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-4 py-3 text-slate-400">{formatDate(log.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-white text-xs">{log.actorId ?? '—'}</p>
                          <p className="text-xs text-slate-500">{log.actorRole ?? '—'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-300">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-slate-300">{log.targetType}</p>
                          {log.targetId && (
                            <p className="text-xs text-slate-500 font-mono">{log.targetId.slice(0, 8)}...</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {log.metadata ? (
                          <details className="cursor-pointer">
                            <summary className="text-xs text-slate-400 hover:text-slate-300">Zobacz</summary>
                            <pre className="mt-2 max-w-md overflow-auto rounded-lg bg-slate-950 p-2 text-xs">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </details>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-400">
                        Brak logów do wyświetlenia.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {pagination && pagination.total > pageSize && (
              <div className="mt-6 flex items-center justify-between">
                <p className="text-sm text-slate-400">
                  Strona {page + 1} z {Math.ceil(pagination.total / pageSize)} ({pagination.total} łącznie)
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Poprzednia
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!pagination.hasMore}
                    className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Następna
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

