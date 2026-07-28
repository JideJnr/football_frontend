import { useState } from 'react';
import {
  Sec, Empty, ResultBadge,
  buildTeamStats, resultForTeam, teamGoalsInMatch, scoreline, matchLabel,
  fmtDateTime, sameTeam, teamNameOf,
} from './shared';

interface CommonOpponent {
  opponent: string;
  homeEvent: any;
  awayEvent: any;
}

const PAGE_SIZE = 5;

const norm = (s: string) => s.toLowerCase().trim().slice(0, 8);

const getOppName = (event: any, teamName: string): string => {
  const h = teamNameOf(event?.home_team || event?.homeTeam);
  const a = teamNameOf(event?.away_team || event?.awayTeam);
  return sameTeam(h, teamName) ? a : h;
};

const findCommonOpponents = (homeMatches: any[], awayMatches: any[], homeTeam: string, awayTeam: string): CommonOpponent[] => {
  const homeMap = new Map<string, any>();
  for (const ev of homeMatches) {
    const opp = getOppName(ev, homeTeam);
    if (opp) homeMap.set(norm(opp), ev);
  }
  const result: CommonOpponent[] = [];
  const seen = new Set<string>();
  for (const ev of awayMatches) {
    const opp = getOppName(ev, awayTeam);
    if (!opp) continue;
    const key = norm(opp);
    if (homeMap.has(key) && !seen.has(key)) {
      seen.add(key);
      result.push({ opponent: opp, homeEvent: homeMap.get(key)!, awayEvent: ev });
    }
  }
  return result;
};

const resultBg = (r: string) =>
  r === 'W' ? 'bg-emerald-500/15 border-emerald-700/40'
  : r === 'L' ? 'bg-red-500/15 border-red-800/40'
  : 'bg-gray-500/10 border-gray-700/30';

const venueOf = (event: any, teamName: string) =>
  sameTeam(teamNameOf(event?.home_team || event?.homeTeam), teamName) ? 'Home' : 'Away';

const resultPoints = (r: string) => r === 'W' ? 3 : r === 'D' ? 1 : 0;

// ─── Sub-components ───────────────────────────────────────────────────────────

