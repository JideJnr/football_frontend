import { useEffect, useMemo, useState } from 'react';
import { IonContent, IonPage, IonRefresher, IonRefresherContent, useIonRouter } from '@ionic/react';
import { useParams } from 'react-router';
import { ArrowLeft, CheckCircle2, Clock3, XCircle } from 'lucide-react';
import { getEngineWork } from '../../../../../services/apis/footballApi';

type Filter = 'all' | 'graded' | 'pending' | 'win' | 'loss';

const analystMeta: Record<string, { avatar: string; role: string }> = {
  value:   { avatar: '💰', role: 'Value Specialist' },
  goals:   { avatar: '⚽', role: 'Goals Analyst' },
  result:  { avatar: '🏆', role: 'Match Analyst' },
  special: { avatar: '🎯', role: 'Special Markets' },
  sharp:   { avatar: '📊', role: 'Market Watcher' },
};

const sourceLabels: Record<string, string> = {
  h2h: 'Head-to-Head', form: 'Recent Form', standings: 'League Table',
  odds: 'Market Odds', similar_matches: 'Similar Games', models: 'Stats Models',
  sofascore: 'Match Data', sportybet: 'Live Odds',
};

const resultTone = (result?: string, graded?: boolean) => {
  if (!graded) return 'bg-amber-400/10 text-amber-300 border-amber-300/20';
  if (result === 'win') return 'bg-emerald-400/10 text-emerald-300 border-emerald-300/20';
  if (result === 'loss') return 'bg-rose-400/10 text-rose-300 border-rose-300/20';
  return 'bg-slate-400/10 text-slate-300 border-slate-300/20';
};

const resultLabel = (result?: string, graded?: boolean) => {
  if (!graded) return 'Open';
  if (result === 'win') return '✓ Won';
  if (result === 'loss') return '✗ Lost';
  return 'Settled';
};

