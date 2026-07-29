import { useEffect, useMemo, useState } from 'react';
import { IonContent, IonPage, IonRefresher, IonRefresherContent, useIonRouter } from '@ionic/react';
import { useParams } from 'react-router';
import { usePredictionStore } from '../../../../prediction/usePredictionStore';
import { MatchSignal } from '../../../../prediction/engine';
import { refreshPredictions } from '../../../../services/apis/footballApi';
import { getValueHunterContext as getLocalValueHunterContext } from '../../../../prediction/engineLearning';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const confidenceDot = (c: MatchSignal['confidence']) =>
  c === 'high' ? 'bg-emerald-500' : c === 'medium' ? 'bg-yellow-500' : 'bg-gray-500';

const tipBadge = (type: MatchSignal['signalType']) => {
  switch (type) {
    case 'value_bet':       return { label: '💰 Value Tip',    cls: 'text-yellow-400 border-yellow-700' };
    case 'high_confidence': return { label: '🔥 Strong Pick',  cls: 'text-emerald-400 border-emerald-700' };
    case 'form_signal':     return { label: '📈 Form Pick',    cls: 'text-purple-400 border-purple-700' };
    case 'sharp_move':      return { label: '📊 Market Move',  cls: 'text-red-400 border-red-700' };
    default:                return { label: '💡 Suggestion',   cls: 'text-blue-400 border-blue-700' };
  }
};

const statusStyle = (s: MatchSignal['status']) => {
  if (s === 'accepted') return 'border-emerald-700 bg-emerald-900/20';
  if (s === 'rejected') return 'border-white/[0.04] opacity-40';
  return 'border-white/[0.07]';
};

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

const PRE_MATCH_ONLY_ENGINES = new Set(['value_hunter', 'away_value']);

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

// ─── Tip card ─────────────────────────────────────────────────────────────────

