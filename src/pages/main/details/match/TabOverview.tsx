import { Sec, Row, ActionButton, fmtDateTime, val } from './shared';

interface TabOverviewProps {
  m: any;
  onEnrich: () => void;
  onPredict: () => void;
  enriching: boolean;
  predicting: boolean;
  actionMsg: string;
}

const TabOverview = ({ m, onEnrich, onPredict, enriching, predicting, actionMsg }: TabOverviewProps) => (
  <div className="px-4 py-4 space-y-3">
    {/* Action buttons */}
    <div className="flex gap-2">
      <ActionButton onClick={onEnrich} loading={enriching} label="⚡ Enrich" loadingLabel="Enriching…" />
      <ActionButton onClick={onPredict} loading={predicting} label="🔮 Predict" loadingLabel="Predicting…" variant="purple" />
    </div>
    {actionMsg && <div className="text-center text-xs text-emerald-400">{actionMsg}</div>}

    {/* Match info */}
    <Sec title="Match Info">
      <Row label="Tournament" value={m.tournament} />
      <Row label="Kickoff" value={fmtDateTime(m.start_time)} />
      {m.time_context?.start_local && (
        <Row label="Local kickoff" value={`${m.time_context.local_date} ${m.time_context.local_time} (${m.time_context.timezone})`} color="text-emerald-400" />
      )}
      {m.time_context?.start_utc && (
        <Row label="UTC kickoff" value={`${m.time_context.utc_date} ${m.time_context.utc_time}`} color="text-gray-400" />
      )}
      {m.venue && <Row label="Venue" value={m.venue} />}
      {m.home_manager && <Row label="Home Manager" value={m.home_manager} />}
      {m.away_manager && <Row label="Away Manager" value={m.away_manager} />}
      <Row label="Sofascore" value={m.sofascore_id ? '✓ Matched' : '✗ Not matched'} color={m.sofascore_id ? 'text-emerald-400' : 'text-gray-600'} />
      {m.enriched_at && (
        <Row label="Last enriched" value={new Date(m.enriched_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} color="text-gray-500" />
      )}
    </Sec>

    {/* Enrichment status */}
    {(m.sofascore_id || m.web_context?.query || m.enriched_at) && (
      <Sec title="Enrichment Status">
        <Row
          label="SofaScore detail"
          value={m.sofascore_id ? 'Pulled from saved match' : 'Not matched'}
          color={m.sofascore_id ? 'text-emerald-400' : 'text-gray-600'}
        />
        <Row
          label="DuckDuckGo"
          value={m.web_context?.query
            ? (m.web_context?.snippets?.length ? `${m.web_context.snippets.length} snippets` : 'Searched, no snippets')
            : 'Not searched'}
          color={m.web_context?.query ? 'text-emerald-400' : 'text-gray-600'}
        />
        {m.web_context?.query && <Row label="Search query" value={m.web_context.query} color="text-gray-400 text-xs" />}
        {m.enriched_at && (
          <Row label="Updated" value={new Date(m.enriched_at).toLocaleString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} color="text-gray-500" />
        )}
      </Sec>
    )}

    {/* Match incidents */}
    {m.incidents?.length > 0 && (
      <Sec title="Match Events">
        <div className="space-y-1.5">
          {m.incidents.map((inc: any, i: number) => {
            const type = (inc?.incidentType || inc?.type || '').toLowerCase();
            const icon = type.includes('goal') ? '⚽' : type.includes('red') ? '🟥' : type.includes('card') ? '🟨' : type.includes('sub') ? '🔄' : '•';
            const time = inc?.time ?? inc?.minute;
            const player = inc?.player?.name ?? inc?.playerName ?? inc?.description ?? '';
            const side = inc?.isHome ? m.home_team : m.away_team;
            return (
              <div key={i} className="flex items-center gap-2 text-xs py-1 border-b border-white/[0.04] last:border-0">
                <span className="text-gray-600 w-8 shrink-0 tabular-nums">{time ? `${time}'` : '—'}</span>
                <span>{icon}</span>
                <span className="text-gray-300 flex-1 truncate">{player}</span>
                <span className="text-gray-600 shrink-0 truncate max-w-[80px]">{side}</span>
              </div>
            );
          })}
        </div>
      </Sec>
    )}

    {/* Web context snippets */}
    {m.web_context?.snippets?.length > 0 && (
      <Sec title="Context">
        <div className="space-y-2">
          {m.web_context.snippets.slice(0, 4).map((s: any, i: number) => (
            <p key={i} className="text-xs text-gray-500 leading-relaxed border-l-2 border-white/10 pl-2">
              {typeof s === 'string' ? s : s?.text ?? s?.snippet ?? JSON.stringify(s)}
            </p>
          ))}
        </div>
      </Sec>
    )}
  </div>
);

export default TabOverview;
