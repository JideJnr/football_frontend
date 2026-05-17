import { useEffect, useMemo, useState } from 'react';
import { IonContent, IonPage, IonRefresher, IonRefresherContent, useIonRouter } from '@ionic/react';
import { useFootballContext } from '../../../../contexts/useFootballContext';
import { usePredictionStore } from '../../../../prediction/usePredictionStore';
import { MatchSignal } from '../../../../prediction/engine';
import CustomHeader from '../../../../components/templates/header/header';

const formatTime = (ms: number) =>
  new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const formatDate = (ms: number) =>
  new Date(ms).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });

const signalColor = (type: MatchSignal['signalType']) => {
  if (type === 'value_bet') return 'text-yellow-400 border-yellow-600';
  if (type === 'high_confidence') return 'text-emerald-400 border-emerald-700';
  return 'text-blue-400 border-blue-700';
};

const signalLabel = (type: MatchSignal['signalType']) => {
  if (type === 'value_bet') return '💰 VALUE';
  if (type === 'high_confidence') return '🔥 HIGH CONF';
  return '📡 SIGNAL';
};

const confidenceDot = (c: MatchSignal['confidence']) => {
  if (c === 'high') return 'bg-emerald-500';
  if (c === 'medium') return 'bg-yellow-500';
  return 'bg-gray-500';
};

const edgeColor = (edge: number) => {
  if (edge > 0.1) return 'text-emerald-400';
  if (edge > 0) return 'text-yellow-400';
  return 'text-red-400';
};

type FilterTab = 'all' | 'value_bet' | 'high_confidence' | 'accepted' | 'rejected';

