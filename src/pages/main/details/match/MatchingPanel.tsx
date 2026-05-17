import { Sec, fmtTime, isLive } from './shared';

interface MatchingPanelProps {
  m: any;
  candidates: any[];
  loading: boolean;
  matching: string | null;
  onLoad: () => void;
  onSelect: (candidate: any) => void;
}

const MatchingPanel = ({ m, candidates, loading, matching, onLoad, onSelect }: MatchingPanelProps) => (
  <Sec title={m.sofascore_id ? 'SofaScore Match' : 'Match Required'}>
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className={m.sofascore_id ? 'text-sm font-semibold text-emerald-400' : 'text-sm font-semibold text-yellow-400'}>
            {m.sofascore_id ? `Matched: ${m.sofascore_name || m.sofascore_id}` : 'Not matched to SofaScore'}
          </div>
          <div className="text-[11px] text-gray-600 mt-0.5">
            {isLive(m)
              ? 'Live SportyBet match: showing all live SofaScore matches.'
              : 'Prematch SportyBet match: showing all scheduled SofaScore matches for this date.'}
          </div>
        </div>
        <button
          onClick={onLoad}
          disabled={loading}
          className="shrink-0 px-3 py-2 rounded-lg text-xs font-semibold border border-white/10 text-gray-300 hover:border-emerald-500/40 hover:text-emerald-400 disabled:opacity-40"
        >
          {loading ? 'Scanning...' : m.sofascore_id ? 'Correct' : 'Find'}
        </button>
      </div>

      {candidates.length > 0 && (
        <div className="space-y-2">
          <div className="text-[11px] text-gray-600">{candidates.length} SofaScore matches loaded. Select the correct one.</div>
          {candidates.map((c: any) => (
            <button
              key={c.id}
              onClick={() => onSelect(c)}
              disabled={!!matching}
              className="w-full text-left rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-2.5 hover:border-emerald-500/40 disabled:opacity-50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{c.name}</div>
                  <div className="text-[11px] text-gray-600 truncate">{c.tournament || 'SofaScore'} · {c.status || 'scheduled'}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-bold text-emerald-400">{c.scoreline || `${Math.round((c.score || 0) * 100)}%`}</div>
                  <div className="text-[10px] text-gray-600">{matching === String(c.id) ? 'Saving...' : fmtTime(c.start_timestamp)}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  </Sec>
);

export default MatchingPanel;
