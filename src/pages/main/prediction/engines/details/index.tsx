import { useEffect, useState } from 'react';
import { IonContent, IonPage, IonRefresher, IonRefresherContent, useIonRouter } from '@ionic/react';
import { useParams } from 'react-router';
import { usePredictionStore } from '../../../../prediction/usePredictionStore';
import { getEngineLearningData, getEngineMatchHistory, getTopPerformingRules } from '../../../../prediction/engineLearning';
import { PredictionEngine, MatchEngineAssignment } from '../../../../prediction/engine';

const EngineDetails = () => {
  const { id: engineId } = useParams<{ id: string }>();
  const router = useIonRouter();
  const { engines } = usePredictionStore();

  const [engine, setEngine] = useState<PredictionEngine | null>(null);
  const [learningData, setLearningData] = useState<any>(null);
  const [matchHistory, setMatchHistory] = useState<MatchEngineAssignment[]>([]);
  const [topRules, setTopRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!engineId) return;

    const found = engines.find(e => e.id === engineId);
    setEngine(found || null);

    // Load learning data
    const learning = getEngineLearningData(engineId);
    setLearningData(learning || null);

    // Load match history
    const history = getEngineMatchHistory(engineId, 20);
    setMatchHistory(history);

    // Load top performing rules
    const rules = getTopPerformingRules(50).filter(r => r.engineId === engineId);
    setTopRules(rules);

    setLoading(false);
  }, [engineId, engines]);

  const refresh = async (e: CustomEvent) => {
    try {
      if (engineId) {
        const learning = getEngineLearningData(engineId);
        setLearningData(learning || null);
        const history = getEngineMatchHistory(engineId, 20);
        setMatchHistory(history);
      }
    } finally {
      try { e.detail.complete(); } catch {}
    }
  };

  if (loading) {
    return (
      <IonPage>
        <IonContent>
          <div className="flex items-center justify-center h-full text-sm text-gray-500 bg-[#0f0f0f]">
            Loading engine details...
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (!engine) {
    return (
      <IonPage>
        <IonContent>
          <div className="flex items-center justify-center h-full text-sm text-gray-500 bg-[#0f0f0f]">
            Engine not found
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const winRate = learningData?.winRate || 0;
  const totalPredictions = learningData?.totalPredictions || 0;
  const totalWins = learningData?.totalWins || 0;
  const totalLosses = learningData?.totalLosses || 0;
  const roi = learningData?.roi || 0;

  return (
    <IonPage>
      <IonContent style={{ '--background': '#0f0f0f' } as any} fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={refresh}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="min-h-full bg-[#0f0f0f] text-white pb-8">
          {/* Back bar */}
          <div className="sticky top-0 z-20 bg-[#0f0f0f]/95 border-b border-white/[0.06] px-4 py-3 backdrop-blur flex items-center gap-3">
            <button onClick={() => router.goBack()} className="text-xs font-semibold text-gray-400 hover:text-white shrink-0">
              ← Back
            </button>
            <span className="text-sm font-bold text-white truncate flex-1">
              {engine.icon} {engine.name}
            </span>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Always On" />
              <span className="text-[8px] text-emerald-500 font-bold uppercase">ON</span>
            </div>
          </div>

          <div className="px-3 pt-4">
            {/* Engine Info */}
            <div className="bg-[#161616] border border-white/[0.07] rounded-xl p-4 mb-4">
              <div className="text-xs text-gray-400 mb-2">{engine.description}</div>
              <div className="text-[10px] text-emerald-500 font-semibold mb-3">AI-Powered · Always On · Learning from every match</div>

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <div className={`text-lg font-bold ${winRate >= 0.55 ? 'text-emerald-400' : winRate >= 0.45 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {(winRate * 100).toFixed(0)}%
                  </div>
                  <div className="text-[10px] text-gray-600">Win Rate</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-white">{totalPredictions}</div>
                  <div className="text-[10px] text-gray-600">Predictions</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-emerald-400">{totalWins}</div>
                  <div className="text-[10px] text-gray-600">Wins</div>
                </div>
                <div>
                  <div className={`text-lg font-bold ${roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {roi >= 0 ? '+' : ''}{(roi * 100).toFixed(0)}%
                  </div>
                  <div className="text-[10px] text-gray-600">ROI</div>
                </div>
              </div>
            </div>

            {/* Top Performing Rules */}
            {topRules.length > 0 && (
              <div className="bg-[#161616] border border-white/[0.07] rounded-xl p-4 mb-4">
                <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wide mb-3">Top Performing Rules</div>
                <div className="space-y-2">
                  {topRules.map((rule, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white/[0.03] rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">📐</span>
                        <div>
                          <div className="text-xs font-semibold text-white">Rule {rule.ruleIndex + 1}</div>
                          <div className="text-[9px] text-gray-500">{rule.totalFires} fires</div>
                        </div>
                      </div>
                      <div className={`text-sm font-bold ${rule.winRate >= 0.55 ? 'text-emerald-400' : 'text-yellow-400'}`}>
                        {(rule.winRate * 100).toFixed(0)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rules Configuration */}
            <div className="bg-[#161616] border border-white/[0.07] rounded-xl p-4 mb-4">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-3">Engine Rules</div>
              <div className="space-y-2">
                {engine.rules.map((rule, idx) => (
                  <div key={idx} className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-white">
                        {rule.market.replace(/_/g, ' ').toUpperCase()}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {(rule.minProbability * 100).toFixed(0)}% min prob
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-gray-500">
                      <span>Odds ≥ {rule.minOdds.toFixed(2)}</span>
                      {rule.requireValue && <span className="text-yellow-500">Value required</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Match History */}
            <div className="bg-[#161616] border border-white/[0.07] rounded-xl p-4 mb-4">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-3">Recent Assignments</div>
              {matchHistory.length === 0 ? (
                <div className="text-xs text-gray-600 text-center py-4">
                  No match assignments yet. The engine is learning from every match it evaluates.
                </div>
              ) : (
                <div className="space-y-2">
                  {matchHistory.slice(0, 10).map((assignment, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white/[0.03] rounded-lg px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-white truncate">
                          {assignment.prediction.pick}
                        </div>
                        <div className="text-[9px] text-gray-500">
                          {assignment.prediction.market} · {assignment.prediction.odds.toFixed(2)} odds
                        </div>
                      </div>
                      <div className={`text-xs font-bold px-2 py-1 rounded ${
                        assignment.result === 'won' ? 'bg-emerald-500/20 text-emerald-300' :
                        assignment.result === 'lost' ? 'bg-red-500/20 text-red-300' :
                        'bg-yellow-500/20 text-yellow-300'
                      }`}>
                        {assignment.result === 'pending' ? 'PENDING' : assignment.result?.toUpperCase()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* How it works */}
            <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-xl p-3 text-xs text-gray-600">
              <div className="font-semibold text-gray-400 mb-1">🤖 How this engine works</div>
              <p>This engine is <span className="text-emerald-400 font-semibold">always on</span> and continuously scans matches against its strict rules. When a match satisfies a rule, the engine is automatically assigned. After the match is graded, the engine learns from the outcome and improves its future predictions. All value hunters use this engine's context when analyzing matches.</p>
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default EngineDetails;
