import { IonContent, IonPage, IonRefresher, IonRefresherContent, useIonRouter } from '@ionic/react';
import { BarChart3, CheckCircle2, Clock3, Database, RefreshCw, TrendingUp } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getModelExplorer, triggerBufferCleanup, triggerGradeResults } from '../../../services/apis/footballApi';

const familyLabels: Record<string, string> = {
  all: 'All',
  low_scoring: 'Low scoring',
  goals: 'Goals',
  home: 'Home',
  away: 'Away',
  draw: 'Draw',
  double_chance: 'Protection',
  value: 'Value',
  longshot_value: 'Longshot',
  live_team_to_score: 'Live team score',
  live_match_winner: 'Live winner',
};

const modelLabels: Record<string, string> = {
  all: 'All signals',
  poisson: 'Poisson',
  dixon_coles: 'Dixon-Coles',
  elo: 'ELO',
  ensemble: 'Ensemble',
  database: 'Database',
  odds: 'Odds',
  rules: 'Rules',
  longshot: 'Longshot',
};

const detailTabs = [
  ['learning', 'Learning'],
  ['previous', 'Previous'],
  ['upcoming', 'Upcoming'],
];

const accuracyTone = (value?: number | null) =>
  value == null ? 'text-gray-500'
  : value >= 65 ? 'text-emerald-300'
  : value >= 55 ? 'text-yellow-300'
  : 'text-red-300';

const resultTone = (result?: string) =>
  result === 'win' ? 'text-emerald-300'
  : result === 'loss' ? 'text-red-300'
  : 'text-gray-500';

const pct = (value?: number | null) => value == null ? '-' : `${value}%`;

const familyOf = (pickType = '', selection = '') => {
  const text = `${pickType} ${selection}`.toLowerCase();
  if (text.includes('longshot')) return 'longshot_value';
  if (text.includes('live_match_winner') || text.includes('live winner')) return 'live_match_winner';
  if (text.includes('live_team_to_score') || text.includes('next team to score')) return 'live_team_to_score';
  if (text.includes('under') || text.includes('btts no') || text.includes('both teams to score - no')) return 'low_scoring';
  if (text.includes('over') || text.includes('goal') || text.includes('btts')) return 'goals';
  if (text.includes('draw') && (text.includes('home') || text.includes('away'))) return 'double_chance';
  if (text.includes('home')) return 'home';
  if (text.includes('away')) return 'away';
  if (text.includes('draw')) return 'draw';
  if (text.includes('value')) return 'value';
  return 'all';
};

const Metric = ({ label, value, sub, icon: Icon, tone = 'text-white' }: any) => (
  <div className="rounded-lg border border-white/[0.07] bg-[#161616] p-3">
    <div className="flex items-center justify-between gap-2">
      <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{label}</div>
      {Icon ? <Icon size={15} className="text-gray-600" /> : null}
    </div>
    <div className={`mt-2 text-2xl font-black ${tone}`}>{value ?? '-'}</div>
    {sub ? <div className="mt-1 truncate text-[10px] text-gray-600">{sub}</div> : null}
  </div>
);

const Segment = ({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`shrink-0 rounded-md px-3 py-2 text-xs font-bold transition ${
      active ? 'bg-emerald-500/15 text-emerald-200' : 'text-gray-500 hover:bg-white/[0.04] hover:text-gray-300'
    }`}
  >
    {label}
  </button>
);

