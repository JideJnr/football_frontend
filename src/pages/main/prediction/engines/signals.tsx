import { useEffect, useMemo, useState } from 'react';
import { IonContent, IonPage, IonRefresher, IonRefresherContent, useIonRouter } from '@ionic/react';
import { useParams } from 'react-router';
import { usePredictionStore } from '../../../../prediction/usePredictionStore';
import { MatchSignal } from '../../../../prediction/engine';
import { getPredictionsToday, refreshPredictions } from '../../../../services/apis/footballApi';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtTime = (ms: number) =>
  ms ? new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

const edgeColor = (edge: number) =>
  edge > 0.1 ? 'text-emerald-400' : edge > 0 ? 'text-yellow-400' : 'text-red-400';

const confidenceDot = (c: MatchSignal['confidence']) =>
  c === 'high' ? 'bg-emerald-500' : c === 'medium' ? 'bg-yellow-500' : 'bg-gray-500';

const signalTypeBadge = (type: MatchSignal['signalType']) => {
  switch (type) {
    case 'value_bet':       return { label: '💰 VALUE',     cls: 'text-yellow-400 border-yellow-700' };
    case 'high_confidence': return { label: '🔥 HIGH CONF', cls: 'text-emerald-400 border-emerald-700' };
    case 'form_signal':     return { label: '📈 FORM',      cls: 'text-purple-400 border-purple-700' };
    case 'sharp_move':      return { label: '🔪 SHARP',     cls: 'text-red-400 border-red-700' };
    default:                return { label: '📡 SIGNAL',    cls: 'text-blue-400 border-blue-700' };
  }
};

const statusStyle = (s: MatchSignal['status']) => {
  if (s === 'accepted') return 'border-emerald-700 bg-emerald-900/20';
  if (s === 'rejected') return 'border-white/[0.04] opacity-40';
  return 'border-white/[0.07]';
};

// Map backend pick type → engine category
const ENGINE_PICK_TYPES: Record<string, string[]> = {
  value_hunter:       ['value_bet'],
  away_value:         ['value_bet'],
  over_specialist:    ['goals'],
  under_specialist:   ['goals'],
  gg_hunter:          ['goals'],
  btts_over:          ['goals'],
  safe_home:          ['match_result', 'double_chance'],
  draw_specialist:    ['match_result'],
  ht_specialist:      ['match_result'],
  clean_sheet_hunter: ['match_result'],
  form_momentum:      ['form_signal', 'market_value'],
  corners_hunter:     ['corners'],
  sharp_follower:     ['sharp_move'],
  drift_fader:        ['sharp_move'],
};

// Engines that should only show pre-match (not-started) signals
const PRE_MATCH_ONLY_ENGINES = new Set(['value_hunter', 'away_value']);

// Convert a backend prediction pick into a MatchSignal-like object
const backendPickToSignal = (pred: any, pick: any, engineId: string, engineName: string, engineIcon: string): MatchSignal & { correlated?: boolean; correlationReason?: string } => {
  const conf = parseInt(pick.confidence || 50) / 100;
  const signalType: MatchSignal['signalType'] =
    pick.type === 'value_bet' ? 'value_bet'
    : conf >= 0.65 ? 'high_confidence'
    : pick.type === 'form_signal' || pick.type === 'market_value' ? 'form_signal'
    : 'rule_match';
  return {
    matchId:            String(pred.match_id || ''),
    matchName:          pred.match_name || '',
    tournament:         pred.league_name || 'Unknown',
    startTime:          0,
    homeTeam:           (pred.match_name || '').split(' vs ')[0] || '',
    awayTeam:           (pred.match_name || '').split(' vs ')[1] || '',
    engineId,
    engineName,
    engineIcon,
    signalType,
    market:             pick.type || 'match_result',
    pick:               pick.selection || '',
    odds:               1.0,
    modelProbability:   conf,
    impliedProbability: conf,
    valueEdge:          0,
    confidence:         conf >= 0.65 ? 'high' : conf >= 0.50 ? 'medium' : 'low',
    status:             'pending',
    note:               pick.reason || undefined,
    correlated:         pred.correlated || false,
    correlationReason:  pred.correlation_reason || undefined,
  };
};

// ─── Signal card ──────────────────────────────────────────────────────────────