const EngineDetails = () => {
  const { id: engineId } = useParams<{ id: string }>();
  const router = useIonRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const load = async () => {
    if (!engineId) return;
    setLoading(true);
    setError('');
    try {
      setData(await getEngineWork(engineId));
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Could not load tip history for this analyst.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [engineId]);

  const matches = useMemo(() => {
    const work = data?.matches || [];
    return work.filter((item: any) => {
      if (filter === 'graded') return item.graded;
      if (filter === 'pending') return !item.graded;
      if (filter === 'win' || filter === 'loss') return item.result === filter;
      return true;
    });
  }, [data, filter]);

  const refresh = async (event: CustomEvent) => { await load(); event.detail.complete(); };

  const engine = data?.engine;
  const stats  = data?.stats;
  const meta   = analystMeta[engine?.category] || { avatar: '🔍', role: 'Analyst' };

  return (
    <IonPage>
      <IonContent style={{ '--background': '#0f1117' } as any} fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={refresh}><IonRefresherContent /></IonRefresher>

        <div className="min-h-full bg-[#0f1117] pb-8 text-white">
          {/* Header */}
          <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/[0.08] bg-[#0f1117]/95 px-4 py-3 backdrop-blur">
            <button
              type="button"
              onClick={() => router.goBack()}
              aria-label="Back"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-slate-400 hover:bg-white/[0.06] hover:text-white"
            >
              <ArrowLeft size={17} />
            </button>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold">{engine?.name || 'Tipster'}</div>
              <div className="text-[10px] text-slate-500">Tip history & track record</div>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">Loading tip history...</div>
          ) : error ? (
            <div className="px-4 pt-6 text-sm text-rose-300">{error}</div>
          ) : (
            <main className="mx-auto max-w-3xl px-3 pt-4">

              {/* Analyst profile */}
              <section className="border-b border-white/[0.08] pb-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-2xl">
                    {meta.avatar}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-base font-bold">{engine?.name}</h1>
                      <span className="rounded border border-white/10 bg-white/[0.05] px-1.5 py-0.5 text-[9px] font-bold uppercase text-gray-400">
                        {meta.role}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-400">{engine?.description}</p>
                  </div>
                </div>

                {engine?.requires_full_match && (
                  <div className="mt-3 border-l-2 border-amber-400 bg-amber-400/[0.07] px-3 py-2 text-xs text-amber-100">
                    This tipster only suggests picks once a match is underway and live data is available.
                  </div>
                )}

                {(engine?.power || []).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="text-[10px] text-gray-600 self-center">Looks at:</span>
                    {(engine.power || []).map((p: string) => (
                      <span key={p} className="rounded border border-white/[0.09] bg-white/[0.04] px-2 py-1 text-[9px] font-semibold uppercase text-slate-400">
                        {sourceLabels[p] || p.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                )}
              </section>

              {/* Track record */}
              <section className="grid grid-cols-4 border-b border-white/[0.08] py-4 text-center">
                <div className="border-r border-white/[0.08]">
                  <div className={`text-lg font-bold ${stats?.accuracy == null ? 'text-gray-600' : stats.accuracy >= 58 ? 'text-emerald-300' : stats.accuracy >= 48 ? 'text-yellow-300' : 'text-red-300'}`}>
                    {stats?.accuracy == null ? '--' : `${stats.accuracy}%`}
                  </div>
                  <div className="text-[9px] uppercase text-slate-500">Hit Rate</div>
                </div>
                <div className="border-r border-white/[0.08]">
                  <div className="text-lg font-bold">{stats?.graded || 0}</div>
                  <div className="text-[9px] uppercase text-slate-500">Settled</div>
                </div>
                <div className="border-r border-white/[0.08]">
                  <div className="text-lg font-bold text-emerald-300">{stats?.wins || 0}</div>
                  <div className="text-[9px] uppercase text-slate-500">Correct</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-amber-300">{stats?.pending || 0}</div>
                  <div className="text-[9px] uppercase text-slate-500">Open</div>
                </div>
              </section>

              {/* Tip history */}
              <section className="pt-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xs font-bold uppercase text-slate-300">Tip History</h2>
                    <p className="mt-0.5 text-[10px] text-slate-500">All tips from this analyst, newest first</p>
                  </div>
                  <span className="text-[10px] text-slate-500">{matches.length} shown</span>
                </div>

                <div className="mb-3 flex gap-1 overflow-x-auto pb-1">
                  {(['all', 'pending', 'win', 'loss'] as Filter[]).map(item => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setFilter(item)}
                      className={`shrink-0 rounded-md px-2.5 py-1.5 text-[10px] font-semibold capitalize ${
                        filter === item ? 'bg-white text-slate-950' : 'bg-white/[0.05] text-slate-400'
                      }`}
                    >
                      {item === 'all' ? 'All' : item === 'pending' ? 'Open' : item === 'win' ? '✓ Won' : '✗ Lost'}
                    </button>
                  ))}
                </div>

                {matches.length === 0 ? (
                  <div className="border border-dashed border-white/[0.12] px-4 py-10 text-center text-xs text-slate-500">
                    No {filter === 'all' ? '' : filter} tips yet for this analyst.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {matches.map((item: any) => (
                      <button
                        type="button"
                        key={`${item.role}-${item.id}`}
                        onClick={() => router.push(`/match/${encodeURIComponent(item.match_id)}`)}
                        className="w-full border border-white/[0.08] bg-white/[0.025] p-3 text-left transition-colors hover:bg-white/[0.06] rounded-xl"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-xs font-bold text-white">{item.match_name || item.match_id}</div>
                            <div className="mt-0.5 truncate text-[10px] text-slate-500">
                              {[item.country_name, item.league_name].filter(Boolean).join(' · ') || 'Competition unavailable'}
                            </div>
                          </div>
                          <span className={`shrink-0 rounded border px-1.5 py-1 text-[9px] font-bold ${resultTone(item.result, item.graded)}`}>
                            {resultLabel(item.result, item.graded)}
                          </span>
                        </div>

                        <div className="mt-2.5 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-white">{item.selection || 'No tip recorded'}</div>
                            <div className="mt-0.5 text-[10px] text-slate-500">
                              {String(item.pick_type || '').replace(/_/g, ' ')}
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="text-xs font-bold text-white">
                              {item.confidence == null ? '--' : `${Math.round(Number(item.confidence) * (Number(item.confidence) <= 1 ? 100 : 1))}%`}
                            </div>
                            <div className="text-[9px] uppercase text-slate-500">confidence</div>
                          </div>
                        </div>

                        {(item.graded || item.reason) && (
                          <div className="mt-2.5 border-t border-white/[0.07] pt-2">
                            {item.graded ? (
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                {item.result === 'win'
                                  ? <CheckCircle2 size={12} className="text-emerald-300" />
                                  : <XCircle size={12} className="text-rose-300" />}
                                Final score: {item.final_home ?? '-'} – {item.final_away ?? '-'}
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-[10px] text-amber-200">
                                <Clock3 size={12} /> Awaiting result
                              </div>
                            )}
                            {item.reason && (
                              <div className="mt-1 line-clamp-2 text-[10px] leading-4 text-slate-400">{item.reason}</div>
                            )}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </main>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default EngineDetails;
