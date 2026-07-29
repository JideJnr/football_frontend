import { IonContent, IonPage, IonRefresher, IonRefresherContent, useIonRouter } from '@ionic/react';
import {
  Activity, ArrowLeft, BookOpen, Brain, ChevronRight,
  RefreshCw, Target, TrendingDown, TrendingUp, Zap,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getBrainModelWeights, getBrainSpecialists, getBrainSummary,
  getModelExplorer, triggerBrainLearn, triggerGradeResults,
} from '../../../services/apis/footballApi';

// ── Constants ─────────────────────────────────────────────────────────────────

const FAMILY_LABELS: Record<string, string> = {
  all: 'All markets',
  low_scoring: 'Low scoring',
  goals: 'Goals',
  home: 'Home win',
  away: 'Away win',
  draw: 'Draw',
  double_chance: 'Double chance',
  value: 'Value',
  longshot_value: 'Longshot',
  live_team_to_score: 'Live: next goal',
  live_match_winner: 'Live: winner',
};

const FAMILY_COLORS: Record<string, string> = {
  goals: 'text-blue-400',
  home: 'text-emerald-400',
  away: 'text-orange-400',
  draw: 'text-yellow-400',
  low_scoring: 'text-purple-400',
  double_chance: 'text-cyan-400',
  value: 'text-pink-400',
  longshot_value: 'text-yellow-300',
  live_team_to_score: 'text-red-400',
  live_match_winner: 'text-red-400',
  all: 'text-gray-400',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const pct = (v?: number | null, decimals = 1) =>
  v == null ? '—' : `${v.toFixed(decimals)}%`;

const accTone = (v?: number | null) =>
  v == null ? 'text-gray-500'
  : v >= 65 ? 'text-emerald-400'
  : v >= 55 ? 'text-yellow-400'
  : 'text-red-400';

const weightTone = (w: number) =>
  w > 1.2 ? 'text-emerald-400'
  : w < 0.8 ? 'text-red-400'
  : 'text-gray-300';

const weightLabel = (w: number) =>
  w > 1.4 ? 'Highly trusted'
  : w > 1.1 ? 'Trusted'
  : w < 0.6 ? 'Suppressed'
  : w < 0.9 ? 'Cautious'
  : 'Neutral';

const familyOf = (pickType = '', selection = '') => {
  const t = `${pickType} ${selection}`.toLowerCase();
  if (t.includes('longshot')) return 'longshot_value';
  if (t.includes('live_match_winner') || t.includes('live winner')) return 'live_match_winner';
  if (t.includes('live_team_to_score') || t.includes('next team to score')) return 'live_team_to_score';
  if (t.includes('under') || t.includes('btts no')) return 'low_scoring';
  if (t.includes('over') || t.includes('goal') || t.includes('btts')) return 'goals';
  if (t.includes('draw') && (t.includes('home') || t.includes('away'))) return 'double_chance';
  if (t.includes('home')) return 'home';
  if (t.includes('away')) return 'away';
  if (t.includes('draw')) return 'draw';
  if (t.includes('value')) return 'value';
  return 'all';
};

// ── Shared UI atoms ───────────────────────────────────────────────────────────

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-500">{children}</div>
);

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-xl border border-white/[0.07] bg-[#161616] ${className}`}>{children}</div>
);

const Pill = ({ label, color = 'text-gray-500' }: { label: string; color?: string }) => (
  <span className={`rounded bg-white/[0.05] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${color}`}>
    {label}
  </span>
);

const WinBar = ({ value, max = 100 }: { value: number; max?: number }) => (
  <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
    <div
      className={`h-full rounded-full transition-all ${value >= 55 ? 'bg-emerald-500' : value >= 45 ? 'bg-yellow-500' : 'bg-red-500'}`}
      style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
    />
  </div>
);