const Select = ({ label, value, options, labels, onChange }: any) => (
  <label className="block">
    <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-600">{label}</div>
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full rounded-lg border border-white/[0.08] bg-[#161616] px-3 py-2 text-sm font-semibold text-gray-200 outline-none"
    >
      {options.map((option: string) => (
        <option key={option} value={option}>{labels?.[option] || option}</option>
      ))}
    </select>
  </label>
);

const Empty = ({ text }: { text: string }) => (
  <div className="rounded-lg border border-white/[0.07] bg-[#161616] px-4 py-10 text-center text-xs text-gray-600">{text}</div>
);

const PickRows = ({ items, router, empty }: { items: any[]; router: any; empty: string }) => {
  if (!items?.length) return <Empty text={empty} />;
  return (
    <div className="overflow-hidden rounded-lg border border-white/[0.07] bg-[#161616]">
      {items.map((item: any) => (
        <button
          key={`${item.match_id}-${item.pick_type}-${item.selection_key || item.selection}-${item.role}-${item.id}`}
          onClick={() => item.match_id && router.push(`/match/${encodeURIComponent(item.match_id)}`, 'forward', 'push')}
          className="grid w-full grid-cols-[1fr_auto] gap-3 border-b border-white/[0.05] px-3 py-3 text-left last:border-b-0"
        >
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-white">{item.match_name || item.match_id}</div>
              <div className="mt-1 truncate text-xs text-gray-500">{item.selection} - {item.league_name || item.country_name || 'Competition'}</div>
            <div className="mt-1 flex flex-wrap gap-1">
              <span className="rounded bg-white/[0.05] px-2 py-0.5 text-[9px] uppercase tracking-wide text-gray-500">{item.role || 'pick'}</span>
              <span className="rounded bg-white/[0.05] px-2 py-0.5 text-[9px] text-gray-500">{Number(item.confidence || 0)}%</span>
            </div>
          </div>
          <div className={`text-right text-xs font-black uppercase ${resultTone(item.result)}`}>{item.result || 'pending'}</div>
        </button>
      ))}
    </div>
  );
};

const StrategyTable = ({ groups, selectedKey, onSelect }: { groups: any[]; selectedKey: string; onSelect: (group: any) => void }) => {
  if (!groups.length) return <Empty text="No strategy history for this filter yet." />;
  return (
    <div className="overflow-hidden rounded-lg border border-white/[0.07] bg-[#161616]">
      <div className="grid grid-cols-[1fr_64px_64px] gap-2 border-b border-white/[0.06] px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-600">
        <div>Prediction set</div>
        <div className="text-right">Hit</div>
        <div className="text-right">Open</div>
      </div>
      {groups.map((group: any) => {
        const key = `${group.pick_type}:${group.selection_key}`;
        const active = selectedKey === key;
        const guidance = group.role_signal?.guidance;
        return (
          <button
            key={`${group.family}-${group.pick_type}-${group.selection_key}`}
            onClick={() => onSelect(group)}
            className={`grid w-full grid-cols-[1fr_64px_64px] gap-2 border-b border-white/[0.05] px-3 py-3 text-left last:border-b-0 ${active ? 'bg-emerald-500/[0.08]' : 'hover:bg-white/[0.025]'}`}
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-white">{group.selection}</div>
              <div className="mt-1 flex flex-wrap gap-1">
                <span className="rounded bg-white/[0.05] px-2 py-0.5 text-[9px] text-gray-500">{familyLabels[group.family] || group.family}</span>
                <span className="rounded bg-white/[0.05] px-2 py-0.5 text-[9px] text-gray-500">{group.pick_type}</span>
                {guidance && guidance !== 'neutral' ? (
                  <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[9px] text-emerald-300">{guidance.replace(/_/g, ' ')}</span>
                ) : null}
              </div>
            </div>
            <div className={`self-center text-right text-sm font-black ${accuracyTone(group.accuracy)}`}>
              {pct(group.accuracy)}
              <div className="text-[9px] font-normal text-gray-600">{group.wins}/{group.graded}</div>
            </div>
            <div className="self-center text-right text-sm font-black text-gray-300">
              {group.pending}
              <div className="text-[9px] font-normal text-gray-600">{group.total} total</div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

const LearningPanel = ({ group }: { group: any }) => {
  if (!group) return <Empty text="Select a prediction set to see primary vs secondary behavior." />;
  const roles = group.roles || {};
  const primary = roles.primary || {};
  const secondary = roles.secondary || roles.alternative || {};
  const signal = group.role_signal || {};
  const guidance =
    signal.guidance === 'secondary_caution' ? 'Secondary is underperforming in this context.'
    : signal.guidance === 'promote_primary' ? 'Primary picks are outperforming secondary picks.'
    : 'No strong role bias yet.';
  return (
    <div className="rounded-lg border border-white/[0.07] bg-[#161616] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Learned behavior</div>
          <div className="mt-1 text-sm font-bold text-white">{guidance}</div>
          <div className="mt-1 text-xs leading-relaxed text-gray-500">Used as a ranking nudge only, scoped by league/country and odds similarity where available.</div>
        </div>
        <div className={`text-right text-xl font-black ${signal.primary_edge == null ? 'text-gray-500' : signal.primary_edge >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
          {signal.primary_edge == null ? '-' : `${signal.primary_edge > 0 ? '+' : ''}${signal.primary_edge}`}
          <div className="text-[9px] font-normal text-gray-600">primary edge</div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Metric label="Primary" value={pct(primary.accuracy)} sub={`${primary.wins || 0}/${primary.graded || 0} wins`} icon={CheckCircle2} tone={accuracyTone(primary.accuracy)} />
        <Metric label="Secondary" value={pct(secondary.accuracy)} sub={`${secondary.wins || 0}/${secondary.graded || 0} wins`} icon={Clock3} tone={accuracyTone(secondary.accuracy)} />
      </div>
    </div>
  );
};

const ModelExplorer = () => {
  const router = useIonRouter();
  const initialParams = new URLSearchParams(window.location.search);
  const [preset, setPreset] = useState(initialParams.get('preset') || 'all');
  const [model, setModel] = useState(initialParams.get('model') || 'all');
  const [pickType, setPickType] = useState(initialParams.get('pick_type') || '');
  const [selectionKey, setSelectionKey] = useState(initialParams.get('selection_key') || '');
  const [minSamples, setMinSamples] = useState(Number(initialParams.get('min_samples') || 3));
  const [detailTab, setDetailTab] = useState('learning');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [learning, setLearning] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setData(await getModelExplorer({ preset, model, pickType, selectionKey, minSamples, limit: 5000 }));
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Could not load model explorer');
    } finally {
      setLoading(false);
    }
  };

  const refreshLearning = async () => {
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

  useEffect(() => {
    const params = new URLSearchParams();
    if (preset !== 'all') params.set('preset', preset);
    if (model !== 'all') params.set('model', model);
    if (pickType) params.set('pick_type', pickType);
    if (selectionKey) params.set('selection_key', selectionKey);
    if (minSamples !== 3) params.set('min_samples', String(minSamples));
    const query = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
    load();
  }, [preset, model, pickType, selectionKey, minSamples]);

  const groups = useMemo(() => data?.groups || [], [data]);
  const summary = data?.summary || {};
  const selectedKey = pickType || selectionKey ? `${pickType}:${selectionKey}` : '';
  const selectedGroup = selectedKey ? groups.find((g: any) => `${g.pick_type}:${g.selection_key}` === selectedKey) || groups[0] : groups[0];
  const previous = selectedKey ? selectedGroup?.previous || [] : data?.previous || [];
  const upcoming = selectedKey ? selectedGroup?.upcoming || [] : data?.upcoming || [];
  const families = data?.presets || Object.keys(familyLabels);
  const models = data?.models || Object.keys(modelLabels);

  const familySummary = useMemo(() => {
    const source = preset === 'all' ? groups : groups.filter((g: any) => g.family === preset);
    const graded = source.reduce((sum: number, g: any) => sum + Number(g.graded || 0), 0);
    const wins = source.reduce((sum: number, g: any) => sum + Number(g.wins || 0), 0);
    const pending = source.reduce((sum: number, g: any) => sum + Number(g.pending || 0), 0);
    return {
      groups: source.length,
      graded,
      pending,
      accuracy: graded ? Math.round((wins / graded) * 1000) / 10 : null,
    };
  }, [groups, preset]);

  const selectStrategy = (group: any) => {
    setPickType(group.pick_type || '');
    setSelectionKey(group.selection_key || '');
    setPreset(group.family || familyOf(group.pick_type, group.selection));
    setDetailTab('learning');
  };

  const clearSelection = () => {
    setPickType('');
    setSelectionKey('');
  };

  return (
    <IonPage>
      <IonContent fullscreen style={{ '--background': '#0f0f0f' } as any}>
        <IonRefresher slot="fixed" onIonRefresh={async e => { await load(); e.detail.complete(); }}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="min-h-full bg-[#0f0f0f] pb-8 text-white">
          <div className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#0f0f0f]/95 px-4 py-3 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <button onClick={() => router.goBack()} className="text-xs font-semibold text-gray-400 hover:text-white">Back</button>
              <div className="text-xs font-bold uppercase tracking-widest text-emerald-400">Model Explorer</div>
              <button onClick={refreshLearning} disabled={learning} className="text-gray-500 hover:text-emerald-400 disabled:opacity-40">
                <RefreshCw size={16} className={learning ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          <div className="space-y-4 px-4 py-4">
            <div>
              <div className="text-2xl font-black tracking-tight">Market behavior</div>
              <div className="mt-1 text-xs leading-relaxed text-gray-500">Choose a market family, compare primary vs secondary learning, then inspect previous results and upcoming predictions.</div>
            </div>

            {error ? <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div> : null}
            {status ? <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">{status}</div> : null}

            <div className="rounded-lg border border-white/[0.07] bg-[#161616] p-3">
              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_120px]">
                <Select label="Market family" value={preset} options={families} labels={familyLabels} onChange={(value: string) => { setPreset(value); setPickType(''); setSelectionKey(''); }} />
                <Select label="Signal family" value={model} options={models} labels={modelLabels} onChange={(value: string) => { setModel(value); setPickType(''); setSelectionKey(''); }} />
                <Select label="Sample" value={String(minSamples)} options={['1', '3', '5', '10', '20']} labels={{ '1': '1+', '3': '3+', '5': '5+', '10': '10+', '20': '20+' }} onChange={(value: string) => setMinSamples(Number(value))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Metric label="Family accuracy" value={pct(familySummary.accuracy)} sub={`${familySummary.graded} graded`} icon={TrendingUp} tone={accuracyTone(familySummary.accuracy)} />
              <Metric label="Open picks" value={familySummary.pending} sub="upcoming predictions" icon={Clock3} />
              <Metric label="Strategy sets" value={familySummary.groups} sub={`${summary.sample_ready ?? 0} sample-ready`} icon={BarChart3} />
              <Metric label="Unique rows" value={summary.unique_picks ?? data?.count ?? 0} sub={`${summary.duplicates_removed ?? 0} duplicates hidden`} icon={Database} />
            </div>

            {selectedKey && selectedGroup ? (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.08] px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">Selected set</div>
                    <div className="mt-1 truncate text-sm font-bold text-white">{selectedGroup.selection}</div>
                    <div className="mt-1 text-xs text-gray-500">{selectedGroup.pick_type} - {familyLabels[selectedGroup.family] || selectedGroup.family}</div>
                  </div>
                  {selectedKey ? <button onClick={clearSelection} className="rounded-md border border-white/[0.12] px-3 py-1.5 text-xs font-semibold text-gray-300">Clear</button> : null}
                </div>
              </div>
            ) : null}

            {loading && !data ? <div className="py-12 text-center text-sm text-gray-500">Loading model behavior...</div> : null}

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
              <div>
                <div className="mb-2 flex items-center justify-between px-1">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Prediction sets</div>
                  <div className="text-[10px] text-gray-600">{groups.length} sets</div>
                </div>
                <StrategyTable groups={groups} selectedKey={selectedKey || (selectedGroup ? `${selectedGroup.pick_type}:${selectedGroup.selection_key}` : '')} onSelect={selectStrategy} />
              </div>

              <div>
                <div className="mb-2 flex gap-1 rounded-lg border border-white/[0.07] bg-[#161616] p-1">
                  {detailTabs.map(([key, label]) => <Segment key={key} active={detailTab === key} label={label} onClick={() => setDetailTab(key)} />)}
                </div>
                {detailTab === 'learning' ? <LearningPanel group={selectedGroup} /> : null}
                {detailTab === 'previous' ? <PickRows items={previous} router={router} empty="No graded previous results for this filter yet." /> : null}
                {detailTab === 'upcoming' ? <PickRows items={upcoming} router={router} empty="No upcoming predictions for this filter yet." /> : null}
              </div>
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default ModelExplorer;
