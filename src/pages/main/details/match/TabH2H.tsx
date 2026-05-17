import { Sec, Row, Empty, StandingsTable, val } from './shared';

const TabH2H = ({ m }: { m: any }) => {
  const h2h = m?.h2h;
  const standings: any[] = m?.standings || [];

  if (!h2h && standings.length === 0) return <Empty msg="No H2H data available" />;

  return (
    <div className="px-4 py-4 space-y-3">
      {h2h && (
        <Sec title="Head to Head">
          {(() => {
            const meetings = h2h?.teamDuel?.meetings ?? h2h?.meetings;
            const homeW    = h2h?.teamDuel?.homeWins  ?? h2h?.homeWins;
            const draws    = h2h?.teamDuel?.draws      ?? h2h?.draws;
            const awayW    = h2h?.teamDuel?.awayWins   ?? h2h?.awayWins;
            return (
              <>
                {meetings != null && <Row label="Total meetings" value={meetings} />}
                <div className="flex gap-2 mt-2">
                  {[
                    { label: m.home_team, value: homeW, color: 'text-emerald-400' },
                    { label: 'Draw',      value: draws, color: 'text-gray-400' },
                    { label: m.away_team, value: awayW, color: 'text-blue-400' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex-1 flex flex-col items-center py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                      <span className={`text-lg font-bold ${color}`}>{val(value, '0')}</span>
                      <span className="text-[10px] text-gray-600 mt-0.5 text-center truncate px-1">{label}</span>
                    </div>
                  ))}
                </div>
              </>
            );
          })()}
        </Sec>
      )}

      <StandingsTable m={m} standings={standings} />
    </div>
  );
};

export default TabH2H;