const WeightBar = ({ weight }: { weight: number }) => {
  // weight range 0.3–2.0, neutral at 1.0
  const pctFill = Math.round(((weight - 0.3) / 1.7) * 100);
  const neutralPct = Math.round(((1.0 - 0.3) / 1.7) * 100); // ~41%
  return (
    <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
      {/* neutral marker */}
      <div className="absolute top-0 h-full w-px bg-white/20" style={{ left: `${neutralPct}%` }} />
      <div
        className={`h-full rounded-full transition-all ${weight > 1.05 ? 'bg-emerald-500' : weight < 0.95 ? 'bg-red-500' : 'bg-gray-500'}`}
        style={{ width: `${pctFill}%` }}
      />
    </div>
  );
};

const StatBox = ({
  label, value, sub, tone = 'text-white', icon: Icon,
}: { label: string; value: any; sub?: string; tone?: string; icon?: any }) => (
  <div className="rounded-xl border border-white/[0.07] bg-[#161616] p-3">
    <div className="flex items-center justify-between">
      <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{label}</div>
      {Icon && <Icon size={13} className="text-gray-600" />}
    </div>
    <div className={`mt-1.5 text-2xl font-black tabular-nums ${tone}`}>{value ?? '—'}</div>
    {sub && <div className="mt-0.5 truncate text-[10px] text-gray-600">{sub}</div>}
  </div>
);

