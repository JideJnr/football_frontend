import { Sec, Row, Empty, ResultBadge, val, fmtDateTime, teamNameOf, resultForTeam, sameTeam } from './shared';

const H2HMatchCard = ({ event, refTeam }: { event: any; refTeam: string }) => {
  const home     = teamNameOf(event?.home_team || event?.homeTeam);
  const away     = teamNameOf(event?.away_team || event?.awayTeam);
  const score    = event?.score || {};
  const hs       = score.home ?? event?.homeScore?.current;
  const as_      = score.away ?? event?.awayScore?.current;
  const hasScore = hs != null && as_ != null;
  const r        = resultForTeam(event, refTeam);
  const refIsHome = sameTeam(home, refTeam);

  return (
    <div className="rounded-xl border border-white/[0.07] bg-[#111] overflow-hidden">
      {/* tournament + date */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-white/[0.03] border-b border-white/[0.06]">
        <span className="text-[10px] text-gray-600 truncate">{event?.tournament?.name || '—'}</span>
        <span className="text-[10px] text-gray-600 shrink-0 ml-2">{fmtDateTime(event?.start_timestamp)}</span>
      </div>

      {/* teams + score */}
      <div className="flex items-center gap-2 px-3 py-3">
        {/* home team */}
        <div className="flex-1 min-w-0">
          <div className={`text-xs font-semibold truncate ${refIsHome ? 'text-emerald-400' : 'text-gray-300'}`}>{home}</div>
        </div>

        {/* score + result badge */}
        <div className="flex flex-col items-center shrink-0 gap-1">
          {hasScore ? (
            <span className="text-base font-bold text-white tabular-nums">{hs} – {as_}</span>
          ) : (
            <span className="text-xs text-gray-600">vs</span>
          )}
          {r && <ResultBadge result={r} />}
        </div>

        {/* away team */}
        <div className="flex-1 min-w-0 text-right">
          <div className={`text-xs font-semibold truncate ${!refIsHome ? 'text-emerald-400' : 'text-gray-300'}`}>{away}</div>
        </div>
      </div>
    </div>
  );
};

const TabH2H = ({ m }: { m: any }) => {
  const h2h = m?.h2h;
  if (!h2h) return <Empty msg="No H2H data available" />;

  const duel: any         = h2h?.team_duel;
  const h2hEvents: any[]  = h2h?.events || [];

  if (!duel && !h2hEvents.length) return <Empty msg="No H2H data available" />;

  return (
    <div className="px-4 py-4 space-y-3">
      {/* Summary scorecards */}
      {duel && (
        <Sec title="Head to Head">
          {duel.meetings != null && <Row label="Total meetings" value={duel.meetings} />}
          <div className="flex gap-2 mt-2">
            {[
              { label: m.home_team, value: duel.homeWins, color: 'text-emerald-400' },
              { label: 'Draw',      value: duel.draws,    color: 'text-gray-400' },
              { label: m.away_team, value: duel.awayWins, color: 'text-blue-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex-1 flex flex-col items-center py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                <span className={`text-lg font-bold ${color}`}>{val(value, '0')}</span>
                <span className="text-[10px] text-gray-600 mt-0.5 text-center truncate px-1">{label}</span>
              </div>
            ))}
          </div>
        </Sec>
      )}

      {/* Previous meetings */}
      {h2hEvents.length > 0 && (
        <Sec title={`Previous Meetings (${h2hEvents.length})`}>
          <div className="space-y-2">
            {h2hEvents.map((event: any, i: number) => (
              <H2HMatchCard key={event?.id || i} event={event} refTeam={m.home_team} />
            ))}
          </div>
        </Sec>
      )}
    </div>
  );
};

export default TabH2H;
