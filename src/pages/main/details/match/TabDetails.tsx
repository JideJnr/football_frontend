import { Sec, Row, MatchList, compactForm, fmtDateTime, val } from './shared';

const formatScore = (score: any) => {
  const home = score?.home ?? score?.homeScore ?? score?.home_score;
  const away = score?.away ?? score?.awayScore ?? score?.away_score;
  return home != null || away != null ? `${val(home, '0')}-${val(away, '0')}` : '';
};

const SourcePill = ({ ok, label }: { ok: boolean; label: string }) => (
  <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${
    ok ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400' : 'border-white/[0.07] bg-white/[0.03] text-gray-600'
  }`}>
    {ok ? 'OK' : 'MISS'} {label}
  </span>
);

const SportyEnrichment = ({ m }: { m: any }) => {
  const detail = m?.sportybet_detail || {};
  const sources = m?.data_sources || {};
  const sportySource = sources?.sportybet || {};
  const sofaSource = sources?.sofascore || {};
  const markets = detail.markets || m?.all_markets || m?.sportybet_markets || [];
  const odds = detail.odds_1x2 || m?.odds_1x2 || {};
  const score = formatScore(detail.score || m?.score);
  const refreshed = detail.refreshed_at || m?.sporty_refreshed_at;

  return (
    <Sec title="SportyBet Enrichment">
      <div className="flex flex-wrap gap-2">
        <SourcePill ok={!!(detail.id || m?.sportybet_id || m?.raw_sporty)} label="detail" />
        <SourcePill ok={!!markets.length} label="markets" />
        <SourcePill ok={!!sportySource.live_clock} label="clock" />
        <SourcePill ok={!!sofaSource.matched} label="sofa match" />
      </div>
      <Row label="Status" value={m?.sportybet_data_status || (detail.id ? 'available' : 'missing')} />
      <Row label="Markets" value={detail.market_count ?? sportySource.market_count ?? markets.length} />
      <Row label="Period" value={detail.period || m?.period} />
      <Row label="Clock" value={detail.played_seconds || m?.played_seconds} />
      <Row label="Score" value={score} />
      <Row label="Refreshed" value={refreshed ? fmtDateTime(refreshed) : ''} />
      {(odds.home || odds.draw || odds.away) && (
        <div className="grid grid-cols-3 gap-2 pt-1">
          {[['1', odds.home], ['X', odds.draw], ['2', odds.away]].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-center">
              <div className="text-[10px] text-gray-500">{label}</div>
              <div className="text-sm font-bold text-white">{val(value)}</div>
            </div>
          ))}
        </div>
      )}
    </Sec>
  );
};

const TabDetails = ({ m }: { m: any }) => (
  <div className="px-4 py-4 space-y-3">
    <Sec title="Team Comparison">
      <Row label="Home" value={m.home_team} color="text-emerald-400 font-semibold" />
      <Row label="Away" value={m.away_team} color="text-blue-400 font-semibold" />
      <Row label="Home form" value={compactForm(m.home_form)} />
      <Row label="Away form" value={compactForm(m.away_form)} />
      <Row label="Home position" value={m.home_position} />
      <Row label="Away position" value={m.away_position} />
      <Row label="Home rating" value={m.home_avg_rating} />
      <Row label="Away rating" value={m.away_avg_rating} />
    </Sec>

    <Sec title="Match Details">
      <Row label="Tournament" value={m.tournament} />
      <Row label="Category" value={m.category} />
      <Row label="Kickoff" value={fmtDateTime(m.start_time)} />
      {m.time_context?.start_local && (
        <Row label="Local kickoff" value={`${m.time_context.local_date} ${m.time_context.local_time} (${m.time_context.timezone})`} />
      )}
      {m.time_context?.start_utc && (
        <Row label="UTC kickoff" value={`${m.time_context.utc_date} ${m.time_context.utc_time}`} />
      )}
      <Row label="Venue" value={m.venue} />
      <Row label="SportyBet ID" value={m.sportybet_id} />
      <Row label="SofaScore ID" value={m.sofascore_id} />
    </Sec>

    <SportyEnrichment m={m} />

    <MatchList title={`${m.home_team} Last Matches`} team={m.home_team} matches={m.home_last_matches || []} />
    <MatchList title={`${m.away_team} Last Matches`} team={m.away_team} matches={m.away_last_matches || []} />
  </div>
);

export default TabDetails;
