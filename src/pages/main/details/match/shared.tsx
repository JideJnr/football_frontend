import type { ReactNode } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export const TABS = ['Home', 'Details', 'Lineups', 'Statistics', 'Odds', 'Comparison', 'H2H', 'Prediction'] as const;
export type Tab = typeof TABS[number];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const val = (v: any, fb = '—') => (v != null && v !== '') ? v : fb;

export const fmtDateTime = (ms: any) => {
  if (!ms) return '—';
  const d = typeof ms === 'string' ? new Date(ms) : new Date(ms < 1e10 ? ms * 1000 : ms);
  return d.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const fmtTime = (ms: any) => {
  if (!ms) return '—';
  const d = typeof ms === 'string' ? new Date(ms) : new Date(ms < 1e10 ? ms * 1000 : ms);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const compactForm = (form: any): string => {
  if (!form) return '';
  if (typeof form === 'string') return form;
  if (Array.isArray(form)) return form.map((x: any) => {
    const v = x?.result ?? x?.value ?? x?.winnerCode ?? '';
    return String(v).slice(0, 1).toUpperCase();
  }).join('');
  return String(form);
};

export const parsePlayedSeconds = (v: any): number | null => {
  if (v == null) return null;
  if (typeof v === 'number') return v > 0 ? v : null;
  if (typeof v === 'string' && v.includes(':')) {
    const [mm, ss] = v.split(':').map(Number);
    if (!isNaN(mm) && !isNaN(ss)) return mm * 60 + ss;
  }
  const n = Number(v);
  return !isNaN(n) && n > 0 ? n : null;
};

export const getMatchTime = (m: any): string | null => {
  const p: string = m?.period || '';
  if (!p || p === 'Not start' || p === 'Not started') return null;
  if (p === 'HT') return 'HT';
  if (p === 'FT' || p === 'AET') return 'FT';
  if (p === 'Penalty') return 'PEN';
  const isFirst  = p === 'H1' || p === '1H';
  const isSecond = p === 'H2' || p === '2H';
  const ps = parsePlayedSeconds(m?.played_seconds);
  if (ps !== null) {
    const mins = Math.floor(ps / 60);
    if (isFirst)  { const d = Math.min(mins, 45); const a = mins > 45 ? mins - 45 : 0; return a > 0 ? `45+${a}'` : `${d}'`; }
    if (isSecond) { const d = Math.min(mins, 90); const a = mins > 90 ? mins - 90 : 0; return a > 0 ? `90+${a}'` : `${d}'`; }
    return `${mins}'`;
  }
  const t = m?.start_time;
  const startMs = !t ? 0 : typeof t === 'string' ? new Date(t).getTime() : t < 1e10 ? t * 1000 : t;
  if (!startMs) return p;
  const e = Math.floor((Date.now() - startMs) / 60000);
  if (isFirst)  { const d = Math.min(e, 45); const a = e > 45 ? Math.min(e - 45, 5) : 0; return a > 0 ? `45+${a}'` : `${d}'`; }
  if (isSecond) { const sh = e - 60; if (sh < 0) return "45'"; const d = 45 + Math.min(sh, 45); const a = sh > 45 ? Math.min(sh - 45, 5) : 0; return a > 0 ? `90+${a}'` : `${d}'`; }
  return `${Math.min(e, 90)}'`;
};

export const isLive = (m: any) => {
  const p = m?.period;
  return p && p !== 'Not started' && p !== 'Not start' && p !== 'FT' && p !== 'AET' && p !== 'Finished';
};

export const statNumber = (value: any): number => {
  if (typeof value === 'number') return value;
  const cleaned = String(value ?? '').replace('%', '').trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
};

export const flattenStats = (stats: any[]) => {
  const rows: any[] = [];
  for (const block of stats || []) {
    const groups = block?.groups || block?.statisticsGroups || [];
    if (groups.length) {
      for (const group of groups) {
        for (const item of group?.statisticsItems || group?.items || []) {
          rows.push({ ...item, group: group?.groupName || group?.name || block?.period });
        }
      }
    } else if (block?.statisticsItems || block?.items) {
      for (const item of block.statisticsItems || block.items || []) rows.push({ ...item, group: block?.period });
    } else {
      rows.push(block);
    }
  }
  return rows;
};

export const resultForTeam = (event: any, teamName: string) => {
  const home = event?.home_team?.name || event?.homeTeam?.name || '';
  const score = event?.score || {};
  const hs = Number(score.home ?? event?.homeScore?.current);
  const as_ = Number(score.away ?? event?.awayScore?.current);
  if (!Number.isFinite(hs) || !Number.isFinite(as_)) return '';
  const isHome = home.toLowerCase() === teamName.toLowerCase();
  const own = isHome ? hs : as_;
  const opp = isHome ? as_ : hs;
  if (own > opp) return 'W';
  if (own < opp) return 'L';
  return 'D';
};

export const scoreline = (event: any) => {
  const score = event?.score || {};
  const h = score.home ?? event?.homeScore?.current;
  const a = score.away ?? event?.awayScore?.current;
  if (h == null || a == null) return '?-?';
  return `${h}-${a}`;
};

export const matchLabel = (event: any) => {
  const home = event?.home_team?.name || event?.homeTeam?.name || '?';
  const away = event?.away_team?.name || event?.awayTeam?.name || '?';
  return `${home} vs ${away}`;
};

export const teamGoalsInMatch = (event: any, teamName: string) => {
  const homeName = event?.home_team?.name || event?.homeTeam?.name || '';
  const isHome = homeName.toLowerCase() === teamName.toLowerCase();
  const score = event?.score || {};
  const h = Number(score.home ?? event?.homeScore?.current);
  const a = Number(score.away ?? event?.awayScore?.current);
  if (!Number.isFinite(h) || !Number.isFinite(a)) return null;
  return { scored: isHome ? h : a, conceded: isHome ? a : h, total: h + a };
};

export const buildTeamStats = (matches: any[], teamName: string) => {
  let w = 0, d = 0, l = 0;
  let homeW = 0, homeD = 0, homeL = 0, homeGames = 0;
  let awayW = 0, awayD = 0, awayL = 0, awayGames = 0;
  let totalScored = 0, totalConceded = 0, validGames = 0;
  let highestScoring: any = null, lowestScoring: any = null;
  let highestTotal = -1, lowestTotal = Infinity;
  let cleanSheets = 0, failedToScore = 0;

  for (const event of matches) {
    const homeName = event?.home_team?.name || event?.homeTeam?.name || '';
    const isHome = homeName.toLowerCase() === teamName.toLowerCase();
    const g = teamGoalsInMatch(event, teamName);
    if (!g) continue;

    validGames++;
    totalScored += g.scored;
    totalConceded += g.conceded;
    if (g.conceded === 0) cleanSheets++;
    if (g.scored === 0) failedToScore++;

    const r = resultForTeam(event, teamName);
    if (r === 'W') w++; else if (r === 'D') d++; else if (r === 'L') l++;

    if (isHome) {
      homeGames++;
      if (r === 'W') homeW++; else if (r === 'D') homeD++; else if (r === 'L') homeL++;
    } else {
      awayGames++;
      if (r === 'W') awayW++; else if (r === 'D') awayD++; else if (r === 'L') awayL++;
    }

    if (g.total > highestTotal) { highestTotal = g.total; highestScoring = event; }
    if (g.total < lowestTotal) { lowestTotal = g.total; lowestScoring = event; }
  }

  const avgScored = validGames ? (totalScored / validGames).toFixed(2) : '—';
  const avgConceded = validGames ? (totalConceded / validGames).toFixed(2) : '—';
  const winRate = validGames ? Math.round((w / validGames) * 100) : 0;

  return {
    played: validGames, w, d, l, winRate,
    homeGames, homeW, homeD, homeL,
    awayGames, awayW, awayD, awayL,
    totalScored, totalConceded, avgScored, avgConceded,
    cleanSheets, failedToScore,
    highestScoring, lowestScoring,
    highestTotal: highestTotal === -1 ? null : highestTotal,
    lowestTotal: lowestTotal === Infinity ? null : lowestTotal,
  };
};

// ─── Shared UI primitives ─────────────────────────────────────────────────────

export const LiveDot = () => (
  <span className="relative flex h-2 w-2 shrink-0">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
  </span>
);

export const Sec = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="bg-[#161616] border border-white/[0.07] rounded-xl overflow-hidden mb-3">
    <div className="px-4 py-2.5 border-b border-white/[0.07] text-[10px] font-bold text-gray-500 uppercase tracking-widest">{title}</div>
    <div className="p-4 space-y-2.5">{children}</div>
  </div>
);

export const Row = ({ label, value, color }: { label: string; value: any; color?: string }) => (
  <div className="flex justify-between items-center text-sm gap-4">
    <span className="text-gray-500 shrink-0">{label}</span>
    <span className={`text-right ${color || 'text-white font-medium'}`}>{val(value)}</span>
  </div>
);

export const FormDots = ({ form }: { form: any }) => {
  const t = compactForm(form);
  if (!t) return <span className="text-gray-600 text-xs">—</span>;
  return (
    <div className="flex gap-1">
      {t.split('').slice(-5).map((r, i) => (
        <span key={i} className={`w-5 h-5 rounded-full text-[9px] flex items-center justify-center font-bold ${r === 'W' ? 'bg-emerald-500/25 text-emerald-400' : r === 'L' ? 'bg-red-500/25 text-red-400' : 'bg-gray-600/30 text-gray-400'}`}>{r}</span>
      ))}
    </div>
  );
};

export const StatBar = ({ a, b }: { a: number; b: number }) => {
  const total = (a + b) || 1;
  return (
    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden flex mt-1">
      <div className="bg-emerald-500 rounded-full transition-all" style={{ width: `${(a / total) * 100}%` }} />
      <div className="bg-blue-500 rounded-full transition-all" style={{ width: `${(b / total) * 100}%` }} />
    </div>
  );
};

export const Empty = ({ msg = 'No data available' }: { msg?: string }) => (
  <div className="flex flex-col items-center justify-center py-10 gap-2">
    <span className="text-2xl">📭</span>
    <span className="text-xs text-gray-600">{msg}</span>
  </div>
);

export const ResultBadge = ({ result }: { result: string }) => (
  <span className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold shrink-0 ${
    result === 'W' ? 'bg-emerald-500/25 text-emerald-400'
    : result === 'L' ? 'bg-red-500/25 text-red-400'
    : 'bg-gray-600/30 text-gray-400'
  }`}>{result || '-'}</span>
);

export const StandingsTable = ({ m, standings, full = false }: { m: any; standings: any[]; full?: boolean }) => {
  if (!standings?.length) return null;
  return (
    <Sec title={full ? 'Full Table' : 'Standings'}>
      <div className="overflow-x-auto -mx-1">
        <table className={`w-full text-xs ${full ? 'min-w-[420px]' : 'min-w-[280px]'}`}>
          <thead>
            <tr className="text-gray-600 border-b border-white/[0.06]">
              <th className="text-left pb-2 font-medium w-6">#</th>
              <th className="text-left pb-2 font-medium">Team</th>
              <th className="text-center pb-2 font-medium w-7">P</th>
              <th className="text-center pb-2 font-medium w-7">W</th>
              <th className="text-center pb-2 font-medium w-7">D</th>
              <th className="text-center pb-2 font-medium w-7">L</th>
              {full && <>
                <th className="text-center pb-2 font-medium">GF</th>
                <th className="text-center pb-2 font-medium">GA</th>
                <th className="text-center pb-2 font-medium">GD</th>
              </>}
              <th className="text-center pb-2 font-medium w-8">Pts</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row: any, i: number) => {
              const name = row?.team?.name ?? row?.name ?? '—';
              const ht = (m.home_team || '').toLowerCase().slice(0, 6);
              const at = (m.away_team || '').toLowerCase().slice(0, 6);
              const highlight = name.toLowerCase().includes(ht) || name.toLowerCase().includes(at);
              return (
                <tr key={row?.team?.id || i} className={`border-b border-white/[0.04] ${highlight ? 'bg-emerald-500/5' : ''}`}>
                  <td className="py-1.5 text-gray-600">{row?.position ?? i + 1}</td>
                  <td className={`py-1.5 truncate ${full ? 'min-w-[130px]' : 'max-w-[110px]'} ${highlight ? 'text-emerald-400 font-semibold' : 'text-gray-300'}`}>{name}</td>
                  <td className="py-1.5 text-center text-gray-400">{row?.played ?? row?.matches ?? '—'}</td>
                  <td className="py-1.5 text-center text-emerald-400">{row?.wins ?? '—'}</td>
                  <td className="py-1.5 text-center text-gray-400">{row?.draws ?? '—'}</td>
                  <td className="py-1.5 text-center text-red-400">{row?.losses ?? '—'}</td>
                  {full && <>
                    <td className="py-1.5 text-center text-gray-400">{row?.goals_for ?? '—'}</td>
                    <td className="py-1.5 text-center text-gray-400">{row?.goals_against ?? '—'}</td>
                    <td className="py-1.5 text-center text-gray-400">{row?.goal_diff ?? '—'}</td>
                  </>}
                  <td className="py-1.5 text-center text-white font-bold">{row?.points ?? '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Sec>
  );
};

export const MatchList = ({ title, team, matches }: { title: string; team: string; matches: any[] }) => (
  <Sec title={title}>
    {matches.length === 0 ? <Empty msg="No recent matches available" /> : (
      <div className="space-y-2">
        {matches.map((event: any, i: number) => {
          const home = event?.home_team?.name || event?.homeTeam?.name || '';
          const away = event?.away_team?.name || event?.awayTeam?.name || '';
          const score = event?.score || {};
          const sl = score.home != null && score.away != null ? `${score.home}-${score.away}` : 'vs';
          const r = resultForTeam(event, team);
          return (
            <div key={event?.id || i} className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2">
              <ResultBadge result={r} />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-300 truncate">{home} vs {away}</div>
                <div className="text-[10px] text-gray-600 truncate">{event?.tournament?.name || event?.tournament || ''}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs font-bold text-white">{sl}</div>
                <div className="text-[10px] text-gray-600">{fmtDateTime(event?.start_timestamp || event?.startTimestamp || event?.start_time)}</div>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </Sec>
);

export const ActionButton = ({
  onClick, disabled, loading, label, loadingLabel, variant = 'default',
}: {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  label: string;
  loadingLabel: string;
  variant?: 'default' | 'purple';
}) => (
  <button
    onClick={onClick}
    disabled={disabled || loading}
    className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border border-white/10 transition disabled:opacity-40 ${
      variant === 'purple'
        ? 'text-gray-300 hover:border-purple-500/40 hover:text-purple-400'
        : 'text-gray-300 hover:border-emerald-500/40 hover:text-emerald-400'
    }`}
  >
    {loading ? loadingLabel : label}
  </button>
);
