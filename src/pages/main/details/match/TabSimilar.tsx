import { useEffect, useMemo, useState } from 'react';
import { useIonRouter } from '@ionic/react';
import { getSimilarMatches } from '../../../../services/apis/footballApi';
import { Empty, Sec, fmtDateTime } from './shared';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SortKey = 'similarity' | 'date' | 'confidence';
export type FilterKey = 'same_league' | 'has_prediction' | 'win' | 'loss' | 'no_prediction';

export interface SimilarMatchOdds {
  home: number;
  draw: number;
  away: number;
}

export interface SimilarMatchPrediction {
  pick_type: string;
  selection: string;
  confidence: number;
  result: 'win' | 'loss' | 'void' | null;
}

export interface SimilarMatchItem {
  match_id: string;
  match_name: string;
  home_team: string;
  away_team: string;
  league_name: string;
  final_score: string;
  match_date: string | null;
  similarity_score: number;
  odds: SimilarMatchOdds | null;
  prediction: SimilarMatchPrediction | null;
}

// ─── Pure helpers (exported for property-based testing) ───────────────────────

export function applyFilters(
  matches: SimilarMatchItem[],
  filters: Set<FilterKey>,
  currentMatch: any,
): SimilarMatchItem[] {
  if (filters.size === 0) return matches;
  const currentLeague = (
    currentMatch?.tournament ||
    currentMatch?.league_name ||
    ''
  ).toLowerCase().trim();

  return matches.filter(m => {
    for (const f of filters) {
      switch (f) {
        case 'same_league':
          if (!currentLeague || m.league_name.toLowerCase().trim() !== currentLeague) return false;
          break;
        case 'has_prediction':
          if (!m.prediction) return false;
          break;
        case 'win':
          if (m.prediction?.result !== 'win') return false;
          break;
        case 'loss':
          if (m.prediction?.result !== 'loss') return false;
          break;
        case 'no_prediction':
          if (m.prediction !== null && m.prediction !== undefined) return false;
          break;
      }
    }
    return true;
  });
}