function TipCard({ signal }: { signal: MatchSignal & { correlated?: boolean; correlationReason?: string } }) {
  const router = useIonRouter();
  const { acceptSignal, rejectSignal, undoReject } = usePredictionStore();
  const [expanded, setExpanded] = useState(false);
  const badge = tipBadge(signal.signalType);
  const cardStyle = signal.correlated ? 'opacity-60 border-orange-500/20' : statusStyle(signal.status);
  const confPct = Math.round(signal.modelProbability * 100);

  // Human-readable reasoning per tip type
  const reasoning = () => {
    if (signal.signalType === 'value_bet')
      return `Our analysts rate this at ${confPct}% — the odds on offer look better than the true chance suggests.`;
    if (signal.signalType === 'high_confidence')
      return `Strong agreement across multiple indicators puts this at ${confPct}% confidence.`;
    if (signal.signalType === 'form_signal')
      return `Recent form and momentum point in this direction.`;
    return `This pick matches the ${signal.engineName} criteria based on current match data.`;
  };

  return (
    <div className={`border rounded-xl overflow-hidden mb-2.5 bg-[#161616] transition-all ${cardStyle}`}>
      {signal.correlated && (
        <div className="px-3 py-1 bg-orange-900/30 border-b border-orange-500/20 flex items-center gap-1.5">
          <span className="text-[9px] font-bold text-orange-400 uppercase tracking-wide">Similar tip already added</span>
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
              <span className="text-[10px] text-gray-500">{signal.tournament}</span>
            </div>
            <div className="text-sm font-semibold text-white truncate">{signal.homeTeam} vs {signal.awayTeam}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] text-gray-500">{String(signal.market).replace(/_/g, ' ')}</span>
              <span className="text-[11px] text-white font-bold">→ {signal.pick}</span>
            </div>
            {signal.note && (
              <div className="text-[10px] text-slate-400 mt-0.5 italic">"{signal.note}"</div>
            )}
          </div>

          <div className="text-right shrink-0">
            <div className="flex items-center justify-end gap-1 mt-0.5">
              <div className={`w-2 h-2 rounded-full ${confidenceDot(signal.confidence)}`} />
              <span className="text-sm font-bold text-white">{confPct}%</span>
            </div>
            <div className="text-[10px] text-gray-500 mt-0.5">confidence</div>
          </div>
        </div>

        <div className="flex items-center justify-end mt-2">
          <span className="text-[10px] text-gray-600">{expanded ? 'Less ▲' : 'Why? ▼'}</span>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/[0.06] px-3 py-3 space-y-3">
          {/* Human reasoning */}
          <div className="bg-black/20 rounded-lg p-3 text-xs text-slate-300 leading-5">
            {reasoning()}
          </div>

          {/* Confidence breakdown */}
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-black/30 rounded-lg p-2">
              <div className="text-[10px] text-gray-500">Our Rating</div>
              <div className="text-sm font-bold text-white">{confPct}%</div>
            </div>
            <div className="bg-black/30 rounded-lg p-2">
              <div className="text-[10px] text-gray-500">Strength</div>
              <div className={`text-sm font-bold ${signal.confidence === 'high' ? 'text-emerald-400' : signal.confidence === 'medium' ? 'text-yellow-400' : 'text-gray-400'}`}>
                {signal.confidence === 'high' ? 'Strong' : signal.confidence === 'medium' ? 'Moderate' : 'Speculative'}
              </div>
            </div>
          </div>

          {/* Actions */}
          {signal.status === 'pending' && (
            <div className="flex gap-2">
              <button
                onClick={() => rejectSignal(signal.matchId, signal.engineId, signal.market)}
                className="flex-1 py-2 rounded-lg border border-red-800 text-red-400 text-xs font-semibold hover:bg-red-900/30 transition"
              >
                Skip
              </button>
              <button
                onClick={() => router.push(`/match/${signal.matchId}`, 'forward', 'push')}
                className="flex-1 py-2 rounded-lg border border-white/[0.1] text-gray-400 text-xs hover:bg-white/5 transition"
              >
                View Match
              </button>
              <button
                onClick={() => acceptSignal(signal.matchId, signal.engineId, signal.market)}
                className="flex-1 py-2 rounded-lg border border-emerald-700 text-emerald-400 text-xs font-semibold hover:bg-emerald-900/30 transition"
              >
                Add Tip
              </button>
            </div>
          )}
          {signal.status === 'accepted' && (
            <div className="flex gap-2">
              <div className="flex-1 py-2 rounded-lg bg-emerald-900/30 border border-emerald-700 text-emerald-400 text-xs text-center font-semibold">
                ✓ Added to your tips
              </div>
              <button
                onClick={() => router.push(`/match/${signal.matchId}`, 'forward', 'push')}
                className="flex-1 py-2 rounded-lg border border-white/[0.1] text-gray-400 text-xs hover:bg-white/5 transition"
              >
                View Match
              </button>
            </div>
          )}
          {signal.status === 'rejected' && (
            <div className="flex gap-2">
              <div className="flex-1 py-2 rounded-lg border border-white/[0.06] text-gray-600 text-xs text-center">Skipped</div>
              <button
                onClick={() => undoReject(signal.matchId, signal.engineId, signal.market)}
                className="flex-1 py-2 rounded-lg border border-yellow-700 text-yellow-400 text-xs font-semibold hover:bg-yellow-900/30 transition"
              >
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

type SortMode = 'confidence' | 'odds' | 'time';
type StatusFilter = 'all' | 'pending' | 'accepted' | 'rejected';

function EngineSignals() {
  const { id: engineId } = useParams<{ id: string }>();
  const router = useIonRouter();
  const { engines, refreshEngineLearning, loadBackendPredictions, backendPredictions } = usePredictionStore();

  const [sort, setSort] = useState<SortMode>('confidence');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const engine = useMemo(() => engines.find(e => e.id === engineId), [engines, engineId]);

  useEffect(() => { refreshEngineLearning(); }, [refreshEngineLearning]);

  const fetchPreds = async () => {
    setLoading(true);
    try { await loadBackendPredictions(); } catch {} finally { setLoading(false); }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try { await refreshPredictions(); await loadBackendPredictions(); } catch {} finally { setRefreshing(false); }
  };

  useEffect(() => { fetchPreds(); }, []);

  const engineSignals = useMemo(() => {
    if (!engine) return [];
    const allowedTypes = ENGINE_PICK_TYPES[engineId] || [];
    const preMatchOnly = PRE_MATCH_ONLY_ENGINES.has(engineId);
    const signals: MatchSignal[] = [];
    for (const pred of backendPredictions) {
      if (preMatchOnly && (pred.is_live || pred.is_finished)) continue;
      for (const pick of (pred.picks || [])) {
        const matchesEngine = allowedTypes.length === 0 || allowedTypes.includes(pick.type);
        if (!matchesEngine || pick.type === 'no_bet') continue;
        signals.push(backendPickToSignal(pred, pick, engineId, engine.name, engine.icon));
      }
    }
    return signals;
  }, [backendPredictions, engineId, engine]);

  const filtered = useMemo(() => {
    let list = engineSignals;
    if (statusFilter !== 'all') list = list.filter(s => s.status === statusFilter);
    switch (sort) {
      case 'confidence': return [...list].sort((a, b) => b.modelProbability - a.modelProbability);
      case 'odds':       return [...list].sort((a, b) => b.odds - a.odds);
      case 'time':       return [...list].sort((a, b) => (a.startTime || 0) - (b.startTime || 0));
      default:           return list;
    }
  }, [engineSignals, sort, statusFilter]);

  const grouped = useMemo(() => {
    const map: Record<string, MatchSignal[]> = {};
    for (const s of filtered) {
      if (!map[s.tournament]) map[s.tournament] = [];
      map[s.tournament].push(s);
    }
    return map;
  }, [filtered]);

  const pendingCount  = engineSignals.filter(s => s.status === 'pending').length;
  const acceptedCount = engineSignals.filter(s => s.status === 'accepted').length;
  const highConfCount = engineSignals.filter(s => s.signalType === 'high_confidence').length;
  const valueCount    = engineSignals.filter(s => s.signalType === 'value_bet').length;

  const statusTabs: { id: StatusFilter; label: string; count: number }[] = [
    { id: 'pending',  label: 'New Tips',    count: pendingCount },
    { id: 'accepted', label: '✓ Added',     count: acceptedCount },
    { id: 'rejected', label: 'Skipped',     count: engineSignals.filter(s => s.status === 'rejected').length },
    { id: 'all',      label: 'All',         count: engineSignals.length },
  ];

  const sortOptions: { id: SortMode; label: string }[] = [
    { id: 'confidence', label: 'Confidence' },
    { id: 'odds',       label: 'Odds' },
    { id: 'time',       label: 'Kick-off' },
  ];

  if (!engine) {
    return (
      <IonPage>
        <IonContent>
          <div className="flex items-center justify-center h-full text-sm text-gray-500 bg-[#0f0f0f]">Tipster not found</div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonContent style={{ '--background': '#0f0f0f' } as any} fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={async e => {
          try { await loadBackendPredictions(); } catch {} finally { e.detail.complete(); }
        }}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="min-h-full bg-[#0f0f0f] text-white pb-8">
          {/* Header */}
          <div className="sticky top-0 z-20 bg-[#0f0f0f]/95 border-b border-white/[0.06] px-4 py-3 backdrop-blur flex items-center gap-3">
            <button onClick={() => router.goBack()} className="text-xs font-semibold text-gray-400 hover:text-white shrink-0">← Back</button>
            <span className="text-sm font-bold text-white truncate flex-1">{engine.icon} {engine.name}</span>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="shrink-0 px-2.5 py-1 rounded-lg border border-white/[0.1] text-[10px] font-semibold text-gray-400 hover:text-white transition disabled:opacity-40"
            >
              {refreshing ? 'Refreshing...' : '↻ Refresh'}
            </button>
            <button
              onClick={() => router.push(`/engine/${engine.id}/details`, 'forward', 'push')}
              className="shrink-0 px-2.5 py-1 rounded-lg border border-white/10 text-[10px] font-semibold text-gray-400 hover:text-white transition"
            >
              Track Record
            </button>
          </div>

          <div className="px-3 pt-4">
            {/* Tipster summary card */}
            <div className="bg-[#161616] border border-white/[0.07] rounded-xl p-3 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{engine.icon}</span>
                <div>
                  <div className="text-sm font-bold text-white">{engine.name}</div>
                  <div className="text-xs text-gray-400">{engine.description}</div>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  { label: 'Tips Today', value: engineSignals.length,  color: 'text-white' },
                  { label: '💰 Value',   value: valueCount,            color: 'text-yellow-400' },
                  { label: '🔥 Strong',  value: highConfCount,         color: 'text-emerald-400' },
                  { label: '✓ Added',    value: acceptedCount,         color: 'text-emerald-400' },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <div className={`text-lg font-bold ${color}`}>{value}</div>
                    <div className="text-[10px] text-gray-600">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Filters + sort */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex gap-1 overflow-x-auto scrollbar-hide">
                {statusTabs.map(tab => (
                  <button key={tab.id} onClick={() => setStatusFilter(tab.id)}
                    className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] border transition ${
                      statusFilter === tab.id
                        ? 'bg-white text-black border-white font-semibold'
                        : 'border-white/[0.1] text-gray-500'
                    }`}>
                    {tab.label}{tab.count > 0 && <span className="opacity-60 ml-1">({tab.count})</span>}
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
                <div className="text-2xl mb-2">{engine.icon}</div>
                Loading tips...
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center text-gray-600 text-xs mt-16">
                <div className="text-3xl mb-2">{engine.icon}</div>
                <div className="text-sm text-gray-500 mb-1">No tips right now</div>
                <div className="text-xs text-gray-600">
                  {statusFilter !== 'all'
                    ? `No ${statusFilter === 'pending' ? 'new' : statusFilter} tips. Try "All".`
                    : "This tipster hasn't found any qualifying matches today. Check back later."}
                </div>
              </div>
            ) : (
              Object.entries(grouped).map(([tournament, tips]) => (
                <div key={tournament} className="mb-4">
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide truncate">🏆 {tournament}</span>
                    <span className="text-xs text-gray-600 shrink-0">({tips.length})</span>
                  </div>
                  {tips.map((signal, i) => (
                    <TipCard key={`${signal.matchId}-${signal.market}-${i}`} signal={signal} />
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
