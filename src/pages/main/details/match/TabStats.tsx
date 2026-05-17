import { Sec, Row, StatBar, Empty, StandingsTable, flattenStats, statNumber, val } from './shared';

const TabStats = ({ m }: { m: any }) => {
  const detail = m?.sofascore_detail || {};
  const statRows = flattenStats(m?.statistics || detail?.statistics || detail?.stats || []);
  const standings: any[] = m?.standings || detail?.standings || [];
  const hasRatings = m.home_avg_rating || m.away_avg_rating;

  return (
    <div className="px-4 py-4 space-y-3">
      {statRows.length > 0 ? (
        <Sec title="Match Statistics">
          <div className="space-y-3">
            {statRows.map((s: any, i: number) => {
              const label = s?.name ?? s?.label ?? s?.type ?? `Stat ${i}`;
              const homeRaw = s?.home ?? s?.homeValue ?? s?.homeTotal ?? 0;
              const awayRaw = s?.away ?? s?.awayValue ?? s?.awayTotal ?? 0;
              const a = statNumber(homeRaw);
              const b = statNumber(awayRaw);
              return (
                <div key={`${label}-${i}`}>
                  <div className="flex justify-between text-xs mb-1 gap-3">
                    <span className="text-emerald-400 font-semibold tabular-nums">{val(homeRaw, '0')}</span>
                    <span className="text-gray-500 text-center truncate">{label}</span>
                    <span className="text-blue-400 font-semibold tabular-nums">{val(awayRaw, '0')}</span>
                  </div>
                  <StatBar a={a} b={b} />
                </div>
              );
            })}
          </div>
        </Sec>
      ) : hasRatings ? (
        <Sec title="Ratings">
          <Row label="Home avg rating" value={m.home_avg_rating} color="text-emerald-400" />
          <Row label="Away avg rating" value={m.away_avg_rating} color="text-blue-400" />
        </Sec>
      ) : (
        <Empty msg="No match statistics available yet" />
      )}

      <StandingsTable m={m} standings={standings} full />
    </div>
  );
};

export default TabStats;
