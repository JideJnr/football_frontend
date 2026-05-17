import { Sec, Empty } from './shared';

const PlayerDot = ({ player, side }: { player: any; side: 'home' | 'away' }) => {
  const name = player?.name ?? player?.player?.name ?? '?';
  const num  = player?.jerseyNumber ?? player?.shirtNumber ?? '';
  const rating = player?.statistics?.rating ?? player?.rating;
  return (
    <div className="flex flex-col items-center gap-0.5 w-14">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
        side === 'home'
          ? 'bg-emerald-900/60 border-emerald-500 text-emerald-300'
          : 'bg-blue-900/60 border-blue-500 text-blue-300'
      }`}>
        {num || name.slice(0, 2).toUpperCase()}
      </div>
      {rating && <span className="text-[9px] text-yellow-400 font-semibold">{Number(rating).toFixed(1)}</span>}
      <span className="text-[9px] text-gray-400 text-center leading-tight truncate w-full">{name.split(' ').pop()}</span>
    </div>
  );
};

const lineupPlayers = (lineups: any, side: 'home' | 'away') => {
  const data = lineups?.[side] || lineups?.[`${side}Team`] || {};
  const players = data?.players || data?.lineup || [];
  return Array.isArray(players) ? players.map((entry: any) => entry?.player || entry) : [];
};

const TabLineups = ({ m }: { m: any }) => {
  const homePlayers: any[] = lineupPlayers(m?.lineups, 'home').length
    ? lineupPlayers(m?.lineups, 'home')
    : (m?.home_players || []);
  const awayPlayers: any[] = lineupPlayers(m?.lineups, 'away').length
    ? lineupPlayers(m?.lineups, 'away')
    : (m?.away_players || []);

  if (homePlayers.length === 0 && awayPlayers.length === 0) {
    return <Empty msg="Lineups not available yet" />;
  }

  return (
    <div className="px-4 py-4 space-y-3">
      {homePlayers.length > 0 && (
        <Sec title={`${m.home_team} — Featured`}>
          <div className="flex flex-wrap gap-3 justify-center">
            {homePlayers.map((p: any, i: number) => <PlayerDot key={i} player={p} side="home" />)}
          </div>
        </Sec>
      )}
      {awayPlayers.length > 0 && (
        <Sec title={`${m.away_team} — Featured`}>
          <div className="flex flex-wrap gap-3 justify-center">
            {awayPlayers.map((p: any, i: number) => <PlayerDot key={i} player={p} side="away" />)}
          </div>
        </Sec>
      )}
    </div>
  );
};

export default TabLineups;
