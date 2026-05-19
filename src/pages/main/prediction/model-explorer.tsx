import { IonContent, IonPage, IonRefresher, IonRefresherContent, useIonRouter } from '@ionic/react';
import { useEffect, useMemo, useState } from 'react';
import { getModelExplorer, triggerBufferCleanup, triggerGradeResults } from '../../../services/apis/footballApi';

const presetLabels: Record<string, string> = {
  all: 'All',
  low_scoring: 'Low scoring',
  goals: 'Goals',
  home: 'Home',
  away: 'Away',
  draw: 'Draw',
  double_chance: 'Protection',
  value: 'Value',
};

const modelLabels: Record<string, string> = {
  all: 'All models',
  poisson: 'Poisson',
  dixon_coles: 'Dixon-Coles',
  elo: 'ELO',
  ensemble: 'Ensemble',
  database: 'Database',
  odds: 'Odds',
  rules: 'Rules',
};

const tone = (accuracy?: number | null) =>
  accuracy == null ? 'text-gray-500'
  : accuracy >= 65 ? 'text-emerald-300'
  : accuracy >= 55 ? 'text-yellow-300'
  : 'text-red-300';

const band = (accuracy?: number | null) =>
  accuracy == null ? 'Building'
  : accuracy >= 65 ? 'Strong'
  : accuracy >= 55 ? 'Watch'
  : 'Avoid';

const Stat = ({ label, value, hint }: { label: string; value: any; hint?: string }) => (
  <div className="rounded-lg border border-white/[0.07] bg-white/[0.035] px-3 py-3">
    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{label}</div>
    <div className="mt-1 text-xl font-black text-white">{value ?? '-'}</div>
    {hint ? <div className="mt-0.5 truncate text-[10px] text-gray-600">{hint}</div> : null}
  </div>
);

const FilterButton = ({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`shrink-0 rounded-md border px-3 py-2 text-xs font-semibold ${
      active
        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200'
        : 'border-white/[0.08] bg-white/[0.03] text-gray-500'
    }`}
  >
    {label}
  </button>
);

