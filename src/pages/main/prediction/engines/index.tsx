import { useEffect, useMemo, useState } from 'react';
import { IonContent, IonPage, IonRefresher, IonRefresherContent, useIonRouter } from '@ionic/react';
import { ArrowLeft, ChevronRight, TrendingUp } from 'lucide-react';
import { getEnginesDashboard } from '../../../../services/apis/footballApi';

// ─── Metadata ─────────────────────────────────────────────────────────────────

const ANALYST: Record<string, { avatar: string; role: string; colour: string; bg: string; border: string }> = {
  value:   { avatar: '💰', role: 'Value Specialist',  colour: 'text-yellow-300',  bg: 'bg-yellow-500/10',  border: 'border-yellow-500/20' },
  goals:   { avatar: '⚽', role: 'Goals Analyst',     colour: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  result:  { avatar: '🏆', role: 'Match Analyst',     colour: 'text-blue-300',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20' },
  special: { avatar: '🎯', role: 'Special Markets',   colour: 'text-violet-300',  bg: 'bg-violet-500/10',  border: 'border-violet-500/20' },
  sharp:   { avatar: '📊', role: 'Market Watcher',    colour: 'text-red-300',     bg: 'bg-red-500/10',     border: 'border-red-500/20' },
};

const DEFAULT_META = { avatar: '🔍', role: 'Analyst', colour: 'text-gray-300', bg: 'bg-white/[0.06]', border: 'border-white/10' };

const SOURCE_LABELS: Record<string, string> = {
  h2h: 'H2H', form: 'Form', standings: 'Table', odds: 'Odds',
  similar_matches: 'Similar', models: 'Stats', sofascore: 'Live Data', sportybet: 'Markets',
};

const CATEGORY_LABELS: Record<string, string> = {
  all: 'All', value: 'Value', goals: 'Goals', result: 'Results', special: 'Special', sharp: 'Sharp',
};

const hitRateColour = (v: number | null) =>
  v == null ? 'text-gray-600' : v >= 58 ? 'text-emerald-400' : v >= 48 ? 'text-yellow-400' : 'text-red-400';

// ─── Tipster card ─────────────────────────────────────────────────────────────

const TipsterCard = ({ item }: { item: any }) => {
  const router = useIonRouter();
  const engine = item.engine || {};
  const stats  = item.stats  || {};
  const meta   = ANALYST[engine.category] || DEFAULT_META;
  const sources: string[] = (engine.power || []).slice(0, 4);
  const accuracy = stats.accuracy as number | null;

  return (
    <button
      onClick={() => router.push(`/engine/${item.engine_id}`, 'forward', 'push')}
      className="w-full text-left"
    >
      <div className={`rounded-2xl border ${meta.border} bg-[#161616] p-4 transition active:scale-[0.98] hover:bg-white/[0.04]`}>
        {/* Top row */}
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className={`shrink-0 grid h-11 w-11 place-items-center rounded-xl text-2xl ${meta.bg}`}>
            {meta.avatar}
          </div>

          {/* Name + role */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-white leading-tight">{engine.name}</span>
              {engine.requires_full_match && (
                <span className="rounded-full border border-white/10 px-1.5 py-0.5 text-[9px] text-gray-500">Live only</span>
              )}
            </div>
            <div className={`text-[11px] font-medium mt-0.5 ${meta.colour}`}>{meta.role}</div>
            <div className="text-[11px] text-gray-500 mt-1 leading-snug line-clamp-2">{engine.description}</div>
          </div>

          <ChevronRight size={15} className="shrink-0 text-gray-600 mt-1" />
        </div>

        {/* Stats row */}
        <div className="mt-4 grid grid-cols-4 gap-2 text-center">
          <div>
            <div className={`text-base font-black tabular-nums ${hitRateColour(accuracy)}`}>
              {accuracy == null ? '—' : `${accuracy}%`}
            </div>
            <div className="text-[9px] text-gray-600 mt-0.5">Hit Rate</div>
          </div>
          <div>
            <div className="text-base font-black text-white tabular-nums">{stats.graded || 0}</div>
            <div className="text-[9px] text-gray-600 mt-0.5">Settled</div>
          </div>
          <div>
            <div className="text-base font-black text-emerald-400 tabular-nums">{stats.wins || 0}</div>
            <div className="text-[9px] text-gray-600 mt-0.5">Correct</div>
          </div>
          <div>
            <div className="text-base font-black text-amber-300 tabular-nums">{stats.pending || 0}</div>
            <div className="text-[9px] text-gray-600 mt-0.5">Open Tips</div>
          </div>
        </div>

        {/* Source chips */}
        {sources.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {sources.map((s: string) => (
              <span key={s} className="rounded-full bg-white/[0.05] border border-white/[0.08] px-2 py-0.5 text-[10px] text-gray-500">
                {SOURCE_LABELS[s] || s.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const Tipsters = () => {
  const router  = useIonRouter();
  const [items, setItems]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('all');

  const load = async () => {
    setLoading(true);
    try {
      const data = await getEnginesDashboard();
      setItems(data?.engines || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(
    () => filter === 'all' ? items : items.filter(i => i?.engine?.category === filter),
    [items, filter],
  );

  const totals = useMemo(() => {
    const graded  = items.reduce((s, i) => s + Number(i?.stats?.graded  || 0), 0);
    const wins    = items.reduce((s, i) => s + Number(i?.stats?.wins    || 0), 0);
    const pending = items.reduce((s, i) => s + Number(i?.stats?.pending || 0), 0);
    return { graded, wins, pending, accuracy: graded ? Math.round((wins / graded) * 1000) / 10 : null };
  }, [items]);

  const categories = ['all', 'value', 'goals', 'result', 'special', 'sharp'];

  return (
    <IonPage>
      <IonContent style={{ '--background': '#0a0a0a' } as any} fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={async e => { await load(); e.detail.complete(); }}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="min-h-full bg-[#0a0a0a] text-white pb-10">

          {/* ── Top bar ── */}
          <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/[0.07] bg-[#0a0a0a]/95 px-4 py-3 backdrop-blur">
            <button
              onClick={() => router.push('/home', 'back', 'pop')}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/[0.06] text-gray-400 hover:bg-white/[0.1] hover:text-white transition"
              aria-label="Back to home"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-bold leading-tight">Our Tipsters</h1>
              <p className="text-[10px] text-gray-500">Specialist analysts, real track records</p>
            </div>
            <div className="shrink-0 flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-semibold text-emerald-400">{items.length} Active</span>
            </div>
          </div>

          <div className="px-4 pt-5 space-y-5">

            {/* ── Hero stats ── */}
            <div className="rounded-2xl border border-white/[0.07] bg-[#161616] overflow-hidden">
              {/* Banner */}
              <div className="px-4 pt-4 pb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <TrendingUp size={15} className="text-emerald-400" />
                  <span className="text-xs font-bold text-white">Combined Track Record</span>
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Across all tipsters, based on settled tips only
                </p>
              </div>

              <div className="grid grid-cols-3 divide-x divide-white/[0.06]">
                <div className="px-4 py-4 text-center">
                  <div className={`text-2xl font-black tabular-nums ${hitRateColour(totals.accuracy)}`}>
                    {totals.accuracy == null ? '—' : `${totals.accuracy}%`}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1">Overall Hit Rate</div>
                </div>
                <div className="px-4 py-4 text-center">
                  <div className="text-2xl font-black text-white tabular-nums">{totals.graded}</div>
                  <div className="text-[10px] text-gray-500 mt-1">Tips Settled</div>
                </div>
                <div className="px-4 py-4 text-center">
                  <div className="text-2xl font-black text-amber-300 tabular-nums">{totals.pending}</div>
                  <div className="text-[10px] text-gray-500 mt-1">Open Tips</div>
                </div>
              </div>
            </div>

            {/* ── Category filter ── */}
            <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                    filter === cat
                      ? 'border-white bg-white text-black'
                      : 'border-white/10 text-gray-500 hover:border-white/20 hover:text-gray-300'
                  }`}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>

            {/* ── Tipster list ── */}
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(n => (
                  <div key={n} className="h-36 rounded-2xl bg-white/[0.04] animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 py-16 text-center">
                <div className="text-3xl mb-2">🔍</div>
                <div className="text-sm text-gray-500">No tipsters in this category</div>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map(item => (
                  <TipsterCard key={item.engine_id} item={item} />
                ))}
              </div>
            )}

            {/* ── Footer note ── */}
            {!loading && filtered.length > 0 && (
              <p className="text-center text-[10px] text-gray-600 pb-2">
                Hit rates are calculated from settled tips only. Past performance does not guarantee future results.
              </p>
            )}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Tipsters;