const TabBtn = ({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${
      active ? 'bg-emerald-500/15 text-emerald-300' : 'text-gray-500 hover:text-gray-300'
    }`}
  >
    {label}
  </button>
);

const Empty = ({ text }: { text: string }) => (
  <div className="rounded-xl border border-white/[0.07] bg-[#161616] px-4 py-10 text-center text-xs text-gray-600">
    {text}
  </div>
);


// ── Specialists panel ─────────────────────────────────────────────────────────

const SpecialistsPanel = ({ data }: { data: any }) => {
  const specialists: any[] = data?.specialists ?? [];
  if (!specialists.length) return <Empty text="No specialist data yet — predictions need to be graded first." />;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <StatBox label="Analysts" value={specialists.length} sub="AI specialists" icon={Brain} />
        <StatBox
          label="Trusted"
          value={specialists.filter((s: any) => s.status === 'trusted').length}
          sub={`${specialists.filter((s: any) => s.status === 'learning').length} learning`}
          tone="text-emerald-400"
          icon={Target}
        />
        <StatBox
          label="Top weight"
          value={specialists[0]?.weight?.toFixed(2) ?? '—'}
          sub={specialists[0]?.specialist ?? ''}
          tone={weightTone(specialists[0]?.weight ?? 1)}
          icon={TrendingUp}
        />
      </div>

      <Card>
        <div className="grid grid-cols-[1fr_52px_52px_52px] gap-1 border-b border-white/[0.06] px-4 py-2 text-[9px] font-bold uppercase tracking-widest text-gray-600">
          <div>Analyst</div>
          <div className="text-right">Win%</div>
          <div className="text-right">n</div>
          <div className="text-right">Weight</div>
        </div>
        {specialists.map((s: any) => (
          <div key={s.specialist} className="border-b border-white/[0.04] px-4 py-3 last:border-b-0">
            <div className="grid grid-cols-[1fr_52px_52px_52px] items-center gap-1">
              <div className="min-w-0">
                <div className="truncate text-xs font-bold text-white">{s.specialist}</div>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <Pill
                    label={s.status === 'trusted' ? 'trusted' : 'learning'}
                    color={s.status === 'trusted' ? 'text-emerald-400' : 'text-yellow-500'}
                  />
                  <span className={`text-[9px] font-semibold ${weightTone(s.scoped_weight ?? s.weight)}`}>
                    {weightLabel(s.scoped_weight ?? s.weight)}
                  </span>
                </div>
              </div>
              <div className={`text-right text-sm font-black tabular-nums ${accTone(s.win_rate)}`}>
                {s.win_rate != null ? `${s.win_rate}%` : '—'}
              </div>
              <div className="text-right text-xs font-semibold text-gray-400">
                {s.samples}
                <div className="text-[9px] text-gray-600">{s.wins}W/{s.losses}L</div>
              </div>
              <div className={`text-right text-sm font-black tabular-nums ${weightTone(s.scoped_weight ?? s.weight)}`}>
                {(s.scoped_weight ?? s.weight)?.toFixed(2)}
              </div>
            </div>
            <div className="mt-2">
              <WeightBar weight={s.scoped_weight ?? s.weight} />
            </div>
          </div>
        ))}
      </Card>

      <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-3 text-[10px] leading-relaxed text-gray-600">
        Weight range 0.3–2.0. Neutral = 1.0 (~59% win rate). The AI decider multiplies each analyst's
        finding by their weight when forming the final prediction. Updates every 6 hours from graded results.
      </div>
    </div>
  );
};

// ── Model weights panel ───────────────────────────────────────────────────────

const ModelWeightsPanel = ({ data }: { data: any }) => {
  const weights: Record<string, number> = data?.weights ?? {};
  const entries = Object.entries(weights).sort(([, a], [, b]) => (b as number) - (a as number));
  if (!entries.length) return <Empty text="No model weight data yet." />;
  const max = Math.max(...entries.map(([, v]) => v as number));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <StatBox label="Models tracked" value={entries.length} sub="signal sources" icon={Activity} />
        <StatBox
          label="Top model"
          value={entries[0]?.[0] ?? '—'}
          sub={`weight ${(entries[0]?.[1] as number)?.toFixed(3) ?? '—'}`}
          tone="text-emerald-400"
          icon={Zap}
        />
      </div>
      <Card>
        <div className="divide-y divide-white/[0.04]">
          {entries.map(([model, weight]) => (
            <div key={model} className="px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-bold capitalize text-white">{model.replace(/_/g, ' ')}</div>
                <div className={`text-sm font-black tabular-nums ${weightTone(weight as number)}`}>
                  {(weight as number).toFixed(3)}
                </div>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className={`h-full rounded-full ${(weight as number) >= 1 ? 'bg-emerald-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.round(((weight as number) / (max || 1)) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
      {data?.note && (
        <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-3 text-[10px] leading-relaxed text-gray-600">
          {data.note}
        </div>
      )}
    </div>
  );
};

// ── Markets table ─────────────────────────────────────────────────────────────

const MarketsPanel = ({
  groups, selectedKey, onSelect,
}: { groups: any[]; selectedKey: string; onSelect: (g: any) => void }) => {
  if (!groups.length) return <Empty text="No market data for this filter yet." />;
  return (
    <Card>
      <div className="grid grid-cols-[1fr_60px_52px_52px] gap-1 border-b border-white/[0.06] px-4 py-2 text-[9px] font-bold uppercase tracking-widest text-gray-600">
        <div>Market</div>
        <div className="text-right">Win%</div>
        <div className="text-right">Graded</div>
        <div className="text-right">Open</div>
      </div>
      <div className="max-h-[400px] overflow-y-auto">
        {groups.map((g: any) => {
          const key = `${g.pick_type}:${g.selection_key}`;
          const active = selectedKey === key;
          const fam = g.family || familyOf(g.pick_type, g.selection);
          return (
            <button
              key={key}
              onClick={() => onSelect(g)}
              className={`grid w-full grid-cols-[1fr_60px_52px_52px] gap-1 border-b border-white/[0.04] px-4 py-3 text-left last:border-b-0 transition ${
                active ? 'bg-emerald-500/[0.07]' : 'hover:bg-white/[0.025]'
              }`}
            >
              <div className="min-w-0">
                <div className="truncate text-xs font-bold text-white">{g.selection}</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  <Pill label={FAMILY_LABELS[fam] ?? fam} color={FAMILY_COLORS[fam] ?? 'text-gray-500'} />
                  {g.role_signal?.guidance && g.role_signal.guidance !== 'neutral' && (
                    <Pill label={g.role_signal.guidance.replace(/_/g, ' ')} color="text-emerald-300" />
                  )}
                </div>
              </div>
              <div className="self-center text-right">
                <div className={`text-sm font-black tabular-nums ${accTone(g.accuracy)}`}>
                  {g.accuracy != null ? `${g.accuracy}%` : '—'}
                </div>
                <div className="text-[9px] text-gray-600">{g.wins}/{g.graded}</div>
              </div>
              <div className="self-center text-right text-xs font-semibold text-gray-400">{g.graded}</div>
              <div className="self-center text-right text-xs font-semibold text-gray-300">{g.pending}</div>
            </button>
          );
        })}
      </div>
    </Card>
  );
};

// ── Picks list ────────────────────────────────────────────────────────────────

const PicksList = ({ items, router, empty }: { items: any[]; router: any; empty: string }) => {
  if (!items?.length) return <Empty text={empty} />;
  return (
    <Card>
      <div className="max-h-[400px] divide-y divide-white/[0.04] overflow-y-auto">
        {items.map((item: any) => (
          <button
            key={`${item.match_id}-${item.pick_type}-${item.selection}-${item.id}`}
            onClick={() => item.match_id && router.push(`/match/${encodeURIComponent(item.match_id)}`, 'forward', 'push')}
            className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.025]"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-bold text-white">{item.match_name || item.match_id}</div>
              <div className="mt-0.5 truncate text-[10px] text-gray-500">
                {item.selection} · {item.league_name || item.country_name || 'Competition'}
              </div>
              <div className="mt-1 flex gap-1">
                <Pill label={item.role || 'pick'} />
                <Pill label={`${Number(item.confidence || 0)}%`} />
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className={`text-xs font-black uppercase ${
                item.result === 'win' ? 'text-emerald-400'
                : item.result === 'loss' ? 'text-red-400'
                : 'text-gray-500'
              }`}>
                {item.result || 'open'}
              </span>
              <ChevronRight size={12} className="text-gray-700" />
            </div>
          </button>
        ))}
      </div>
    </Card>
  );
};