function Suggestions() {
  const router = useIonRouter();
  const { getTodayMatches, matches, loading } = useFootballContext();
  const { signals, acceptedPicks, runPredictions, acceptSignal, rejectSignal, undoReject, running } = usePredictionStore();

  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    getTodayMatches();
  }, []);

  useEffect(() => {
    if (matches && matches.length > 0) {
      runPredictions(matches);
    }
  }, [matches]);

  const refresh = async (e: CustomEvent) => {
    try {
      await getTodayMatches();
    } finally {
      e.detail.complete();
    }
  };

  const filtered = useMemo(() => {
    if (activeTab === 'accepted') return acceptedPicks;
    if (activeTab === 'rejected') return signals.filter((s) => s.status === 'rejected');
    if (activeTab === 'all') return signals.filter((s) => s.status !== 'rejected');
    return signals.filter((s) => s.signalType === activeTab && s.status !== 'rejected');
  }, [signals, acceptedPicks, activeTab]);

  // group by tournament
  const grouped = useMemo(() => {
    const map: Record<string, MatchSignal[]> = {};
    for (const s of filtered) {
      if (!map[s.tournament]) map[s.tournament] = [];
      map[s.tournament].push(s);
    }
    return map;
  }, [filtered]);

  const valueBetCount = signals.filter((s) => s.signalType === 'value_bet' && s.status !== 'rejected').length;
  const highConfCount = signals.filter((s) => s.signalType === 'high_confidence' && s.status !== 'rejected').length;
  const acceptedCount = acceptedPicks.filter((s) => s.status === 'accepted').length;
  const rejectedCount = signals.filter((s) => s.status === 'rejected').length;

  const tabs: { id: FilterTab; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: signals.filter((s) => s.status !== 'rejected').length },
    { id: 'value_bet', label: '💰 Value', count: valueBetCount },
    { id: 'high_confidence', label: '🔥 High', count: highConfCount },
    { id: 'accepted', label: '✅ Mine', count: acceptedCount },
    { id: 'rejected', label: '↩ Skipped', count: rejectedCount },
  ];

  const signalKey = (s: MatchSignal) => `${s.matchId}-${s.engineId}-${s.market}`;

  const renderSignalCard = (signal: MatchSignal) => {
    const key = signalKey(signal);
    const isExpanded = expandedId === key;
    const isAccepted = signal.status === 'accepted';

    return (
      <div
        key={key}
        className={`border rounded-lg overflow-hidden mb-2 transition-all ${
          isAccepted ? 'border-emerald-700 bg-[#0d1f0d]' : 'border-[#1e1e1e] bg-[#161616]'
        }`}
      >
        {/* Main row */}
        <div
          className="p-3 cursor-pointer"
          onClick={() => setExpandedId(isExpanded ? null : key)}
        >
          <div className="flex items-start justify-between gap-2">
            {/* Left: teams + pick */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${signalColor(signal.signalType)}`}>
                  {signalLabel(signal.signalType)}
                </span>
                <span className="text-[10px] text-gray-600">{signal.engineName}</span>
              </div>
              <div className="text-white text-sm font-semibold truncate">{signal.matchName}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-gray-400 text-xs">{signal.market}</span>
                <span className="text-white text-xs font-bold">→ {signal.pick}</span>
              </div>
            </div>

            {/* Right: odds + confidence */}
            <div className="text-right shrink-0">
              <div className="text-white font-bold text-lg">{signal.odds.toFixed(2)}</div>
              <div className="flex items-center justify-end gap-1 mt-0.5">
                <div className={`w-2 h-2 rounded-full ${confidenceDot(signal.confidence)}`} />
                <span className="text-[10px] text-gray-500">{(signal.modelProbability * 100).toFixed(0)}%</span>
              </div>
              <div className={`text-[10px] font-mono mt-0.5 ${edgeColor(signal.valueEdge)}`}>
                edge {signal.valueEdge > 0 ? '+' : ''}{(signal.valueEdge * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-gray-600">
              {formatDate(signal.startTime)} · {formatTime(signal.startTime)}
            </span>
            <span className="text-[10px] text-gray-600">{isExpanded ? '▲' : '▼'}</span>
          </div>
        </div>

        {/* Expanded detail */}
        {isExpanded && (
          <div className="border-t border-[#1e1e1e] px-3 py-3 space-y-3">
            {/* Probability breakdown */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-[#111] rounded p-2">
                <div className="text-[10px] text-gray-500">Model Prob</div>
                <div className="text-white font-bold text-sm">{(signal.modelProbability * 100).toFixed(1)}%</div>
              </div>
              <div className="bg-[#111] rounded p-2">
                <div className="text-[10px] text-gray-500">Implied Prob</div>
                <div className="text-white font-bold text-sm">{(signal.impliedProbability * 100).toFixed(1)}%</div>
              </div>
              <div className="bg-[#111] rounded p-2">
                <div className="text-[10px] text-gray-500">Value Edge</div>
                <div className={`font-bold text-sm ${edgeColor(signal.valueEdge)}`}>
                  {signal.valueEdge > 0 ? '+' : ''}{(signal.valueEdge * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            {/* What this means */}
            <div className="bg-[#111] rounded p-2 text-xs text-gray-400">
              {signal.signalType === 'value_bet' && (
                <span>📊 Model gives <span className="text-white">{(signal.modelProbability * 100).toFixed(0)}%</span> chance but bookmaker only prices it at <span className="text-white">{(signal.impliedProbability * 100).toFixed(0)}%</span>. That's a <span className="text-yellow-400">{((signal.modelProbability - signal.impliedProbability) * 100).toFixed(1)}% edge</span>.</span>
              )}
              {signal.signalType === 'high_confidence' && (
                <span>🔥 Model is <span className="text-emerald-400">{(signal.modelProbability * 100).toFixed(0)}% confident</span> in this outcome. High probability pick.</span>
              )}
              {signal.signalType === 'rule_match' && (
                <span>📡 Matches your <span className="text-blue-400">{signal.engineName}</span> rule set criteria.</span>
              )}
            </div>

            {/* Context adjustment breakdown */}
            {signal.contextAdjustment && signal.contextAdjustment.factors.length > 0 && (
              <div className="bg-[#0e0e0e] border border-white/[0.06] rounded p-2 space-y-1.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Context Adjustments</span>
                  <span className={`text-[10px] font-mono font-bold ${signal.contextAdjustment.delta > 0 ? 'text-emerald-400' : signal.contextAdjustment.delta < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                    {signal.contextAdjustment.delta > 0 ? '+' : ''}{(signal.contextAdjustment.delta * 100).toFixed(1)}% adj
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-gray-500">
                  <span>Raw: <span className="text-gray-300">{(signal.contextAdjustment.rawProbability * 100).toFixed(1)}%</span></span>
                  <span>→</span>
                  <span>Adjusted: <span className="text-white font-semibold">{(signal.modelProbability * 100).toFixed(1)}%</span></span>
                </div>
                {signal.contextAdjustment.factors.map((f, i) => (
                  <div key={i} className="text-[10px] text-gray-500 leading-relaxed">
                    • {f}
                  </div>
                ))}
                {/* H2H summary pill */}
                {signal.contextAdjustment.h2hBias && signal.contextAdjustment.h2hBias.meetings > 0 && (
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className="text-[9px] text-gray-600 uppercase tracking-wide">H2H</span>
                    <span className="text-[10px] text-emerald-400 font-bold">{signal.contextAdjustment.h2hBias.homeWins}W</span>
                    <span className="text-[10px] text-gray-500">{signal.contextAdjustment.h2hBias.draws}D</span>
                    <span className="text-[10px] text-red-400 font-bold">{signal.contextAdjustment.h2hBias.awayWins}L</span>
                    <span className="text-[10px] text-gray-600">({signal.contextAdjustment.h2hBias.meetings} meetings)</span>
                  </div>
                )}
                {/* Table pressure pills */}
                {signal.contextAdjustment.tablePressure && (
                  <div className="flex gap-1.5 mt-1 flex-wrap">
                    {signal.contextAdjustment.tablePressure.homeZone !== 'none' && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold ${
                        signal.contextAdjustment.tablePressure.homeZone === 'title_race' ? 'text-yellow-400 border-yellow-800' :
                        signal.contextAdjustment.tablePressure.homeZone === 'top4' ? 'text-emerald-400 border-emerald-800' :
                        'text-red-400 border-red-800'
                      }`}>
                        🏠 {signal.contextAdjustment.tablePressure.homeZone.replace('_', ' ')}
                      </span>
                    )}
                    {signal.contextAdjustment.tablePressure.awayZone !== 'none' && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold ${
                        signal.contextAdjustment.tablePressure.awayZone === 'title_race' ? 'text-yellow-400 border-yellow-800' :
                        signal.contextAdjustment.tablePressure.awayZone === 'top4' ? 'text-emerald-400 border-emerald-800' :
                        'text-red-400 border-red-800'
                      }`}>
                        ✈️ {signal.contextAdjustment.tablePressure.awayZone.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Action buttons */}
            {signal.status === 'pending' && (
              <div className="flex gap-2">
                <button
                  onClick={() => rejectSignal(signal.matchId, signal.engineId, signal.market)}
                  className="flex-1 py-2 rounded border border-red-800 text-red-400 text-sm font-semibold hover:bg-red-900 transition"
                >
                  ✕ Skip
                </button>
                <button
                  onClick={() => router.push(`/match/${signal.matchId}`, 'forward', 'push')}
                  className="flex-1 py-2 rounded border border-gray-700 text-gray-400 text-sm hover:bg-[#1a1a1a] transition"
                >
                  👁 Details
                </button>
                <button
                  onClick={() => acceptSignal(signal.matchId, signal.engineId, signal.market)}
                  className="flex-1 py-2 rounded border border-emerald-700 text-emerald-400 text-sm font-semibold hover:bg-emerald-900 transition"
                >
                  ✓ Add Pick
                </button>
              </div>
            )}

            {signal.status === 'accepted' && (
              <div className="flex gap-2">
                <div className="flex-1 py-2 rounded bg-emerald-900 border border-emerald-700 text-emerald-400 text-sm text-center font-semibold">
                  ✓ In Your Picks
                </div>
                <button
                  onClick={() => router.push(`/match/${signal.matchId}`, 'forward', 'push')}
                  className="flex-1 py-2 rounded border border-gray-700 text-gray-400 text-sm hover:bg-[#1a1a1a] transition"
                >
                  👁 Details
                </button>
              </div>
            )}

            {signal.status === 'rejected' && (
              <div className="flex gap-2">
                <div className="flex-1 py-2 rounded border border-[#333] text-gray-600 text-sm text-center">
                  Skipped
                </div>
                <button
                  onClick={() => undoReject(signal.matchId, signal.engineId, signal.market)}
                  className="flex-1 py-2 rounded border border-yellow-700 text-yellow-400 text-sm font-semibold hover:bg-yellow-900 transition"
                >
                  ↩ Restore
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <IonPage>
      <IonContent style={{ '--background': '#111' } as any} fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={refresh}>
          <IonRefresherContent pullingText="Pull to refresh" refreshingSpinner="crescent" />
        </IonRefresher>

        <CustomHeader />

        <div className="px-3 pt-3 pb-2">
          {/* Summary bar */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-[#161616] border border-[#1e1e1e] rounded-lg p-2 text-center">
              <div className="text-yellow-400 font-bold text-lg">{valueBetCount}</div>
              <div className="text-[10px] text-gray-500">Value Bets</div>
            </div>
            <div className="bg-[#161616] border border-[#1e1e1e] rounded-lg p-2 text-center">
              <div className="text-emerald-400 font-bold text-lg">{highConfCount}</div>
              <div className="text-[10px] text-gray-500">High Conf</div>
            </div>
            <div className="bg-[#161616] border border-[#1e1e1e] rounded-lg p-2 text-center">
              <div className="text-white font-bold text-lg">{acceptedCount}</div>
              <div className="text-[10px] text-gray-500">My Picks</div>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 mb-3">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs border transition ${
                  activeTab === tab.id
                    ? 'bg-white text-black border-white font-semibold'
                    : 'border-[#333] text-gray-500 hover:text-white'
                }`}
              >
                {tab.label} {tab.count > 0 && <span className="ml-1 opacity-70">({tab.count})</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-3 pb-6">
          {(loading || running) ? (
            <div className="text-center text-gray-500 text-xs mt-16">
              <div className="text-2xl mb-2">⚙️</div>
              {running ? 'Running prediction engines...' : 'Loading matches...'}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-gray-600 text-xs mt-16">
              <div className="text-2xl mb-2">📭</div>
              {activeTab === 'accepted'
                ? 'No picks added yet. Go to All tab and accept signals.'
                : 'No signals found. Try enabling more engines or adjusting rules.'}
            </div>
          ) : (
            Object.entries(grouped).map(([tournament, tournamentSignals]) => (
              <div key={tournament} className="mb-4">
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide truncate">
                    🏆 {tournament}
                  </span>
                  <span className="text-xs text-gray-600 shrink-0">({tournamentSignals.length})</span>
                </div>
                {tournamentSignals.map(renderSignalCard)}
              </div>
            ))
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}

export default Suggestions;