export function applySort(
  matches: SimilarMatchItem[],
  sort: SortKey,
): SimilarMatchItem[] {
  const copy = [...matches];
  switch (sort) {
    case 'similarity':
      return copy.sort((a, b) => b.similarity_score - a.similarity_score);
    case 'date':
      return copy.sort((a, b) => {
        if (!a.match_date && !b.match_date) return 0;
        if (!a.match_date) return 1;
        if (!b.match_date) return -1;
        return b.match_date.localeCompare(a.match_date);
      });
    case 'confidence':
      return copy.sort((a, b) => {
        const ac = a.prediction?.confidence ?? -1;
        const bc = b.prediction?.confidence ?? -1;
        return bc - ac;
      });
    default:
      return copy;
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PredictionBadge({ prediction }: { prediction: SimilarMatchPrediction | null }) {
  if (!prediction) return null;
  const { result, selection, confidence } = prediction;
  const bg =
    result === 'win'
      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
      : result === 'loss'
      ? 'bg-red-500/20 text-red-400 border-red-500/30'
      : 'bg-gray-600/20 text-gray-400 border-gray-600/30';
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${bg}`}
    >
      <span>{selection}</span>
      <span className="opacity-70">{confidence}%</span>
      {result && <span className="uppercase opacity-60">{result}</span>}
    </span>
  );
}

function SimilarityBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  return (
    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mt-1">
      <div
        className="h-full bg-emerald-500 rounded-full transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function MatchCard({ item }: { item: SimilarMatchItem }) {
  const router = useIonRouter();
  const pct = Math.round(item.similarity_score * 100);
  return (
    <div
      className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-3 space-y-2 cursor-pointer hover:bg-white/[0.06] transition"
      onClick={() => router.push(`/match/${item.match_id}`, 'forward', 'push')}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-gray-200 font-medium truncate flex-1">
          {item.match_name}
        </span>
        <span className="text-base font-bold text-white shrink-0">
          {item.final_score}
        </span>
      </div>

      {/* League + date */}
      <div className="flex items-center justify-between text-[10px] text-gray-500">
        <span className="truncate">{item.league_name || '—'}</span>
        <span className="shrink-0 ml-2">
          {item.match_date ? fmtDateTime(item.match_date) : '—'}
        </span>
      </div>

      {/* Similarity bar */}
      <div>
        <div className="flex items-center justify-between text-[10px] mb-0.5">
          <span className="text-gray-500">Similarity</span>
          <span className={`font-bold ${pct >= 75 ? 'text-emerald-400' : pct >= 50 ? 'text-yellow-400' : 'text-gray-400'}`}>
            {pct}%
          </span>
        </div>
        <SimilarityBar score={item.similarity_score} />
      </div>

      {/* Odds row */}
      {item.odds && (
        <div className="flex items-center gap-3 text-[10px] text-gray-400">
          <span className="text-gray-600">Odds</span>
          <span>
            <span className="text-gray-500">H </span>
            <span className="text-white font-medium">{item.odds.home.toFixed(2)}</span>
          </span>
          <span>
            <span className="text-gray-500">D </span>
            <span className="text-white font-medium">{item.odds.draw.toFixed(2)}</span>
          </span>
          <span>
            <span className="text-gray-500">A </span>
            <span className="text-white font-medium">{item.odds.away.toFixed(2)}</span>
          </span>
        </div>
      )}

      {/* Prediction badge */}
      {item.prediction && (
        <div>
          <PredictionBadge prediction={item.prediction} />
        </div>
      )}
    </div>
  );
}

// ─── Filter chip ──────────────────────────────────────────────────────────────

const FILTER_LABELS: Record<FilterKey, string> = {
  same_league:    'Same League',
  has_prediction: 'Has Prediction',
  win:            'Won',
  loss:           'Lost',
  no_prediction:  'No Prediction',
};

function FilterChip({
  filterKey,
  active,
  onToggle,
}: {
  filterKey: FilterKey;
  active: boolean;
  onToggle: (k: FilterKey) => void;
}) {
  return (
    <button
      aria-pressed={active}
      onClick={() => onToggle(filterKey)}
      className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition shrink-0 ${
        active
          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
          : 'bg-white/[0.04] text-gray-500 border-white/[0.08] hover:border-white/20 hover:text-gray-300'
      }`}
    >
      {FILTER_LABELS[filterKey]}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const ALL_FILTERS: FilterKey[] = [
  'same_league',
  'has_prediction',
  'win',
  'loss',
  'no_prediction',
];

export default function TabSimilar({ m }: { m: any }) {
  const router = useIonRouter();
  const [matches, setMatches] = useState<SimilarMatchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>('similarity');
  const [filters, setFilters] = useState<Set<FilterKey>>(new Set());

  const matchId: string = m?.sportybet_id ?? m?.id ?? '';

  const load = async () => {
    if (!matchId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getSimilarMatches(matchId, 25);
      setMatches(data?.matches ?? []);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  const displayMatches = useMemo(() => {
    const filtered = applyFilters(matches, filters, m);
    return applySort(filtered, sort);
  }, [matches, filters, sort, m]);

  const toggleFilter = (key: FilterKey) => {
    setFilters(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-5 h-5 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
        <span className="text-sm text-gray-500">Finding similar matches…</span>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="px-4 py-8 space-y-3">
        <p className="text-sm text-red-400 text-center">Failed to load similar matches</p>
        <p className="text-xs text-gray-600 text-center">{error}</p>
        <div className="flex justify-center">
          <button
            onClick={load}
            className="px-4 py-2 rounded-xl text-xs font-semibold border border-white/10 text-gray-300 hover:border-emerald-500/40 hover:text-emerald-400 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-8 space-y-3">
      {/* ── Controls ──────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        {/* Sort selector */}
        <div className="flex items-center gap-2">
          <label
            htmlFor="similar-sort"
            className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider shrink-0"
          >
            Sort by
          </label>
          <select
            id="similar-sort"
            value={sort}
            onChange={e => setSort(e.target.value as SortKey)}
            className="flex-1 bg-[#1c1c1c] border border-white/[0.08] rounded-lg text-xs text-gray-300 px-2 py-1.5 focus:outline-none focus:border-emerald-500/40"
          >
            <option value="similarity">By Similarity</option>
            <option value="date">By Date</option>
            <option value="confidence">By Confidence</option>
          </select>
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-1.5">
          {ALL_FILTERS.map(key => (
            <FilterChip
              key={key}
              filterKey={key}
              active={filters.has(key)}
              onToggle={toggleFilter}
            />
          ))}
          {filters.size > 0 && (
            <button
              onClick={() => setFilters(new Set())}
              className="px-2.5 py-1 rounded-full text-[10px] font-semibold text-gray-600 hover:text-gray-400 transition"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Results ───────────────────────────────────────────────────────── */}
      {matches.length === 0 ? (
        <Empty msg="No similar historical matches found yet" />
      ) : displayMatches.length === 0 ? (
        <Empty msg="No matches for current filters" />
      ) : (
        <div className="space-y-2">
          <div className="text-[10px] text-gray-600 font-medium">
            {displayMatches.length} result{displayMatches.length !== 1 ? 's' : ''}
            {filters.size > 0 ? ` (filtered from ${matches.length})` : ''}
          </div>
          {displayMatches.map(item => (
            <MatchCard key={item.match_id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