function SignalCard({ signal }: { signal: MatchSignal & { correlated?: boolean; correlationReason?: string } }) {
  const router = useIonRouter();
  const { acceptSignal, rejectSignal, undoReject } = usePredictionStore();
  const [expanded, setExpanded] = useState(false);
  const badge = signalTypeBadge(signal.signalType);
  const cardStyle = signal.correlated ? 'opacity-60 border-orange-500/20' : statusStyle(signal.status);

  return (
    <div className={`border rounded-xl overflow-hidden mb-2.5 bg-[#161616] transition-all ${cardStyle}`}>
      {signal.correlated && (
        <div className="px-3 py-1 bg-orange-900/30 border-b border-orange-500/20 flex items-center gap-1.5">
          <span className="text-[9px] font-bold text-orange-400 uppercase tracking-wide">Correlated</span>
          {signal.correlationReason && (
            <span className="text-[9px] text-orange-500/70 truncate">{signal.correlationReason}</span>
          )}
        </div>
      )}

      <div className="p-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${badge.cls}`}>{badge.label}</span>
              <span className="text-[10px] text-gray-600">{signal.tournament}</span>
            </div>
            <div className="text-sm font-semibold text-white truncate">{signal.homeTeam} vs {signal.awayTeam}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] text-gray-500">{signal.market}</span>
              <span className="text-[11px] text-white font-bold">Pick: {signal.pick}</span>
            </div>
            {signal.note && (
              <div className="text-[10px] text-purple-400 mt-0.5">{signal.note}</div>
            )}
          </div>

          <div className="text-right shrink-0">
            <div className="text-white font-bold text-lg tabular-nums">{signal.odds.toFixed(2)}</div>
            <div className="flex items-center justify-end gap-1 mt-0.5">
              <div className={`w-2 h-2 rounded-full ${confidenceDot(signal.confidence)}`} />
              <span className="text-[10px] text-gray-500">{(signal.modelProbability * 100).toFixed(0)}%</span>
            </div>
            <div className={`text-[10px] font-mono mt-0.5 ${edgeColor(signal.valueEdge)}`}>
              {signal.valueEdge > 0 ? '+' : ''}{(signal.valueEdge * 100).toFixed(1)}%
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-gray-600">{fmtTime(signal.startTime)}</span>
          <span className="text-[10px] text-gray-600">{expanded ? 'Less' : 'More'}</span>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/[0.06] px-3 py-3 space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: 'Model', value: `${(signal.modelProbability * 100).toFixed(1)}%`, color: 'text-white' },
              { label: 'Implied', value: `${(signal.impliedProbability * 100).toFixed(1)}%`, color: 'text-gray-400' },
              { label: 'Edge', value: `${signal.valueEdge > 0 ? '+' : ''}${(signal.valueEdge * 100).toFixed(1)}%`, color: edgeColor(signal.valueEdge) },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-black/30 rounded-lg p-2">
                <div className="text-[10px] text-gray-500">{label}</div>
                <div className={`text-sm font-bold ${color}`}>{value}</div>
              </div>
            ))}
          </div>

          <div className="bg-black/20 rounded-lg p-2 text-xs text-gray-400">
            {signal.signalType === 'value_bet' && (
              <span>Model gives <span className="text-white">{(signal.modelProbability * 100).toFixed(0)}%</span> while the market implies <span className="text-white">{(signal.impliedProbability * 100).toFixed(0)}%</span>, creating <span className="text-yellow-400">{((signal.modelProbability - signal.impliedProbability) * 100).toFixed(1)}% edge</span>.</span>
            )}
            {signal.signalType === 'high_confidence' && (
              <span>Model is <span className="text-emerald-400">{(signal.modelProbability * 100).toFixed(0)}% confident</span> in this outcome.</span>
            )}
            {signal.signalType === 'form_signal' && (
              <span>Recent form supports this side, marked as a <span className="text-purple-400">momentum pick</span>.</span>
            )}
            {signal.signalType === 'rule_match' && (
              <span>Matches the <span className="text-blue-400">{signal.engineName}</span> rule criteria.</span>
            )}
          </div>

          {signal.status === 'pending' && (
            <div className="flex gap-2">
              <button onClick={() => rejectSignal(signal.matchId, signal.engineId, signal.market)}
                className="flex-1 py-2 rounded-lg border border-red-800 text-red-400 text-xs font-semibold hover:bg-red-900/30 transition">
                Skip
              </button>
              <button onClick={() => router.push(`/match/${signal.matchId}`, 'forward', 'push')}
                className="flex-1 py-2 rounded-lg border border-white/[0.1] text-gray-400 text-xs hover:bg-white/5 transition">
                Details
              </button>
              <button onClick={() => acceptSignal(signal.matchId, signal.engineId, signal.market)}
                className="flex-1 py-2 rounded-lg border border-emerald-700 text-emerald-400 text-xs font-semibold hover:bg-emerald-900/30 transition">
                Add Pick
              </button>
            </div>
          )}
          {signal.status === 'accepted' && (
            <div className="flex gap-2">
              <div className="flex-1 py-2 rounded-lg bg-emerald-900/30 border border-emerald-700 text-emerald-400 text-xs text-center font-semibold">In Your Picks</div>
              <button onClick={() => router.push(`/match/${signal.matchId}`, 'forward', 'push')}
                className="flex-1 py-2 rounded-lg border border-white/[0.1] text-gray-400 text-xs hover:bg-white/5 transition">
                Details
              </button>
            </div>
          )}
          {signal.status === 'rejected' && (
            <div className="flex gap-2">
              <div className="flex-1 py-2 rounded-lg border border-white/[0.06] text-gray-600 text-xs text-center">Skipped</div>
              <button onClick={() => undoReject(signal.matchId, signal.engineId, signal.market)}
                className="flex-1 py-2 rounded-lg border border-yellow-700 text-yellow-400 text-xs font-semibold hover:bg-yellow-900/30 transition">
                Restore
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
// ─── Page ─────────────────────────────────────────────────────────────────────

type SortMode = 'edge' | 'odds' | 'time' | 'confidence';
type StatusFilter = 'all' | 'pending' | 'accepted' | 'rejected';

function EngineSignals() {
  const { id: engineId } = useParams<{ id: string }>();
  const router = useIonRouter();
  const { engines } = usePredictionStore();

  const [sort, setSort] = useState<SortMode>('confidence');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [backendPreds, setBackendPreds] = useState<any[]>([]);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const engine = useMemo(() => engines.find(e => e.id === engineId), [engines, engineId]);

  const fetchPreds = async () => {
    setLoading(true);
    try {
      const res = await getPredictionsToday();
      setBackendPreds(res.predictions || []);
      setPortfolio(res.portfolio || null);
    } catch {
      setBackendPreds([]);
      setPortfolio(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshPredictions();
      await fetchPreds();
    } catch {
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchPreds(); }, []);

  // Convert backend predictions to signals for this engine
  const engineSignals = useMemo(() => {
    if (!engine) return [];
    const allowedTypes = ENGINE_PICK_TYPES[engineId] || [];
    const preMatchOnly = PRE_MATCH_ONLY_ENGINES.has(engineId);
    const signals: MatchSignal[] = [];
    for (const pred of backendPreds) {
      // For value_hunter (and similar engines), skip matches that have already kicked off
      if (preMatchOnly && (pred.is_live || pred.is_finished)) continue;

      const picks: any[] = pred.picks || [];
      for (const pick of picks) {
        // For 'all' engines show all picks; for specific engines filter by pick type
        const matchesEngine = allowedTypes.length === 0 || allowedTypes.includes(pick.type);
        if (!matchesEngine) continue;
        if (pick.type === 'no_bet') continue;
        signals.push(backendPickToSignal(pred, pick, engineId, engine.name, engine.icon));
      }
    }
    return signals;
  }, [backendPreds, engineId, engine]);

  const filtered = useMemo(() => {
    let list = engineSignals;
    if (statusFilter !== 'all') list = list.filter(s => s.status === statusFilter);
    switch (sort) {
      case 'edge':       return [...list].sort((a, b) => b.valueEdge - a.valueEdge);
      case 'odds':       return [...list].sort((a, b) => b.odds - a.odds);
      case 'time':       return [...list].sort((a, b) => (a.startTime || 0) - (b.startTime || 0));
      case 'confidence': return [...list].sort((a, b) => b.modelProbability - a.modelProbability);
      default:           return list;
    }
  }, [engineSignals, sort, statusFilter]);

  // Group by tournament
  const grouped = useMemo(() => {
    const map: Record<string, MatchSignal[]> = {};
    for (const s of filtered) {
      if (!map[s.tournament]) map[s.tournament] = [];
      map[s.tournament].push(s);
    }
    return map;
  }, [filtered]);

  const pendingCount   = engineSignals.filter(s => s.status === 'pending').length;
  const acceptedCount  = engineSignals.filter(s => s.status === 'accepted').length;
  const rejectedCount  = engineSignals.filter(s => s.status === 'rejected').length;
  const valueCount     = engineSignals.filter(s => s.signalType === 'value_bet').length;
  const highConfCount  = engineSignals.filter(s => s.signalType === 'high_confidence').length;

  const statusTabs: { id: StatusFilter; label: string; count: number }[] = [
    { id: 'pending',  label: 'Pending',  count: pendingCount },
    { id: 'accepted', label: '✓ Added',  count: acceptedCount },
    { id: 'rejected', label: '↩ Skipped', count: rejectedCount },
    { id: 'all',      label: 'All',      count: engineSignals.length },
  ];

  const sortOptions: { id: SortMode; label: string }[] = [
    { id: 'edge',       label: 'Edge' },
    { id: 'confidence', label: 'Prob' },
    { id: 'odds',       label: 'Odds' },
    { id: 'time',       label: 'Time' },
  ];

  if (!engine) {
    return (
      <IonPage>
        <IonContent>
          <div className="flex items-center justify-center h-full text-sm text-gray-500 bg-[#0f0f0f]">Engine not found</div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonContent style={{ '--background': '#0f0f0f' } as any} fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={async e => {
          try {
            const res = await getPredictionsToday();
            setBackendPreds(res.predictions || []);
          } catch {} finally { e.detail.complete(); }
        }}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="min-h-full bg-[#0f0f0f] text-white pb-8">
          {/* Back bar */}
          <div className="sticky top-0 z-20 bg-[#0f0f0f]/95 border-b border-white/[0.06] px-4 py-3 backdrop-blur flex items-center gap-3">
            <button onClick={() => router.goBack()} className="text-xs font-semibold text-gray-400 hover:text-white shrink-0">← Back</button>
            <span className="text-sm font-bold text-white truncate flex-1">{engine.icon} {engine.name}</span>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="shrink-0 px-2.5 py-1 rounded-lg border border-white/[0.1] text-[10px] font-semibold text-gray-400 hover:text-white hover:border-emerald-500/40 transition disabled:opacity-40"
            >
              {refreshing ? '⏳ Running...' : '🔄 Re-run'}
            </button>
          </div>

          <div className="px-3 pt-4">
            {/* Engine summary */}
            <div className="bg-[#161616] border border-white/[0.07] rounded-xl p-3 mb-4">
              <div className="text-xs text-gray-400 mb-2">{engine.description}</div>
              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  { label: 'Total',    value: engineSignals.length,                                    color: 'text-white' },
                  { label: '💰 Value', value: valueCount,                                              color: 'text-yellow-400' },
                  { label: '🔥 High',  value: highConfCount,                                           color: 'text-emerald-400' },
                  { label: '✓ Added',  value: acceptedCount,                                           color: 'text-emerald-400' },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <div className={`text-lg font-bold ${color}`}>{value}</div>
                    <div className="text-[10px] text-gray-600">{label}</div>
                  </div>
                ))}
              </div>
              {/* Portfolio diversity strip */}
              {portfolio && portfolio.filtered_out > 0 && (
                <div className="mt-2.5 pt-2.5 border-t border-white/[0.06] flex items-center justify-between">
                  <span className="text-[10px] text-gray-500">
                    Portfolio: <span className="text-white font-semibold">{portfolio.accepted}</span> active
                    <span className="text-orange-400 ml-1">· {portfolio.filtered_out} correlated</span>
                  </span>
                  <span className="text-[10px] text-gray-600">
                    {Object.keys(portfolio.by_direction || {}).length} directions
                    · {Object.keys(portfolio.by_league || {}).length} leagues
                  </span>
                </div>
              )}
            </div>

            {/* Status filter + sort */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex gap-1 overflow-x-auto scrollbar-hide">
                {statusTabs.map(tab => (
                  <button key={tab.id} onClick={() => setStatusFilter(tab.id)}
                    className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] border transition ${
                      statusFilter === tab.id
                        ? 'bg-white text-black border-white font-semibold'
                        : 'border-white/[0.1] text-gray-500'
                    }`}>
                    {tab.label} {tab.count > 0 && <span className="opacity-60">({tab.count})</span>}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 shrink-0">
                {sortOptions.map(opt => (
                  <button key={opt.id} onClick={() => setSort(opt.id)}
                    className={`px-2 py-1 rounded text-[10px] border transition ${
                      sort === opt.id ? 'bg-white/10 text-white border-white/20' : 'border-white/[0.06] text-gray-600'
                    }`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            {loading ? (
              <div className="text-center text-gray-500 text-xs mt-16">
                <div className="text-2xl mb-2">⚙️</div>
                Loading predictions...
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center text-gray-600 text-xs mt-16">
                <div className="text-3xl mb-2">{engine.icon}</div>
                <div className="text-sm text-gray-500 mb-1">No signals found</div>
                <div className="text-xs text-gray-600">
                  {!engine.enabled
                    ? 'This engine is disabled — enable it on the engines page'
                    : statusFilter !== 'all'
                    ? `No ${statusFilter} signals. Try "All" filter.`
                    : 'No matches met this engine\'s criteria today. Try loosening the rules.'}
                </div>
              </div>
            ) : (
              Object.entries(grouped).map(([tournament, tournamentSignals]) => (
                <div key={tournament} className="mb-4">
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide truncate">🏆 {tournament}</span>
                    <span className="text-xs text-gray-600 shrink-0">({tournamentSignals.length})</span>
                  </div>
                  {tournamentSignals.map((signal, i) => (
                    <SignalCard key={`${signal.matchId}-${signal.market}-${i}`} signal={signal} />
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}

export default EngineSignals;

