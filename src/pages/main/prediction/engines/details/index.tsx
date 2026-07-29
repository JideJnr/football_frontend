import { useEffect, useMemo, useState } from 'react';
import { IonContent, IonPage, IonRefresher, IonRefresherContent, useIonRouter } from '@ionic/react';
import { useParams } from 'react-router';
import { ArrowLeft, Brain, CheckCircle2, Clock3, Database, XCircle } from 'lucide-react';
import { getEngineWork } from '../../../../../services/apis/footballApi';

type Filter = 'all' | 'graded' | 'pending' | 'win' | 'loss';

const resultTone = (result?: string, graded?: boolean) => {
  if (!graded) return 'bg-amber-400/10 text-amber-300 border-amber-300/20';
  if (result === 'win') return 'bg-emerald-400/10 text-emerald-300 border-emerald-300/20';
  if (result === 'loss') return 'bg-rose-400/10 text-rose-300 border-rose-300/20';
  return 'bg-slate-400/10 text-slate-300 border-slate-300/20';
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
      setError(err?.response?.data?.detail || 'Could not load this engine work history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [engineId]);

  const matches = useMemo(() => {
    const work = data?.matches || [];
    return work.filter((item: any) => {
      if (filter === 'graded') return item.graded;
      if (filter === 'pending') return !item.graded;
      if (filter === 'win' || filter === 'loss') return item.result === filter;
      return true;
    });
  }, [data, filter]);

  const refresh = async (event: CustomEvent) => {
    await load();
    event.detail.complete();
  };

  const engine = data?.engine;
  const stats = data?.stats;

  return (
    <IonPage>
      <IonContent style={{ '--background': '#0f1117' } as any} fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={refresh}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="min-h-full bg-[#0f1117] pb-8 text-white">
          <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/[0.08] bg-[#0f1117]/95 px-4 py-3 backdrop-blur">
            <button
              type="button"
              onClick={() => router.goBack()}
              aria-label="Back to engines"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-slate-400 hover:bg-white/[0.06] hover:text-white"
            >
              <ArrowLeft size={17} />
            </button>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold">{engine?.name || 'Engine work'}</div>
              <div className="text-[10px] text-slate-500">Certified picks and outcomes</div>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">Loading engine work...</div>
          ) : error ? (
            <div className="px-4 pt-6 text-sm text-rose-300">{error}</div>
          ) : (
            <main className="mx-auto max-w-3xl px-3 pt-4">
              <section className="border-b border-white/[0.08] pb-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-cyan-400/10 text-cyan-300">
                    <Brain size={20} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-base font-bold">{engine?.name}</h1>
                      <span className="rounded border border-cyan-300/20 bg-cyan-300/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-cyan-200">{engine?.category}</span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-400">{engine?.description}</p>
                  </div>
                </div>

                {engine?.requires_full_match && (
                  <div className="mt-3 border-l-2 border-violet-300 bg-violet-300/[0.07] px-3 py-2 text-xs text-violet-100">
                    Full-match context is required before this engine certifies an HT/FT-style pick.
                  </div>
                )}

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(engine?.power || []).map((power: string) => (
                    <span key={power} className="rounded border border-white/[0.09] bg-white/[0.04] px-2 py-1 text-[9px] font-semibold uppercase text-slate-400">
                      {power.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </section>

              <section className="grid grid-cols-4 border-b border-white/[0.08] py-4 text-center">
                <div className="border-r border-white/[0.08]">
                  <div className="text-lg font-bold text-emerald-300">{stats?.accuracy == null ? '--' : `${stats.accuracy}%`}</div>
                  <div className="text-[9px] uppercase text-slate-500">Accuracy</div>
                </div>
                <div className="border-r border-white/[0.08]">
                  <div className="text-lg font-bold">{stats?.graded || 0}</div>
                  <div className="text-[9px] uppercase text-slate-500">Graded</div>
                </div>
                <div className="border-r border-white/[0.08]">
                  <div className="text-lg font-bold text-emerald-300">{stats?.wins || 0}</div>
                  <div className="text-[9px] uppercase text-slate-500">Wins</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-amber-300">{stats?.pending || 0}</div>
                  <div className="text-[9px] uppercase text-slate-500">Pending</div>
                </div>
              </section>

              <section className="pt-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xs font-bold uppercase text-slate-300">Engine work</h2>
                    <p className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-500"><Database size={11} /> Existing prediction records, not a duplicate match store</p>
                  </div>
                  <span className="text-[10px] text-slate-500">{matches.length} shown</span>
                </div>

                <div className="mb-3 flex gap-1 overflow-x-auto pb-1">
                  {(['all', 'graded', 'pending', 'win', 'loss'] as Filter[]).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setFilter(item)}
                      className={`shrink-0 rounded-md px-2.5 py-1.5 text-[10px] font-semibold capitalize ${filter === item ? 'bg-cyan-300 text-slate-950' : 'bg-white/[0.05] text-slate-400'}`}
                    >
                      {item}
                    </button>
                  ))}
                </div>

                {matches.length === 0 ? (
                  <div className="border border-dashed border-white/[0.12] px-4 py-10 text-center text-xs text-slate-500">
                    No {filter === 'all' ? '' : filter} engine work is available yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {matches.map((item: any) => (
                      <button
                        type="button"
                        key={`${item.role}-${item.id}`}
                        onClick={() => router.push(`/match/${encodeURIComponent(item.match_id)}`)}
                        className="w-full border border-white/[0.08] bg-white/[0.025] p-3 text-left transition-colors hover:bg-white/[0.06]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-xs font-bold text-white">{item.match_name || item.match_id}</div>
                            <div className="mt-0.5 truncate text-[10px] text-slate-500">{[item.country_name, item.league_name].filter(Boolean).join(' - ') || 'Competition unavailable'}</div>
                          </div>
                          <span className={`shrink-0 rounded border px-1.5 py-1 text-[9px] font-bold uppercase ${resultTone(item.result, item.graded)}`}>
                            {item.graded ? (item.result || 'graded') : 'pending'}
                          </span>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-cyan-100">{item.selection || 'No selection recorded'}</div>
                            <div className="mt-0.5 text-[10px] text-slate-500">{String(item.pick_type || '').replace(/_/g, ' ')} · {item.role}</div>
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="text-xs font-bold text-white">{item.confidence == null ? '--' : `${Math.round(Number(item.confidence) * (Number(item.confidence) <= 1 ? 100 : 1))}%`}</div>
                            <div className="text-[9px] uppercase text-slate-500">confidence</div>
                          </div>
                        </div>

                        {(item.graded || item.certified_by?.length || item.reason) && (
                          <div className="mt-3 border-t border-white/[0.07] pt-2">
                            {item.graded && (
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                {item.result === 'win' ? <CheckCircle2 size={12} className="text-emerald-300" /> : <XCircle size={12} className="text-rose-300" />}
                                Final score: {item.final_home ?? '-'} - {item.final_away ?? '-'}
                              </div>
                            )}
                            {!item.graded && <div className="flex items-center gap-1.5 text-[10px] text-amber-200"><Clock3 size={12} /> Awaiting final result</div>}
                            {item.certified_by?.length > 0 && <div className="mt-1 truncate text-[10px] text-slate-500">Certified by: {item.certified_by.slice(0, 3).join(', ').replace(/_/g, ' ')}</div>}
                            {item.reason && <div className="mt-1 line-clamp-2 text-[10px] leading-4 text-slate-400">{item.reason}</div>}
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
