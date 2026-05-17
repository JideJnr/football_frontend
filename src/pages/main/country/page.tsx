import { useIonRouter } from '@ionic/react';
import { useMemo, useState } from 'react';
import { useFootballContext } from '../../../contexts/useFootballContext';

// ── helpers ───────────────────────────────────────────────────────────────────

const parseCountryLeague = (tournament: string): { country: string; league: string } => {
  const sep = tournament.indexOf(' - ');
  if (sep !== -1) {
    return { country: tournament.slice(0, sep).trim(), league: tournament.slice(sep + 3).trim() };
  }
  const international: Record<string, string> = {
    'Champions League': 'Europe', 'UEFA Champions League': 'Europe',
    'Europa League': 'Europe', 'UEFA Europa League': 'Europe',
    'Conference League': 'Europe', 'UEFA Conference League': 'Europe',
    'World Cup': 'International', 'FIFA World Cup': 'International',
    'AFCON': 'Africa', 'Copa America': 'International', 'Nations League': 'International',
  };
  for (const [key, country] of Object.entries(international)) {
    if (tournament.includes(key)) return { country, league: tournament };
  }
  return { country: 'Other', league: tournament };
};

const isLive = (m: any) => {
  const p = m.period;
  return p && p !== 'Not started' && p !== 'Not start' && p !== 'FT' && p !== 'AET' && p !== 'Finished';
};

const LiveDot = () => (
  <span className="relative flex h-2 w-2 shrink-0">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
  </span>
);

const scoreStr = (score: any) =>
  score?.home != null && score?.away != null ? `${score.home} - ${score.away}` : null;

// ── views ─────────────────────────────────────────────────────────────────────

type View =
  | { kind: 'countries' }
  | { kind: 'leagues'; country: string }
  | { kind: 'matches'; country: string; league: string };

// ── Country page ──────────────────────────────────────────────────────────────

const Country = () => {
  const router = useIonRouter();
  const { matches } = useFootballContext();
  const [view, setView] = useState<View>({ kind: 'countries' });

  // Build country → league → matches map from buffer
  const tree = useMemo(() => {
    const map: Record<string, Record<string, any[]>> = {};
    for (const m of matches || []) {
      const { country, league } = parseCountryLeague(m.tournament || 'Unknown');
      if (!map[country]) map[country] = {};
      if (!map[country][league]) map[country][league] = [];
      map[country][league].push(m);
    }
    return map;
  }, [matches]);

  const sortedCountries = useMemo(() =>
    Object.keys(tree).sort((a, b) => {
      const last = (s: string) => (s === 'Europe' || s === 'International' || s === 'Other' ? 1 : 0);
      return last(a) - last(b) || a.localeCompare(b);
    }), [tree]);

  // ── Back button ──
  const back = () => {
    if (view.kind === 'matches') setView({ kind: 'leagues', country: view.country });
    else if (view.kind === 'leagues') setView({ kind: 'countries' });
  };

  const title =
    view.kind === 'countries' ? 'Countries' :
    view.kind === 'leagues'   ? view.country :
    view.league;

  const showBack = view.kind !== 'countries';

  return (
    <div className="w-full h-full bg-[#0e0e0e] text-white flex flex-col">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] shrink-0">
        {showBack && (
          <button onClick={back} className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <span className="text-sm font-bold text-white">{title}</span>
        {view.kind === 'leagues' && (
          <span className="ml-auto text-xs text-gray-600">
            {Object.keys(tree[view.country] || {}).length} leagues
          </span>
        )}
        {view.kind === 'matches' && (
          <span className="ml-auto text-xs text-gray-600">
            {(tree[view.country]?.[view.league] || []).length} matches
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 py-3">

        {/* ── Countries list ── */}
        {view.kind === 'countries' && (
          <div className="space-y-1">
            {sortedCountries.map(country => {
              const leagues = tree[country];
              const total = Object.values(leagues).reduce((s, arr) => s + arr.length, 0);
              const live = Object.values(leagues).flat().filter(isLive).length;
              return (
                <button
                  key={country}
                  onClick={() => setView({ kind: 'leagues', country })}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#161616] border border-white/[0.07] hover:border-emerald-500/30 hover:bg-white/[0.04] transition-all text-left"
                >
                  <span className="text-lg">🌍</span>
                  <span className="flex-1 text-sm font-semibold text-gray-200">{country}</span>
                  {live > 0 && (
                    <span className="flex items-center gap-1 text-[10px] text-red-400 font-semibold">
                      <LiveDot />{live}
                    </span>
                  )}
                  <span className="text-xs text-gray-600">{Object.keys(leagues).length} leagues · {total}</span>
                  <svg className="w-4 h-4 text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Leagues list ── */}
        {view.kind === 'leagues' && (
          <div className="space-y-1">
            {Object.entries(tree[view.country] || {})
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([league, leagueMatches]) => {
                const live = leagueMatches.filter(isLive).length;
                return (
                  <button
                    key={league}
                    onClick={() => setView({ kind: 'matches', country: view.country, league })}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#161616] border border-white/[0.07] hover:border-emerald-500/30 hover:bg-white/[0.04] transition-all text-left"
                  >
                    <span className="text-lg">🏆</span>
                    <span className="flex-1 text-sm font-semibold text-gray-200">{league}</span>
                    {live > 0 && (
                      <span className="flex items-center gap-1 text-[10px] text-red-400 font-semibold">
                        <LiveDot />{live}
                      </span>
                    )}
                    <span className="text-xs text-gray-600">{leagueMatches.length}</span>
                    <svg className="w-4 h-4 text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                );
              })}
          </div>
        )}

        {/* ── Matches list ── */}
        {view.kind === 'matches' && (
          <div className="space-y-1">
            {(tree[view.country]?.[view.league] || []).map((m: any) => {
              const live = isLive(m);
              const score = scoreStr(m.score);
              return (
                <button
                  key={m.sportybet_id}
                  onClick={() => router.push(`/match/${m.sportybet_id}`, 'forward', 'push')}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#161616] border border-white/[0.07] hover:border-emerald-500/30 hover:bg-white/[0.04] transition-all text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-200 truncate">{m.home_team}</div>
                    <div className="text-sm text-gray-400 truncate">{m.away_team}</div>
                  </div>
                  <div className="flex flex-col items-end shrink-0 gap-1">
                    {live ? (
                      <>
                        <span className="flex items-center gap-1"><LiveDot /><span className="text-sm font-bold text-white">{score ?? '- -'}</span></span>
                        <span className="text-[10px] text-red-400 font-semibold">{m.period}</span>
                      </>
                    ) : score ? (
                      <span className="text-sm font-bold text-white">{score}</span>
                    ) : (
                      <span className="text-xs text-emerald-400 font-semibold">{m.start_time ? new Date(m.start_time < 1e10 ? m.start_time * 1000 : m.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
                    )}
                  </div>
                  <svg className="w-4 h-4 text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              );
            })}
          </div>
        )}

        {(matches || []).length === 0 && (
          <div className="flex flex-col items-center justify-center mt-16 gap-2">
            <span className="text-3xl">🌍</span>
            <span className="text-sm text-gray-600">No matches loaded yet</span>
            <span className="text-xs text-gray-700">Switch to Home tab to load today's matches</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Country;
