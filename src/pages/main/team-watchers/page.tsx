import { useEffect, useMemo, useState } from 'react';
import { useIonRouter } from '@ionic/react';
import { ArrowLeft, Brain, ChevronRight, RefreshCw, Search, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { backfillTeamWatchers, getTeamWatchers, inspectSportyTeamWatcherIds } from '../../../services/apis/footballApi';

const statBox = 'rounded-lg border border-white/[0.06] bg-white/[0.03] px-2 py-2';

const confidenceTone = (value: number) => {
  if (value >= 75) return 'text-emerald-300';
  if (value >= 60) return 'text-yellow-300';
  return 'text-gray-400';
};

const pretty = (value: any) => {
  if (!value) return 'Unknown';
  return String(value).replace(/_/g, ' ');
};

export default function TeamWatchersPage() {
  const router = useIonRouter();
  const [watchers, setWatchers] = useState<any[]>([]);
  const [sportyInspect, setSportyInspect] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [query, setQuery] = useState('');
  const [leagueFilter, setLeagueFilter] = useState('all');
  const [sortMode, setSortMode] = useState<'score' | 'matches' | 'recent' | 'name'>('score');

  const load = async () => {
    setLoading(true);
    try {
      const [watcherRes, inspectRes] = await Promise.all([
        getTeamWatchers(250, leagueFilter === 'all' ? '' : leagueFilter),
        inspectSportyTeamWatcherIds(12),
      ]);
      setWatchers(watcherRes?.watchers ?? []);
      setSportyInspect(inspectRes);
      setMsg('');
    } catch (err: any) {
      setMsg(err?.response?.data?.detail || err?.message || 'Load failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [leagueFilter]);

  const runBackfill = async () => {
    setBusy(true);
    try {
      const res = await backfillTeamWatchers(500);
      setMsg(`Backfilled ${res.team_updates ?? 0} team updates from ${res.processed ?? 0} matches`);
      await load();
    } catch (err: any) {
      setMsg(err?.response?.data?.detail || err?.message || 'Backfill failed');
    } finally {
      setBusy(false);
    }
  };

  const leagues = useMemo(() => {
    const values = Array.from(new Set(watchers.map((watcher) => String(watcher?.league_name || '').trim()).filter(Boolean)));
    return ['all', ...values.sort((a, b) => a.localeCompare(b))];
  }, [watchers]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    const rows = watchers.filter((watcher) => {
      if (term) {
        const haystack = [
          watcher?.team_name,
          watcher?.league_name,
          watcher?.position,
          watcher?.analyst_name,
          watcher?.team_key,
        ].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });

    return rows.sort((a, b) => {
      if (sortMode === 'matches') return Number(b?.match_count || 0) - Number(a?.match_count || 0);
      if (sortMode === 'recent') return String(b?.updated_at || '').localeCompare(String(a?.updated_at || ''));
      if (sortMode === 'name') return String(a?.team_name || '').localeCompare(String(b?.team_name || ''));
      return Number(b?.profile?.analyst_score || 0) - Number(a?.profile?.analyst_score || 0);
    });
  }, [watchers, query, sortMode]);

  const usableCount = watchers.filter((watcher) => (watcher?.profile?.prediction_context || {}).usable).length;
  const leagueCount = leagues.length - 1;

  return (
    <div className="h-full w-full overflow-y-auto bg-[#0c0c0c] text-white">
      <div className="sticky top-0 z-10 border-b border-white/[0.06] bg-[#0c0c0c] px-4 pb-3 pt-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.goBack()} className="rounded-md p-1 text-gray-500 active:text-white">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-[16px] font-bold text-white">Team Watchers</h1>
            <p className="text-[10px] text-gray-600">
              {sportyInspect?.sporty_has_team_ids ? 'Sporty team IDs detected' : 'Falling back to team-name matching'} · {watchers.length} analysts
            </p>
          </div>
          <button onClick={load} disabled={loading} className="rounded-md border border-white/[0.08] bg-white/[0.04] p-1.5 text-gray-400 disabled:opacity-40">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2">
          <div className={statBox}>
            <div className="text-base font-bold text-white">{watchers.length}</div>
            <div className="text-[9px] font-semibold uppercase tracking-wider text-gray-600">Watchers</div>
          </div>
          <div className={statBox}>
            <div className="text-base font-bold text-emerald-300">{usableCount}</div>
            <div className="text-[9px] font-semibold uppercase tracking-wider text-gray-600">Usable</div>
          </div>
          <div className={statBox}>
            <div className="text-base font-bold text-cyan-300">{leagueCount}</div>
            <div className="text-[9px] font-semibold uppercase tracking-wider text-gray-600">Leagues</div>
          </div>
          <button onClick={runBackfill} disabled={busy} className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.08] px-2 py-2 text-center disabled:opacity-40">
            <div className="text-base font-bold text-emerald-300">{busy ? '...' : 'Run'}</div>
            <div className="text-[9px] font-semibold uppercase tracking-wider text-emerald-400">Backfill</div>
          </button>
        </div>

        {msg && <div className="mt-2 rounded-md bg-white/[0.04] px-3 py-2 text-[11px] text-gray-300">{msg}</div>}

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-600" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search team, league, analyst, id"
              className="h-9 w-full rounded-md border border-white/[0.07] bg-black/20 pl-8 pr-3 text-xs text-white outline-none placeholder:text-gray-700 focus:border-emerald-500/40"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex h-9 items-center gap-2 rounded-md border border-white/[0.07] bg-black/20 px-2 text-[11px] text-gray-500">
              <SlidersHorizontal className="h-3.5 w-3.5 text-gray-600" />
              <select
                value={leagueFilter}
                onChange={(event) => setLeagueFilter(event.target.value)}
                className="w-full bg-transparent text-xs text-white outline-none"
              >
                <option value="all">All leagues</option>
                {leagues.filter((league) => league !== 'all').map((league) => (
                  <option key={league} value={league}>{league}</option>
                ))}
              </select>
            </label>
            <label className="flex h-9 items-center gap-2 rounded-md border border-white/[0.07] bg-black/20 px-2 text-[11px] text-gray-500">
              <SlidersHorizontal className="h-3.5 w-3.5 text-gray-600" />
              <select
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as any)}
                className="w-full bg-transparent text-xs text-white outline-none"
              >
                <option value="score">Best score</option>
                <option value="matches">Most matches</option>
                <option value="recent">Most recent</option>
                <option value="name">Team name</option>
              </select>
            </label>
          </div>
        </div>
      </div>

      <div className="divide-y divide-white/[0.04]">
        {loading && !watchers.length && <div className="py-16 text-center text-sm text-gray-600">Loading...</div>}
        {!loading && !watchers.length && (
          <div className="py-16 text-center">
            <Brain className="mx-auto mb-3 h-8 w-8 text-gray-700" />
            <p className="text-sm font-semibold text-gray-500">No team watchers yet</p>
            <p className="mt-1 text-xs text-gray-700">Run backfill or wait for finished-match AI analysis.</p>
          </div>
        )}
        {filtered.map((watcher) => {
          const profile = watcher.profile ?? {};
          const record = profile.record ?? {};
          const context = profile.prediction_context ?? {};
          const market = profile.preferred_markets?.[0];
          const venue = profile.venue_split ?? {};
          const homeVenue = venue.home ?? {};
          const awayVenue = venue.away ?? {};

          return (
            <button
              key={watcher.team_key}
              onClick={() => router.push(`/team-watchers/${encodeURIComponent(watcher.team_key)}`, 'forward', 'push')}
              className="w-full px-4 py-3 text-left transition hover:bg-white/[0.02]"
            >
              <div className="flex items-start gap-3">
                <ShieldCheck className={`mt-0.5 h-4 w-4 ${context.usable ? 'text-emerald-400' : 'text-gray-700'}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate text-[13px] font-bold text-white">{watcher.team_name}</div>
                    <div className={`rounded px-2 py-0.5 text-[10px] font-bold ${confidenceTone(Number(profile.analyst_score ?? 0))} bg-white/[0.04]`}>
                      {Math.round(Number(profile.analyst_score ?? 0))}
                    </div>
                  </div>
                  <div className="mt-0.5 text-[10px] text-gray-600">
                    {pretty(watcher.league_name)} · {watcher.position || 'unranked'} · {watcher.match_count || 0} matches
                  </div>
                  <div className="mt-0.5 text-[10px] text-gray-700">
                    {watcher.sporty_team_id || 'no sporty id'} · {watcher.sofascore_team_id || 'no sofascore id'}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {market && (
                      <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                        {String(market.market).replace(/_/g, ' ')}
                      </span>
                    )}
                    <span className="rounded bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold text-gray-500">
                      {context.confidence || 'low'} confidence
                    </span>
                    <span className="rounded bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold text-gray-500">
                      {profile.trend || 'stable'}
                    </span>
                  </div>
                  <div className="mt-1.5 grid grid-cols-2 gap-1.5 text-[10px] text-gray-500">
                    <div className="rounded bg-white/[0.03] px-2 py-1">
                      Home {homeVenue.played || 0} · PPG {homeVenue.ppg ?? 0}
                    </div>
                    <div className="rounded bg-white/[0.03] px-2 py-1">
                      Away {awayVenue.played || 0} · PPG {awayVenue.ppg ?? 0}
                    </div>
                  </div>
                  {profile.recent_briefs?.[0] && (
                    <p className="mt-2 line-clamp-2 text-[10px] leading-relaxed text-gray-500">{profile.recent_briefs[0]}</p>
                  )}
                  {record.form && (
                    <div className="mt-2 text-[10px] text-gray-600">Form: {record.form || 'n/a'}</div>
                  )}
                </div>
                <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-gray-700" />
              </div>
            </button>
          );
        })}
        {!loading && watchers.length > 0 && filtered.length === 0 && (
          <div className="py-10 text-center text-sm text-gray-600">No teams match this filter.</div>
        )}
      </div>
    </div>
  );
}