// ── Learning detail ───────────────────────────────────────────────────────────

const LearningDetail = ({ group }: { group: any }) => {
  if (!group) return <Empty text="Select a market row to see its learning detail." />;
  const primary = group.roles?.primary ?? {};
  const secondary = group.roles?.secondary ?? group.roles?.alternative ?? {};
  const signal = group.role_signal ?? {};
  const edge = signal.primary_edge;
  const guidance =
    signal.guidance === 'secondary_caution' ? 'Secondary is underperforming — lean primary.'
    : signal.guidance === 'promote_primary' ? 'Primary picks outperform secondary in this market.'
    : 'No strong role bias detected yet.';

  return (
    <div className="space-y-3">
      <Card className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Learned behavior</div>
            <div className="mt-1 text-sm font-bold text-white">{guidance}</div>
            <div className="mt-1 text-[10px] leading-relaxed text-gray-600">
              Scoped by league/country and odds band where enough samples exist.
            </div>
          </div>
          <div className={`shrink-0 text-right text-xl font-black tabular-nums ${
            edge == null ? 'text-gray-500' : edge >= 0 ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {edge == null ? '—' : `${edge > 0 ? '+' : ''}${edge}`}
            <div className="text-[9px] font-normal text-gray-600">primary edge</div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-2">
        {[{ label: 'Primary', d: primary }, { label: 'Secondary', d: secondary }].map(({ label, d }) => (
          <Card key={label} className="p-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{label}</div>
            <div className={`mt-1.5 text-2xl font-black tabular-nums ${accTone(d.accuracy)}`}>
              {pct(d.accuracy)}
            </div>
            <div className="mt-0.5 text-[10px] text-gray-600">{d.wins ?? 0}W / {d.graded ?? 0} graded</div>
            {d.accuracy != null && <div className="mt-2"><WinBar value={d.accuracy} /></div>}
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <StatBox label="Total picks" value={group.total} sub="all time" />
        <StatBox label="Avg conf" value={group.avg_confidence != null ? `${Math.round(group.avg_confidence)}%` : '—'} sub="when predicted" />
        <StatBox label="Sample ready" value={group.sample_ready ? 'Yes' : 'No'} tone={group.sample_ready ? 'text-emerald-400' : 'text-yellow-400'} />
      </div>
    </div>
  );
};


// ── Main page ─────────────────────────────────────────────────────────────────

type TopTab = 'markets' | 'specialists' | 'models';
type DetailTab = 'learning' | 'previous' | 'upcoming';

const ModelExplorer = () => {
  const router = useIonRouter();
  const params = new URLSearchParams(window.location.search);

  // filters
  const [family, setFamily] = useState(params.get('preset') || 'all');
  const [minSamples, setMinSamples] = useState(Number(params.get('min_samples') || 1));

  // selected market row
  const [pickType, setPickType] = useState(params.get('pick_type') || '');
  const [selectionKey, setSelectionKey] = useState(params.get('selection_key') || '');

  // tabs
  const [topTab, setTopTab] = useState<TopTab>('markets');
  const [detailTab, setDetailTab] = useState<DetailTab>('learning');

  // data
  const [explorerData, setExplorerData] = useState<any>(null);
  const [specialistData, setSpecialistData] = useState<any>(null);
  const [modelWeightData, setModelWeightData] = useState<any>(null);
  const [brainSummary, setBrainSummary] = useState<any>(null);

  // ui state
  const [loading, setLoading] = useState(false);
  const [grading, setGrading] = useState(false);
  const [learning, setLearning] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [explorer, specialists, modelWeights, brain] = await Promise.all([
        getModelExplorer({ preset: family, model: 'all', pickType, selectionKey, minSamples, limit: 2000 }),
        getBrainSpecialists(),
        getBrainModelWeights(),
        getBrainSummary(),
      ]);
      setExplorerData(explorer);
      setSpecialistData(specialists);
      setModelWeightData(modelWeights);
      setBrainSummary(brain);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [family, minSamples, pickType, selectionKey]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // sync URL
  useEffect(() => {
    const p = new URLSearchParams();
    if (family !== 'all') p.set('preset', family);
    if (minSamples !== 1) p.set('min_samples', String(minSamples));
    if (pickType) p.set('pick_type', pickType);
    if (selectionKey) p.set('selection_key', selectionKey);
    const q = p.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${q ? `?${q}` : ''}`);
  }, [family, minSamples, pickType, selectionKey]);

  const handleGrade = async () => {
    setGrading(true);
    setStatus('');
    try {
      const res = await triggerGradeResults(96);
      setStatus(`${res.predictions_graded ?? 0} graded · ${res.matches_archived ?? 0} archived`);
      await loadAll();
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Grade failed');
    } finally {
      setGrading(false);
    }
  };

  const handleLearn = async () => {
    setLearning(true);
    setStatus('');
    try {
      const res = await triggerBrainLearn();
      setStatus(`Learning cycle complete · ${res.specialist_credits ?? 0} specialist credits`);
      await loadAll();
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Learn failed');
    } finally {
      setLearning(false);
    }
  };

  // derived
  const groups: any[] = useMemo(() => explorerData?.groups ?? [], [explorerData]);
  const summary = explorerData?.summary ?? {};
  const families: string[] = explorerData?.presets ?? Object.keys(FAMILY_LABELS);

  const selectedKey = pickType || selectionKey ? `${pickType}:${selectionKey}` : '';
  const selectedGroup = useMemo(
    () => (selectedKey ? groups.find((g: any) => `${g.pick_type}:${g.selection_key}` === selectedKey) : groups[0]) ?? groups[0],
    [groups, selectedKey],
  );

  const previous = selectedKey ? (selectedGroup?.previous ?? []) : (explorerData?.previous ?? []);
  const upcoming = selectedKey ? (selectedGroup?.upcoming ?? []) : (explorerData?.upcoming ?? []);

  const overallAcc = useMemo(() => {
    const src = family === 'all' ? groups : groups.filter((g: any) => g.family === family);
    const graded = src.reduce((s: number, g: any) => s + Number(g.graded || 0), 0);
    const wins = src.reduce((s: number, g: any) => s + Number(g.wins || 0), 0);
    return graded ? Math.round((wins / graded) * 1000) / 10 : null;
  }, [groups, family]);

  const selectGroup = (g: any) => {
    setPickType(g.pick_type || '');
    setSelectionKey(g.selection_key || '');
    setFamily(g.family || familyOf(g.pick_type, g.selection));
    setDetailTab('learning');
    setTopTab('markets');
  };

  return (
    <IonPage>
      <IonContent fullscreen style={{ '--background': '#0f0f0f' } as any}>
        <IonRefresher slot="fixed" onIonRefresh={async e => { await loadAll(); e.detail.complete(); }}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="min-h-full bg-[#0f0f0f] pb-10 text-white">

          {/* ── Header ── */}
          <div className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#0f0f0f]/95 px-4 py-3 backdrop-blur">
            <div className="flex items-center justify-between gap-2">
              <button onClick={() => router.goBack()} className="flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-white">
                <ArrowLeft size={14} /> Back
              </button>
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">Model Explorer</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleLearn}
                  disabled={learning}
                  className="flex items-center gap-1 rounded-lg border border-purple-500/30 px-2.5 py-1 text-[10px] font-bold text-purple-400 hover:bg-purple-500/10 disabled:opacity-40"
                >
                  <Brain size={11} className={learning ? 'animate-pulse' : ''} />
                  {learning ? 'Learning…' : 'Learn'}
                </button>
                <button
                  onClick={handleGrade}
                  disabled={grading}
                  className="flex items-center gap-1 rounded-lg border border-emerald-500/30 px-2.5 py-1 text-[10px] font-bold text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-40"
                >
                  <RefreshCw size={11} className={grading ? 'animate-spin' : ''} />
                  {grading ? 'Grading…' : 'Grade'}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4 px-4 py-4">

            {/* ── Title + brain summary ── */}
            <div>
              <div className="text-2xl font-black tracking-tight">Model Explorer</div>
              <div className="mt-1 text-xs text-gray-500">
                Track every market's win rate, inspect AI specialist trust weights, and see model performance — all in one place.
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-300">{error}</div>
            )}
            {status && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-300">{status}</div>
            )}

            {/* ── Brain health strip ── */}
            {brainSummary && (
              <div className="grid grid-cols-4 gap-2">
                <StatBox
                  label="Overall acc"
                  value={overallAcc != null ? `${overallAcc}%` : '—'}
                  sub={`${summary.graded ?? 0} graded`}
                  tone={accTone(overallAcc)}
                  icon={TrendingUp}
                />
                <StatBox
                  label="Open picks"
                  value={summary.pending ?? explorerData?.upcoming?.length ?? '—'}
                  sub="awaiting result"
                  tone="text-yellow-400"
                  icon={BookOpen}
                />
                <StatBox
                  label="Market sets"
                  value={groups.length}
                  sub={`${summary.sample_ready ?? 0} sample-ready`}
                  icon={Activity}
                />
                <StatBox
                  label="Brain score"
                  value={brainSummary.brain_score ?? '—'}
                  sub="systems healthy"
                  tone="text-emerald-400"
                  icon={Brain}
                />
              </div>
            )}

            {loading && !explorerData && (
              <div className="flex items-center justify-center py-16">
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-500" />
              </div>
            )}

            {/* ── Filters ── */}
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-600">Market family</div>
                <select
                  value={family}
                  onChange={e => { setFamily(e.target.value); setPickType(''); setSelectionKey(''); }}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#161616] px-3 py-2 text-xs font-semibold text-gray-200 outline-none"
                >
                  {families.map((f: string) => (
                    <option key={f} value={f}>{FAMILY_LABELS[f] ?? f}</option>
                  ))}
                </select>
              </div>
              <div className="w-24">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-600">Min samples</div>
                <select
                  value={String(minSamples)}
                  onChange={e => setMinSamples(Number(e.target.value))}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#161616] px-3 py-2 text-xs font-semibold text-gray-200 outline-none"
                >
                  {['1', '3', '5', '10', '20'].map(v => <option key={v} value={v}>{v}+</option>)}
                </select>
              </div>
            </div>

            {/* ── Selected market banner ── */}
            {selectedKey && selectedGroup && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3">
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Selected market</div>
                  <div className="mt-0.5 truncate text-sm font-bold text-white">{selectedGroup.selection}</div>
                  <div className="mt-0.5 text-[10px] text-gray-500">
                    {selectedGroup.pick_type} · {FAMILY_LABELS[selectedGroup.family] ?? selectedGroup.family}
                    {selectedGroup.accuracy != null && ` · ${selectedGroup.accuracy}% win rate`}
                  </div>
                </div>
                <button
                  onClick={() => { setPickType(''); setSelectionKey(''); }}
                  className="shrink-0 rounded-lg border border-white/[0.12] px-3 py-1.5 text-[10px] font-bold text-gray-400 hover:text-white"
                >
                  Clear
                </button>
              </div>
            )}

            {/* ── Top tabs ── */}
            <div className="flex gap-1 rounded-xl border border-white/[0.07] bg-[#161616] p-1">
              {([['markets', 'Markets'], ['specialists', 'AI Specialists'], ['models', 'Model Weights']] as [TopTab, string][]).map(([key, label]) => (
                <TabBtn key={key} active={topTab === key} label={label} onClick={() => setTopTab(key)} />
              ))}
            </div>

            {/* ── Markets tab ── */}
            {topTab === 'markets' && (
              <div className="space-y-4">
                <div>
                  <SectionTitle>All prediction sets</SectionTitle>
                  <MarketsPanel
                    groups={groups}
                    selectedKey={selectedKey || (selectedGroup ? `${selectedGroup.pick_type}:${selectedGroup.selection_key}` : '')}
                    onSelect={selectGroup}
                  />
                </div>

                {/* detail tabs */}
                <div>
                  <div className="mb-2 flex gap-1 rounded-xl border border-white/[0.07] bg-[#161616] p-1">
                    {([['learning', 'Learning'], ['previous', 'Previous results'], ['upcoming', 'Upcoming']] as [DetailTab, string][]).map(([key, label]) => (
                      <TabBtn key={key} active={detailTab === key} label={label} onClick={() => setDetailTab(key)} />
                    ))}
                  </div>
                  {detailTab === 'learning' && <LearningDetail group={selectedGroup} />}
                  {detailTab === 'previous' && (
                    <PicksList items={previous} router={router} empty="No graded results for this filter yet." />
                  )}
                  {detailTab === 'upcoming' && (
                    <PicksList items={upcoming} router={router} empty="No upcoming predictions for this filter yet." />
                  )}
                </div>
              </div>
            )}

            {/* ── Specialists tab ── */}
            {topTab === 'specialists' && (
              <div>
                <SectionTitle>AI analyst trust weights</SectionTitle>
                <SpecialistsPanel data={specialistData} />
              </div>
            )}

            {/* ── Model weights tab ── */}
            {topTab === 'models' && (
              <div>
                <SectionTitle>Signal model weights</SectionTitle>
                <ModelWeightsPanel data={modelWeightData} />
              </div>
            )}

          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default ModelExplorer;
