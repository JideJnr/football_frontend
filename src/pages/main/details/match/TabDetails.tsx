import { Sec, Row, MatchList, compactForm, fmtDateTime } from './shared';

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

    <MatchList title={`${m.home_team} Last Matches`} team={m.home_team} matches={m.home_last_matches || []} />
    <MatchList title={`${m.away_team} Last Matches`} team={m.away_team} matches={m.away_last_matches || []} />
  </div>
);

export default TabDetails;
