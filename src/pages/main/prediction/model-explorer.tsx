import { IonContent, IonPage, IonRefresher, IonRefresherContent, useIonRouter } from '@ionic/react';
import { useEffect, useMemo, useState } from 'react';
import { getModelExplorer } from '../../../services/apis/footballApi';

const presetLabels: Record<string, string> = {
  all: 'All',
  low_scoring: 'Low scoring',
  goals: 'Goals',
  home: 'Home',
  away: 'Away',
  draw: 'Draw',
  double_chance: 'Safety',
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
  accuracy == null ? 'text-gray-400'
  : accuracy >= 65 ? 'text-emerald-400'
  : accuracy >= 55 ? 'text-yellow-400'
  : 'text-red-400';

const accuracyLabel = (group: any) =>
  group.accuracy == null ? 'Building' : `${group.accuracy}%`;

const accuracySubLabel = (group: any) =>
  group.graded ? `${group.wins}/${group.graded} wins` : `${group.pending} pending`;

const PillBar = ({
  values,
  active,
  labels,
  onChange,
}: {
  values: string[];
  active: string;
  labels: Record<string, string>;
  onChange: (v: string) => void;
}) => (
  <div className="flex gap-2 overflow-x-auto px-4 pb-1">
    {values.map(value => (
      <button
        key={value}
        onClick={() => onChange(value)}
        className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${
          active === value
            ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300'
            : 'border-white/[0.08] bg-white/[0.03] text-gray-500'
        }`}
      >
        {labels[value] || value}
      </button>
    ))}
  </div>
);

const ModelExplorer = () => {
  const router = useIonRouter();
  const [preset, setPreset] = useState('low_scoring');
  const [model, setModel] = useState('all');
  const [minSamples, setMinSamples] = useState(1);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getModelExplorer({ preset, model, minSamples, limit: 3000 });
      setData(res);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Could not load model explorer');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [preset, model, minSamples]);

  const groups = useMemo(() => data?.groups || [], [data]);
  const recent = useMemo(() => data?.recent || [], [data]);

  return (
    <IonPage>
      <IonContent fullscreen className="ion-padding-vertical">
        <IonRefresher slot="fixed" onIonRefresh={async e => { await load(); e.detail.complete(); }}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="sticky top-0 z-10 border-b border-white/[0.07] bg-[#0f0f0f]/95 pb-3 pt-4 backdrop-blur">
          <div className="px-4">
            <button onClick={() => router.goBack()} className="mb-3 text-xs text-gray-500">Back</button>
            <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Model Explorer</div>
            <div className="mt-1 text-xl font-bold text-white">Pick markets by proven accuracy</div>
            <div className="mt-1 text-xs text-gray-600">Filter predictions by model signal and market type, then rank by graded win rate.</div>
          </div>
          <div className="mt-4 space-y-3">
            <PillBar values={data?.presets || Object.keys(presetLabels)} active={preset} labels={presetLabels} onChange={setPreset} />
            <PillBar values={data?.models || Object.keys(modelLabels)} active={model} labels={modelLabels} onChange={setModel} />
            <div className="flex items-center gap-2 px-4">
              {[1, 3, 5, 10].map(n => (
                <button
                  key={n}
                  onClick={() => setMinSamples(n)}
                  className={`rounded px-2.5 py-1 text-[11px] font-semibold ${
                    minSamples === n ? 'bg-white text-black' : 'bg-white/[0.04] text-gray-500'
                  }`}
                >
                  {n}+ graded
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3 px-4 py-4">
          {error && <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">{error}</div>}
          {loading && !data ? (
            <div className="py-14 text-center text-sm text-gray-500">Loading model accuracy...</div>
          ) : groups.length ? (
            groups.map((group: any) => (
              <div key={`${group.family}-${group.pick_type}-${group.selection}`} className="rounded-xl border border-white/[0.07] bg-[#161616] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white">{group.selection}</div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <span className="rounded bg-white/[0.05] px-2 py-0.5 text-[10px] text-gray-500">{presetLabels[group.family] || group.family}</span>
                      <span className="rounded bg-white/[0.05] px-2 py-0.5 text-[10px] text-gray-500">{group.pick_type}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-black ${tone(group.accuracy)}`}>{accuracyLabel(group)}</div>
                    <div className="text-[10px] text-gray-600">{accuracySubLabel(group)}</div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-white/[0.03] py-2">
                    <div className="text-sm font-bold text-white">{group.total}</div>
                    <div className="text-[9px] text-gray-600">total</div>
                  </div>
                  <div className="rounded-lg bg-white/[0.03] py-2">
                    <div className="text-sm font-bold text-white">{group.pending}</div>
                    <div className="text-[9px] text-gray-600">pending</div>
                  </div>
                  <div className="rounded-lg bg-white/[0.03] py-2">
                    <div className="text-sm font-bold text-white">{group.avg_confidence}%</div>
                    <div className="text-[9px] text-gray-600">avg conf</div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(group.models_used || []).slice(0, 8).map((name: string) => (
                    <span key={name} className="rounded-full border border-white/[0.07] px-2 py-0.5 text-[9px] text-gray-600">{name.replace(/_/g, ' ')}</span>
                  ))}
                </div>
                <div className="mt-3 space-y-1.5">
                  {(group.recent || []).slice(0, 3).map((item: any) => (
                    <button
                      key={item.id}
                      onClick={() => item.match_id && router.push(`/match/${item.match_id}`, 'forward', 'push')}
                      className="block w-full rounded-lg bg-black/20 px-3 py-2 text-left"
                    >
                      <div className="truncate text-xs font-semibold text-gray-300">{item.match_name || 'Match'}</div>
                      <div className="mt-0.5 flex items-center justify-between gap-3 text-[10px] text-gray-600">
                        <span className="truncate">{item.league_name || item.country_name || 'League'}</span>
                        <span className={item.result === 'win' ? 'text-emerald-500' : item.result === 'loss' ? 'text-red-500' : 'text-gray-600'}>
                          {item.result || 'pending'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-white/[0.07] bg-[#161616] px-4 py-12 text-center">
              <div className="text-sm font-semibold text-gray-300">No matching pick groups yet</div>
              <div className="mt-1 text-xs text-gray-600">Try another market family or model signal.</div>
            </div>
          )}

          {recent.length > 0 && (
            <div className="rounded-xl border border-white/[0.07] bg-[#161616] p-4">
              <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-500">Latest matching picks</div>
              <div className="space-y-2">
                {recent.slice(0, 8).map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 border-b border-white/[0.04] pb-2 last:border-0 last:pb-0">
                    <div className="min-w-0">
                      <div className="truncate text-xs font-semibold text-gray-300">{item.selection}</div>
                      <div className="truncate text-[10px] text-gray-600">{item.match_name}</div>
                    </div>
                    <div className={`shrink-0 text-xs font-bold ${item.result === 'win' ? 'text-emerald-400' : item.result === 'loss' ? 'text-red-400' : 'text-gray-500'}`}>
                      {item.result || 'pending'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default ModelExplorer;