const CompareBar = ({
  label, homeVal, awayVal,
  homeColor = 'bg-emerald-500', awayColor = 'bg-blue-500', sample,
}: {
  label: string; homeVal: number; awayVal: number;
  homeColor?: string; awayColor?: string; sample?: string;
}) => {
  const total = (homeVal + awayVal) || 1;
  const homePct = Math.round((homeVal / total) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-emerald-400 font-bold tabular-nums">{homeVal}</span>
        <span className="text-gray-500">{label}{sample ? ` (${sample})` : ''}</span>
        <span className="text-blue-400 font-bold tabular-nums">{awayVal}</span>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden bg-white/10">
        <div className={`${homeColor} transition-all`} style={{ width: `${homePct}%` }} />
        <div className={`${awayColor} transition-all`} style={{ width: `${100 - homePct}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-gray-600">
        <span>{homePct}%</span>
        <span>{100 - homePct}%</span>
      </div>
    </div>
  );
};

const RecordGrid = ({ label, w, d, l, games }: { label: string; w: number; d: number; l: number; games: number }) => (
  <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3">
    <div className="text-[10px] text-gray-600 uppercase tracking-wide mb-2">{label} ({games}G)</div>
    <div className="flex gap-2">
      {[{ v: w, c: 'text-emerald-400', l: 'W' }, { v: d, c: 'text-gray-400', l: 'D' }, { v: l, c: 'text-red-400', l: 'L' }].map(({ v, c, l: lbl }) => (
        <div key={lbl} className="flex-1 text-center">
          <div className={`text-base font-bold ${c}`}>{v}</div>
          <div className="text-[10px] text-gray-600">{lbl}</div>
        </div>
      ))}
    </div>
  </div>
);

const NotableGame = ({ label, labelColor, event, total }: {
  label: string; labelColor: string; event: any; total: number | null;
}) => (
  <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2">
    <div className={`text-[10px] ${labelColor} uppercase tracking-wide mb-1`}>{label}</div>
    <div className="text-xs text-white font-semibold">{matchLabel(event)}</div>
    <div className="flex justify-between text-[10px] text-gray-500 mt-0.5">
      <span>{scoreline(event)} ({total} goals)</span>
      <span>{fmtDateTime(event?.start_timestamp || event?.start_time)}</span>
    </div>
  </div>
);

const TeamMatchRow = ({ event, teamName }: { event: any; teamName: string }) => {
  const r    = resultForTeam(event, teamName);
  const g    = teamGoalsInMatch(event, teamName);
  const opp  = getOppName(event, teamName) || '?';
  const isHome = sameTeam(teamNameOf(event?.home_team || event?.homeTeam), teamName);
  const date = fmtDateTime(event?.start_timestamp || event?.startTimestamp || event?.start_time);
  return (
    <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${resultBg(r)}`}>
      <ResultBadge result={r} />
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-300 truncate">
          <span className="text-gray-600 text-[10px]">{isHome ? 'H' : 'A'}</span> vs {opp}
        </div>
        <div className="text-[10px] text-gray-600 truncate">{event?.tournament?.name || event?.tournament || ''}</div>
        <div className="text-[10px] text-gray-500">{date}</div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-xs font-bold text-white">{scoreline(event)}</div>
        {g && <div className="text-[10px] text-gray-600">{g.scored}G {g.conceded}GA GD {g.diff}</div>}
      </div>
    </div>
  );
};

// ─── Paginated match list ─────────────────────────────────────────────────────

const PaginatedMatchList = ({ title, matches, teamName }: { title: string; matches: any[]; teamName: string }) => {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(matches.length / PAGE_SIZE);
  const slice = matches.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <Sec title={title}>
      {matches.length === 0 ? <Empty msg="No data" /> : (
        <>
          <div className="space-y-1.5">
            {slice.map((event: any, i: number) => (
              <TeamMatchRow key={event?.id || i} event={event} teamName={teamName} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/[0.06]">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-white/10 text-gray-400 disabled:opacity-30 hover:border-white/20 hover:text-white transition"
              >
                ← Prev
              </button>
              <span className="text-[10px] text-gray-600">
                {page + 1} / {totalPages} &nbsp;·&nbsp; {matches.length} matches
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page === totalPages - 1}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-white/10 text-gray-400 disabled:opacity-30 hover:border-white/20 hover:text-white transition"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </Sec>
  );
};

// ─── Common opponents ─────────────────────────────────────────────────────────

const CommonOppRow = ({ item, homeTeam, awayTeam }: { item: CommonOpponent; homeTeam: string; awayTeam: string }) => {
  const hr = resultForTeam(item.homeEvent, homeTeam);
  const ar = resultForTeam(item.awayEvent, awayTeam);
  const hg = teamGoalsInMatch(item.homeEvent, homeTeam);
  const ag = teamGoalsInMatch(item.awayEvent, awayTeam);
  const hScore = resultPoints(hr) + ((hg?.diff || 0) * 0.35);
  const aScore = resultPoints(ar) + ((ag?.diff || 0) * 0.35);
  const hDate = fmtDateTime(item.homeEvent?.start_timestamp || item.homeEvent?.start_time);
  const aDate = fmtDateTime(item.awayEvent?.start_timestamp || item.awayEvent?.start_time);
  const winner = Math.abs(hScore - aScore) < 0.1 ? null : hScore > aScore ? 'home' : 'away';
  return (
    <div className="rounded-xl border border-white/[0.07] bg-[#111] overflow-hidden">
      <div className="px-3 py-1.5 bg-white/[0.04] border-b border-white/[0.06] flex items-center justify-between">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">vs {item.opponent}</span>
        {winner ? (
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
            winner === 'home' ? 'bg-emerald-900/50 text-emerald-400' : 'bg-blue-900/50 text-blue-400'
          }`}>
            {winner === 'home' ? homeTeam : awayTeam} did better
          </span>
        ) : (
          <span className="text-[9px] text-gray-600">Even</span>
        )}
      </div>
      <div className="grid grid-cols-2 divide-x divide-white/[0.06]">
        {([
          { event: item.homeEvent, team: homeTeam, result: hr, date: hDate, color: 'text-emerald-400' },
          { event: item.awayEvent, team: awayTeam, result: ar, date: aDate, color: 'text-blue-400' },
        ] as const).map(({ event, team, result, date, color }, i) => (
          <div key={i} className={`px-3 py-2 border ${resultBg(result)}`}>
            <div className={`text-[10px] font-bold ${color} mb-1 truncate`}>{team}</div>
            <div className="flex items-center gap-1.5">
              <ResultBadge result={result} />
              <span className="text-xs font-bold text-white">{scoreline(event)}</span>
            </div>
            <div className="text-[10px] text-gray-600 mt-1">{venueOf(event, team)} · GD {teamGoalsInMatch(event, team)?.diff ?? 0}</div>
            <div className="text-[10px] text-gray-600">{date}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

const TabComparison = ({ m }: { m: any }) => {
  const homeMatches: any[] = m?.home_last_matches || [];
  const awayMatches: any[] = m?.away_last_matches || [];

  if (homeMatches.length === 0 && awayMatches.length === 0) {
    return <Empty msg="No recent match data available" />;
  }

  const home = buildTeamStats(homeMatches, m.home_team);
  const away = buildTeamStats(awayMatches, m.away_team);
  const common = findCommonOpponents(homeMatches, awayMatches, m.home_team, m.away_team);

  const commonScores = common.map(c => {
    const hr = resultForTeam(c.homeEvent, m.home_team);
    const ar = resultForTeam(c.awayEvent, m.away_team);
    const hg = teamGoalsInMatch(c.homeEvent, m.home_team);
    const ag = teamGoalsInMatch(c.awayEvent, m.away_team);
    return {
      home: resultPoints(hr) + ((hg?.diff || 0) * 0.35),
      away: resultPoints(ar) + ((ag?.diff || 0) * 0.35),
    };
  });
  const homeWins = commonScores.filter(c => c.home > c.away + 0.1).length;
  const awayWins = commonScores.filter(c => c.away > c.home + 0.1).length;
  const even = common.length - homeWins - awayWins;

  return (
    <div className="px-4 py-4 space-y-3">
      {/* Team header */}
      <div className="flex items-center justify-between px-1 mb-1">
        <span className="text-sm font-bold text-emerald-400 flex-1">{m.home_team}</span>
        <span className="text-[10px] text-gray-600 uppercase tracking-widest">vs</span>
        <span className="text-sm font-bold text-blue-400 flex-1 text-right">{m.away_team}</span>
      </div>

      {/* Overall record */}
      <Sec title={`Overall Record (${home.played} vs ${away.played} matches)`}>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <RecordGrid label="Overall" w={home.w} d={home.d} l={home.l} games={home.played} />
          <RecordGrid label="Overall" w={away.w} d={away.d} l={away.l} games={away.played} />
        </div>
        <CompareBar label="Wins" homeVal={home.w} awayVal={away.w} sample={`${home.played}/${away.played} games`} />
        <div className="mt-3" />
        <CompareBar label="Win Rate %" homeVal={home.winRate} awayVal={away.winRate} sample={`${home.played}/${away.played} games`} />
      </Sec>

      {/* Venue split */}
      <Sec title={`Venue Split`}>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <RecordGrid label={`${m.home_team} Home`} w={home.homeW} d={home.homeD} l={home.homeL} games={home.homeGames} />
          <RecordGrid label={`${m.away_team} Away`} w={away.awayW} d={away.awayD} l={away.awayL} games={away.awayGames} />
        </div>
        <div className="text-[10px] text-gray-600 text-center mt-1">Home team's home record vs Away team's away record</div>
      </Sec>

      {/* Scoring */}
      <Sec title="Scoring">
        <CompareBar label="Goals Scored" homeVal={home.totalScored} awayVal={away.totalScored} />
        <div className="mt-3" />
        <CompareBar label="Goals Conceded" homeVal={home.totalConceded} awayVal={away.totalConceded} homeColor="bg-red-500" awayColor="bg-orange-500" />
        <div className="mt-3 grid grid-cols-2 gap-3">
          {[
            { stats: home, scored: 'text-emerald-400', conceded: 'text-red-400' },
            { stats: away, scored: 'text-blue-400', conceded: 'text-orange-400' },
          ].map(({ stats, scored, conceded }, idx) => (
            <div key={idx} className="space-y-1.5">
              <div className="flex justify-between text-xs"><span className="text-gray-500">Avg scored</span><span className={`${scored} font-bold`}>{stats.avgScored}</span></div>
              <div className="flex justify-between text-xs"><span className="text-gray-500">Avg conceded</span><span className={`${conceded} font-bold`}>{stats.avgConceded}</span></div>
              <div className="flex justify-between text-xs"><span className="text-gray-500">Clean sheets</span><span className="text-white font-bold">{stats.cleanSheets}</span></div>
              <div className="flex justify-between text-xs"><span className="text-gray-500">Failed to score</span><span className="text-white font-bold">{stats.failedToScore}</span></div>
            </div>
          ))}
        </div>
      </Sec>

      {/* Notable games */}
      <Sec title="Notable Games">
        <div className="space-y-2">
          {home.highestScoring && <NotableGame label={`${m.home_team} — Highest Scoring`} labelColor="text-emerald-400" event={home.highestScoring} total={home.highestTotal} />}
          {home.lowestScoring && home.lowestScoring !== home.highestScoring && <NotableGame label={`${m.home_team} — Lowest Scoring`} labelColor="text-gray-500" event={home.lowestScoring} total={home.lowestTotal} />}
          {away.highestScoring && <NotableGame label={`${m.away_team} — Highest Scoring`} labelColor="text-blue-400" event={away.highestScoring} total={away.highestTotal} />}
          {away.lowestScoring && away.lowestScoring !== away.highestScoring && <NotableGame label={`${m.away_team} — Lowest Scoring`} labelColor="text-gray-500" event={away.lowestScoring} total={away.lowestTotal} />}
        </div>
      </Sec>

      {/* Common opponents */}
      {common.length > 0 && (
        <Sec title={`Common Opponents (${common.length})`}>
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="text-center">
              <div className="text-xl font-bold text-emerald-400">{homeWins}</div>
              <div className="text-[10px] text-gray-600 truncate max-w-[80px]">{m.home_team} better</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-gray-500">{even}</div>
              <div className="text-[10px] text-gray-600">Even</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-blue-400">{awayWins}</div>
              <div className="text-[10px] text-gray-600 truncate max-w-[80px]">{m.away_team} better</div>
            </div>
          </div>
          <div className="space-y-2">
            {common.map((item, i) => (
              <CommonOppRow key={i} item={item} homeTeam={m.home_team} awayTeam={m.away_team} />
            ))}
          </div>
        </Sec>
      )}

      {/* Paginated match lists */}
      <PaginatedMatchList
        title={`${m.home_team} — Last ${homeMatches.length} Matches`}
        matches={homeMatches}
        teamName={m.home_team}
      />
      <PaginatedMatchList
        title={`${m.away_team} — Last ${awayMatches.length} Matches`}
        matches={awayMatches}
        teamName={m.away_team}
      />
    </div>
  );
};

export default TabComparison;