const ModelExplorer = () => {
  const router = useIonRouter();
  const [preset, setPreset] = useState('all');
  const [model, setModel] = useState('all');
  const [minSamples, setMinSamples] = useState(3);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [learning, setLearning] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getModelExplorer({ preset, model, minSamples, limit: 5000 });
      setData(res);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Could not load model explorer');
    } finally {
      setLoading(false);
    }
  };

  const runLearning = async () => {
    setLearning(true);
    setStatus('');
    setError('');
    try {
      const grade = await triggerGradeResults(96);
      const cleanup = await triggerBufferCleanup();
      setStatus(`${grade.predictions_graded ?? grade.graded ?? 0} graded, ${cleanup.deleted_finished ?? 0} finished cleaned`);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Learning refresh failed');
    } finally {
      setLearning(false);
    }
  };

  useEffect(() => { load(); }, [preset, model, minSamples]);

  const groups = useMemo(() => data?.groups || [], [data]);
  const ready = groups.filter((g: any) => g.sample_ready);
  const building = groups.filter((g: any) => !g.sample_ready);
  const recent = useMemo(() => data?.recent || [], [data]);
  const summary = data?.summary || {};

  return (
    <IonPage>
      <IonContent fullscreen className="ion-padding-vertical">
        <IonRefresher slot="fixed" onIonRefresh={async e => { await load(); e.detail.complete(); }}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="min-h-full bg-[#0f0f0f] text-white">
          <div className="sticky top-0 z-20 border-b border-white/[0.07] bg-[#0f0f0f]/95 px-4 pb-4 pt-4 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <button onClick={() => router.goBack()} className="text-xs font-semibold text-gray-500">Back</button>
              <button
                onClick={runLearning}
                disabled={learning}
                className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-200 disabled:opacity-50"
              >
                {learning ? 'Refreshing...' : 'Refresh learning'}
              </button>
            </div>
            <div className="mt-4">
              <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Model Explorer</div>
              <div className="mt-1 text-2xl font-black tracking-tight">Validated prediction strategies</div>
              <div className="mt-1 max-w-xl text-xs leading-relaxed text-gray-500">
                Ranked by deduplicated prediction history. Finished matches can open from archive after they leave the live buffer.
              </div>
            </div>
          </div>

          <div className="space-y-4 px-4 py-4">
            {error ? <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">{error}</div> : null}
            {status ? <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-300">{status}</div> : null}

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="Unique picks" value={summary.unique_picks ?? data?.count} hint={`${summary.duplicates_removed ?? 0} duplicates removed`} />
              <Stat label="Ready groups" value={summary.sample_ready ?? ready.length} hint={`${summary.groups ?? groups.length} total groups`} />
              <Stat label="Best accuracy" value={summary.best_accuracy != null ? `${summary.best_accuracy}%` : '-'} hint={summary.best_selection} />
              <Stat label="Open learning" value={summary.pending ?? 0} hint={`${summary.graded ?? 0} graded`} />
            </div>

            <div className="rounded-xl border border-white/[0.07] bg-[#161616] p-3">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">Market family</div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {(data?.presets || Object.keys(presetLabels)).map((value: string) => (
                  <FilterButton key={value} active={preset === value} label={presetLabels[value] || value} onClick={() => setPreset(value)} />
                ))}
              </div>
              <div className="mb-2 mt-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">Model input</div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {(data?.models || Object.keys(modelLabels)).map((value: string) => (
                  <FilterButton key={value} active={model === value} label={modelLabels[value] || value} onClick={() => setModel(value)} />
                ))}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Samples</span>
                {[1, 3, 5, 10, 20].map(n => (
                  <FilterButton key={n} active={minSamples === n} label={`${n}+ graded`} onClick={() => setMinSamples(n)} />
                ))}
              </div>
            </div>

            {loading && !data ? (
              <div className="py-14 text-center text-sm text-gray-500">Loading validated strategies...</div>
            ) : null}

            {ready.length ? (
              <div className="rounded-xl border border-white/[0.07] bg-[#161616]">
                <div className="border-b border-white/[0.06] px-4 py-3">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Ranked strategies</div>
                </div>
                <div className="divide-y divide-white/[0.06]">
                  {ready.map((group: any, index: number) => (
                    <StrategyRow key={`${group.family}-${group.pick_type}-${group.selection_key || group.selection}`} group={group} index={index} router={router} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-white/[0.07] bg-[#161616] px-4 py-10 text-center">
                <div className="text-sm font-semibold text-gray-300">No sample-ready strategies yet</div>
                <div className="mt-1 text-xs text-gray-600">Lower the sample threshold or run learning refresh after more results are graded.</div>
              </div>
            )}

            {building.length ? (
              <div className="rounded-xl border border-white/[0.07] bg-[#161616] p-4">
                <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-500">Building sample</div>
                <div className="grid gap-2">
                  {building.slice(0, 8).map((group: any) => (
                    <div key={`${group.pick_type}-${group.selection_key || group.selection}`} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2">
                      <div className="min-w-0">
                        <div className="truncate text-xs font-semibold text-gray-300">{group.selection}</div>
                        <div className="text-[10px] text-gray-600">{group.graded}/{minSamples} graded samples</div>
                      </div>
                      <div className="text-xs font-bold text-gray-500">{group.pending} pending</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {recent.length ? (
              <div className="rounded-xl border border-white/[0.07] bg-[#161616] p-4">
                <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-500">Latest unique picks</div>
                <div className="space-y-2">
                  {recent.slice(0, 10).map((item: any) => (
                    <button
                      key={`${item.match_id}-${item.pick_type}-${item.selection_key || item.selection}-${item.id}`}
                      onClick={() => item.match_id && router.push(`/match/${encodeURIComponent(item.match_id)}`, 'forward', 'push')}
                      className="flex w-full items-center justify-between gap-3 rounded-lg bg-black/20 px-3 py-2 text-left"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-xs font-semibold text-gray-300">{item.selection}</div>
                        <div className="truncate text-[10px] text-gray-600">{item.match_name || item.match_id}</div>
                      </div>
                      <div className={`shrink-0 text-xs font-bold ${item.result === 'win' ? 'text-emerald-300' : item.result === 'loss' ? 'text-red-300' : 'text-gray-500'}`}>
                        {item.result || 'pending'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

const StrategyRow = ({ group, index, router }: { group: any; index: number; router: any }) => (
  <div className="px-4 py-4">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white/[0.06] text-xs font-black text-gray-400">#{index + 1}</div>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-white">{group.selection}</div>
            <div className="mt-0.5 flex flex-wrap gap-1.5">
              <span className="rounded bg-white/[0.05] px-2 py-0.5 text-[10px] text-gray-500">{presetLabels[group.family] || group.family}</span>
              <span className="rounded bg-white/[0.05] px-2 py-0.5 text-[10px] text-gray-500">{group.pick_type}</span>
              <span className="rounded bg-white/[0.05] px-2 py-0.5 text-[10px] text-gray-500">{band(group.accuracy)}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className={`text-2xl font-black ${tone(group.accuracy)}`}>{group.accuracy}%</div>
        <div className="text-[10px] text-gray-600">{group.wins}/{group.graded} wins</div>
      </div>
    </div>

    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
      <Stat label="Total" value={group.total} />
      <Stat label="Pending" value={group.pending} />
      <Stat label="Avg conf" value={`${group.avg_confidence}%`} />
    </div>

    <div className="mt-3 flex flex-wrap gap-1.5">
      {(group.models_used || []).slice(0, 7).map((name: string) => (
        <span key={name} className="rounded-full border border-white/[0.07] px-2 py-0.5 text-[9px] text-gray-600">{name.replace(/_/g, ' ')}</span>
      ))}
    </div>

    {(group.recent || []).length ? (
      <div className="mt-3 grid gap-1.5">
        {(group.recent || []).slice(0, 3).map((item: any) => (
          <button
            key={item.id}
            onClick={() => item.match_id && router.push(`/match/${encodeURIComponent(item.match_id)}`, 'forward', 'push')}
            className="flex items-center justify-between gap-3 rounded-lg bg-black/20 px-3 py-2 text-left"
          >
            <div className="min-w-0">
              <div className="truncate text-xs font-semibold text-gray-300">{item.match_name || 'Archived match'}</div>
              <div className="truncate text-[10px] text-gray-600">{item.league_name || item.country_name || 'Competition'}</div>
            </div>
            <div className={`shrink-0 text-xs font-bold ${item.result === 'win' ? 'text-emerald-300' : item.result === 'loss' ? 'text-red-300' : 'text-gray-500'}`}>
              {item.result || 'pending'}
            </div>
          </button>
        ))}
      </div>
    ) : null}
  </div>
);

export default ModelExplorer;
