import { useEffect, useState, useMemo } from 'react';
import { IonContent, IonPage, useIonRouter } from '@ionic/react';
import { getPredictionHistory, saveBetbuilder } from '../../../../services/apis/footballApi';
import { useAuth } from '../../../../contexts/useAuthContext';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Pick {
  type: string;
  selection: string;
  confidence: number;
  reason: string;
}

interface Signal {
  name: string;
  value: any;
  impact: number;
}

interface Prediction {
  id: number;
  match_id: string;
  match_name: string;
  league_name: string;
  source: string;
  best_pick: Pick;
  picks: Pick[];
  signals: Signal[];
  created_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const confidenceColor = (c: number) =>
  c >= 70 ? 'text-green-400' : c >= 58 ? 'text-yellow-400' : 'text-red-400';

const confidenceBg = (c: number) =>
  c >= 70 ? 'bg-green-500' : c >= 58 ? 'bg-yellow-500' : 'bg-red-500';

const estimateOdds = (confidence: number) =>
  confidence > 0 ? Math.max(1.01, 1 / (confidence / 100)).toFixed(2) : '—';

const h2hFromSignals = (signals: Signal[]) =>
  signals.find(s => s.name === 'h2h_edge');

const formatTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleString([], {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
};

// ── Sub-components ────────────────────────────────────────────────────────────

const ConfidenceBar: React.FC<{ value: number }> = ({ value }) => (
  <div className="flex items-center gap-2 mt-1">
    <div className="flex-1 h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${confidenceBg(value)}`}
        style={{ width: `${value}%` }}
      />
    </div>
    <span className={`text-xs font-bold w-8 text-right ${confidenceColor(value)}`}>{value}%</span>
  </div>
);

const H2HBadge: React.FC<{ signal: Signal | undefined }> = ({ signal }) => {
  if (!signal) return null;
  const v = signal.value;
  if (typeof v !== 'object' || !v) return null;
  const { home_wins = 0, away_wins = 0, draws = 0, sample_size = 0 } = v;
  if (!sample_size) return null;
  return (
    <div className="flex items-center gap-1 mt-2 px-2 py-1 rounded bg-[#1a1a1a] border border-[#2a2a2a]">
      <span className="text-[10px] text-gray-500 mr-1">H2H</span>
      <span className="text-xs text-green-400 font-bold">{home_wins}W</span>
      <span className="text-[10px] text-gray-500">·</span>
      <span className="text-xs text-gray-400">{draws}D</span>
      <span className="text-[10px] text-gray-500">·</span>
      <span className="text-xs text-red-400 font-bold">{away_wins}L</span>
      <span className="text-[10px] text-gray-500 ml-1">({sample_size} games)</span>
    </div>
  );
};

const SignalRow: React.FC<{ signal: Signal }> = ({ signal }) => {
  const impact = signal.impact ?? 0;
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="text-gray-500 truncate flex-1">{signal.name.replace(/_/g, ' ')}</span>
      <span className={`font-bold shrink-0 ${impact > 0 ? 'text-green-400' : impact < 0 ? 'text-red-400' : 'text-gray-500'}`}>
        {impact > 0 ? `+${impact}` : impact}
      </span>
    </div>
  );
};

// ── Match Card ────────────────────────────────────────────────────────────────

const MatchCard: React.FC<{
  pred: Prediction;
  accepted: boolean | null;
  onAccept: () => void;
  onReject: () => void;
}> = ({ pred, accepted, onAccept, onReject }) => {
  const [expanded, setExpanded] = useState(false);
  const pick = pred.best_pick;
  const h2h = h2hFromSignals(pred.signals || []);
  const topSignals = (pred.signals || [])
    .filter(s => s.name !== 'ai_brain_review')
    .slice(0, 4);

  const decided = accepted !== null;

  return (
    <div
      className={`rounded-xl border transition-all mb-3 overflow-hidden ${
        accepted === true
          ? 'border-green-600 bg-green-950/30'
          : accepted === false
          ? 'border-[#2a2a2a] bg-[#111] opacity-50'
          : 'border-[#2a2a2a] bg-[#161616]'
      }`}
    >
      {/* Header */}
      <div
        className="px-4 pt-3 pb-2 cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-xs text-gray-500 truncate">{pred.league_name || '—'}</div>
            <div className="text-sm font-semibold text-white truncate mt-0.5">{pred.match_name || '—'}</div>
          </div>
          <div className="text-[10px] text-gray-600 shrink-0 mt-0.5">{formatTime(pred.created_at)}</div>
        </div>

        {/* Best pick */}
        {pick && (
          <div className="mt-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500 uppercase">{pick.type?.replace(/_/g, ' ')}</span>
              <span className="text-xs font-bold text-white flex-1 truncate">{pick.selection}</span>
              <span className="text-xs text-gray-400 shrink-0">~{estimateOdds(pick.confidence)}</span>
            </div>
            <ConfidenceBar value={pick.confidence} />
            <div className="text-[11px] text-gray-500 mt-1 line-clamp-2">{pick.reason}</div>
          </div>
        )}

        <H2HBadge signal={h2h} />

        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-gray-600">{expanded ? '▲ less' : '▼ signals'}</span>
          {accepted === true && <span className="text-[10px] text-green-400 font-bold">✓ Added</span>}
        </div>
      </div>

      {/* Expanded signals */}
      {expanded && (
        <div className="px-4 pb-3 border-t border-[#2a2a2a] pt-2 space-y-1">
          {topSignals.length > 0
            ? topSignals.map((s, i) => <SignalRow key={i} signal={s} />)
            : <div className="text-[11px] text-gray-600">No signals available</div>
          }
          {(pred.picks || []).length > 1 && (
            <div className="mt-2 pt-2 border-t border-[#2a2a2a]">
              <div className="text-[10px] text-gray-500 mb-1">Other picks</div>
              {pred.picks.slice(1).map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px] mb-0.5">
                  <span className="text-gray-600 w-20 shrink-0 truncate">{p.type?.replace(/_/g, ' ')}</span>
                  <span className="flex-1 text-gray-400 truncate">{p.selection}</span>
                  <span className={`shrink-0 font-bold ${confidenceColor(p.confidence)}`}>{p.confidence}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      {!decided && (
        <div className="flex border-t border-[#2a2a2a]">
          <button
            onClick={onReject}
            className="flex-1 py-2.5 text-xs text-red-400 hover:bg-red-950 transition font-semibold"
          >
            ✕ Skip
          </button>
          <div className="w-px bg-[#2a2a2a]" />
          <button
            onClick={onAccept}
            className="flex-1 py-2.5 text-xs text-green-400 hover:bg-green-950 transition font-semibold"
          >
            ✓ Add to Slip
          </button>
        </div>
      )}
      {decided && accepted && (
        <button
          onClick={onReject}
          className="w-full py-2 text-[11px] text-gray-500 hover:text-red-400 border-t border-[#2a2a2a] transition"
        >
          Remove from slip
        </button>
      )}
    </div>
  );
};

// ── Bet Slip ──────────────────────────────────────────────────────────────────

const BetSlip: React.FC<{
  accepted: Prediction[];
  onEnd: () => void;
  saving: boolean;
}> = ({ accepted, onEnd, saving }) => {
  const combinedOdds = accepted.reduce((acc, p) => {
    const odds = parseFloat(estimateOdds(p.best_pick?.confidence ?? 50));
    return acc * (isNaN(odds) ? 1 : odds);
  }, 1);

  const avgConf = accepted.length
    ? Math.round(accepted.reduce((a, p) => a + (p.best_pick?.confidence ?? 50), 0) / accepted.length)
    : 0;

  return (
    <div className="border-t border-[#2a2a2a] bg-[#0d0d0d] px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-400 font-semibold">
          Bet Slip ({accepted.length} {accepted.length === 1 ? 'pick' : 'picks'})
        </span>
        {accepted.length > 0 && (
          <div className="flex items-center gap-3 text-xs">
            <span className="text-gray-500">Combined odds</span>
            <span className="text-white font-bold">{combinedOdds.toFixed(2)}</span>
            <span className={`font-bold ${confidenceColor(avgConf)}`}>{avgConf}% avg</span>
          </div>
        )}
      </div>

      {accepted.length === 0 ? (
        <div className="text-[11px] text-gray-600 text-center py-1">Add picks to build your slip</div>
      ) : (
        <div className="flex flex-wrap gap-1 mb-2">
          {accepted.map(p => (
            <span key={p.id} className="text-[10px] bg-green-900 text-green-300 px-2 py-0.5 rounded-full truncate max-w-[140px]">
              {p.match_name?.split(' vs ')[0] || p.match_id} — {p.best_pick?.selection}
            </span>
          ))}
        </div>
      )}

      <button
        onClick={onEnd}
        disabled={accepted.length === 0 || saving}
        className="w-full py-3 rounded-xl text-sm font-bold transition disabled:opacity-40 disabled:cursor-not-allowed bg-green-600 hover:bg-green-500 text-white"
      >
        {saving ? 'Saving…' : accepted.length === 0 ? 'Add picks first' : `End & Save Slip (${accepted.length})`}
      </button>
    </div>
  );
};

// ── Saved Slip View ───────────────────────────────────────────────────────────

const SavedSlipView: React.FC<{
  slip: any;
  user: any;
  onReset: () => void;
}> = ({ slip, user, onReset }) => {
  const router = useIonRouter();
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center">
      <div className="text-4xl mb-3">🎯</div>
      <div className="text-lg font-bold text-white mb-1">Slip Saved!</div>
      {user && (
        <div className="text-xs text-gray-500 mb-4">
          Saved for <span className="text-white">{user.firstName || user.email}</span>
        </div>
      )}
      <div className="w-full bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 mb-4 text-left">
        <div className="flex justify-between text-xs mb-3">
          <span className="text-gray-500">Slip ID</span>
          <span className="text-white font-mono">#{slip?.bet?.id ?? '—'}</span>
        </div>
        <div className="flex justify-between text-xs mb-3">
          <span className="text-gray-500">Picks</span>
          <span className="text-white">{slip?.bet?.selections?.length ?? 0}</span>
        </div>
        <div className="flex justify-between text-xs mb-3">
          <span className="text-gray-500">Combined Odds</span>
          <span className="text-white font-bold">{slip?.bet?.combined_odds ?? '—'}</span>
        </div>
        <div className="flex justify-between text-xs mb-4">
          <span className="text-gray-500">Avg Confidence</span>
          <span className={`font-bold ${confidenceColor(slip?.bet?.confidence ?? 0)}`}>
            {slip?.bet?.confidence ?? 0}%
          </span>
        </div>
        <div className="border-t border-[#2a2a2a] pt-3 space-y-2">
          {(slip?.bet?.selections || []).map((s: any, i: number) => (
            <div key={i} className="text-xs">
              <div className="text-white font-semibold">{s.match}</div>
              <div className="text-gray-400">{s.selection} · odds {s.odds}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-3 w-full">
        <button
          onClick={onReset}
          className="flex-1 py-2.5 rounded-xl border border-[#2a2a2a] text-xs text-gray-400 hover:text-white transition"
        >
          Build Another
        </button>
        <button
          onClick={() => router.push('/home', 'back', 'pop')}
          className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-xs text-white font-bold transition"
        >
          Go Home
        </button>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────

const Builder = () => {
  const router = useIonRouter();
  const { user } = useAuth();

  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<Record<number, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [savedSlip, setSavedSlip] = useState<any>(null);
  const [filter, setFilter] = useState<'all' | 'high' | 'medium'>('all');

  useEffect(() => {
    setLoading(true);
    getPredictionHistory(200)
      .then(res => {
        const list: Prediction[] = res?.predictions ?? [];
        // deduplicate by match_id, keep latest
        const seen = new Set<string>();
        const deduped = list.filter(p => {
          if (seen.has(p.match_id)) return false;
          seen.add(p.match_id);
          return true;
        });
        setPredictions(deduped);
      })
      .catch(e => setError(e?.response?.data?.detail || 'Failed to load predictions'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return predictions.filter(p => {
      const c = p.best_pick?.confidence ?? 0;
      if (filter === 'high') return c >= 70;
      if (filter === 'medium') return c >= 58 && c < 70;
      return p.best_pick?.type !== 'no_bet';
    });
  }, [predictions, filter]);

  const accepted = useMemo(
    () => filtered.filter(p => decisions[p.id] === true),
    [filtered, decisions]
  );

  const handleAccept = (id: number) =>
    setDecisions(d => ({ ...d, [id]: true }));

  const handleReject = (id: number) =>
    setDecisions(d => ({ ...d, [id]: false }));

  const handleEnd = async () => {
    if (!accepted.length) return;
    setSaving(true);
    try {
      const selections = accepted.map(p => ({
        match_id: p.match_id,
        match: p.match_name,
        league: p.league_name,
        selection: p.best_pick?.selection,
        odds: parseFloat(estimateOdds(p.best_pick?.confidence ?? 50)),
        confidence: p.best_pick?.confidence,
        reason: p.best_pick?.reason,
      }));
      const res = await saveBetbuilder({ selections });
      setSavedSlip(res);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to save slip');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setDecisions({});
    setSavedSlip(null);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <IonPage>
      <div className="w-full h-full bg-[#111] text-white flex flex-col">

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1e1e1e] shrink-0">
          <button onClick={() => router.goBack()} className="text-gray-400 text-lg">←</button>
          <div className="flex-1">
            <div className="text-sm font-bold text-white">Bet Builder</div>
            {user && (
              <div className="text-[11px] text-gray-500">
                {user.firstName || user.email} · {accepted.length} selected
              </div>
            )}
          </div>
          <div className="text-xs text-gray-600">{filtered.length} matches</div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 px-3 py-2 border-b border-[#1e1e1e] shrink-0">
          {(['all', 'high', 'medium'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-xs border transition ${
                filter === f
                  ? 'border-white bg-white text-black font-semibold'
                  : 'border-[#333] text-gray-500 hover:text-white'
              }`}
            >
              {f === 'all' ? 'All' : f === 'high' ? '🔥 High (70%+)' : '⚡ Medium (58%+)'}
            </button>
          ))}
        </div>

        {/* Content */}
        {savedSlip ? (
          <SavedSlipView slip={savedSlip} user={user} onReset={handleReset} />
        ) : (
          <>
            <IonContent style={{ '--background': '#111' } as any} className="flex-1">
              <div className="px-3 py-3">
                {loading && (
                  <div className="text-center text-gray-500 text-xs mt-16">Loading predictions…</div>
                )}
                {error && (
                  <div className="text-center text-red-400 text-xs mt-10 px-4">{error}</div>
                )}
                {!loading && !error && filtered.length === 0 && (
                  <div className="text-center text-gray-600 text-xs mt-16">
                    No predictions found. Run predictions from the match detail page first.
                  </div>
                )}
                {!loading && filtered.map(pred => (
                  <MatchCard
                    key={pred.id}
                    pred={pred}
                    accepted={decisions[pred.id] ?? null}
                    onAccept={() => handleAccept(pred.id)}
                    onReject={() => handleReject(pred.id)}
                  />
                ))}
              </div>
            </IonContent>

            {/* Sticky bet slip */}
            <BetSlip accepted={accepted} onEnd={handleEnd} saving={saving} />
          </>
        )}
      </div>
    </IonPage>
  );
};

export default Builder;
