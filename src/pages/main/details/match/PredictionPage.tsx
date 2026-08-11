import { useParams } from 'react-router';
import { usePredictionStore } from '../../../../prediction/usePredictionStore';
import { getValueHunterContext } from '../../../../prediction/engineLearning';
import { useEffect } from 'react';
import AddToBetSlipButton from '../../../../components/betslip/AddToBetSlipButton';

const PredictionPage = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const { matchAssignments, engines, signals, gradeMatch, assignEnginesToMatch } = usePredictionStore();

  const assignments = matchId ? (matchAssignments[matchId] || []) : [];
  const matchSignals = matchId ? signals.filter((s: any) => s.matchId === matchId) : [];
  const valueHunterContext = matchId ? getValueHunterContext(matchId, {}) : null;

  // Prepare bet slip data from the best signal
  const bestSignal = matchSignals.length > 0 ? matchSignals[0] : null;
  const betSlipData = matchId && bestSignal ? {
    match_id: matchId,
    match_name: bestSignal.matchName || 'Unknown match',
    league_name: bestSignal.tournament || 'Unknown league',
    country_name: '',
    best_pick: {
      type: bestSignal.market,
      pick_type: bestSignal.market,
      selection: bestSignal.pick,
      odds: bestSignal.odds,
      confidence: bestSignal.confidence === 'high' ? 75 : bestSignal.confidence === 'medium' ? 55 : 40,
    },
  } : null;

  useEffect(() => {
    if (matchId) {
      usePredictionStore.getState().assignEnginesToMatch(matchId, { id: matchId });
    }
  }, [matchId, assignEnginesToMatch]);

  return (
    <div className="space-y-4 px-4 py-4">
      <h2 className="text-lg font-bold text-white">Prediction Details</h2>

      {/* Engine Assignments */}
      <div className="rounded-xl border border-white/[0.07] bg-[#161616] p-4">
        <h3 className="text-sm font-bold text-gray-300 mb-3">Engine Assignments</h3>
        {assignments.length === 0 ? (
          <p className="text-xs text-gray-500">No engines assigned yet.</p>
        ) : (
          <div className="space-y-2">
            {assignments.map((a: any, i: number) => {
              const engine = engines.find((e: any) => e.id === a.engineId);
              return (
                <div key={`${a.engineId}-${i}`} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">{engine?.icon || '📡'} {engine?.name || a.engineId}</span>
                    <span className={`text-xs font-bold ${a.prediction?.valueEdge >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {a.prediction?.valueEdge >= 0 ? '+' : ''}{a.prediction?.valueEdge?.toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    Market: {a.prediction?.market} · Pick: {a.prediction?.pick} · Confidence: {a.prediction?.probability ? `${(a.prediction.probability * 100).toFixed(0)}%` : 'N/A'}
                  </div>
                  {a.result && (
                    <div className="mt-1 text-xs font-semibold">
                      Result: <span className={a.result === 'won' ? 'text-emerald-400' : 'text-red-400'}>{a.result.toUpperCase()}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Value Hunter Consensus */}
      {valueHunterContext && (
        <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.04] p-4">
          <h3 className="text-sm font-bold text-violet-300 mb-3">Value Hunter Consensus</h3>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-bold text-white">{valueHunterContext.consensus.bestPick}</div>
              <div className="text-xs text-gray-500">{valueHunterContext.consensus.bestMarket} · {valueHunterContext.consensus.confidence} confidence</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-emerald-400">+{valueHunterContext.consensus.bestValueEdge?.toFixed(1)}%</div>
              <div className="text-xs text-gray-600">value edge</div>
            </div>
          </div>
          {valueHunterContext.consensus.supportingEngines.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {valueHunterContext.consensus.supportingEngines.map((eid: string) => {
                const eng = engines.find((e: any) => e.id === eid);
                return (
                  <span key={eid} className="rounded-full border border-white/10 px-3 py-1 text-xs text-gray-400">
                    {eng?.icon} {eng?.name || eid}
                  </span>
                );
              })}
            </div>
          )}
          {valueHunterContext.consensus.riskFactors.length > 0 && (
            <div className="mt-3 space-y-1">
              {valueHunterContext.consensus.riskFactors.map((rf: string, i: number) => (
                <div key={i} className="text-xs text-red-400">⚠ {rf}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add to Bet Slip */}
      {betSlipData && (
        <div className="px-1">
          <AddToBetSlipButton prediction={betSlipData} />
        </div>
      )}

      {/* Store Signals */}
      <div className="rounded-xl border border-white/[0.07] bg-[#161616] p-4">
        <h3 className="text-sm font-bold text-gray-300 mb-3">Store Signals</h3>
        {matchSignals.length === 0 ? (
          <p className="text-xs text-gray-500">No signals in store for this match.</p>
        ) : (
          <div className="space-y-2">
            {matchSignals.map((s: any, i: number) => (
              <div key={i} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">{s.engineName} · {s.market}</span>
                  <span className={`text-xs font-bold ${s.confidence === 'high' ? 'text-emerald-400' : s.confidence === 'medium' ? 'text-yellow-400' : 'text-red-400'}`}>
                    {s.confidence}
                  </span>
                </div>
                <div className="mt-1 text-xs text-gray-500">Pick: {s.pick} · Edge: {s.valueEdge?.toFixed(1)}%</div>
                <div className="mt-1 text-xs text-gray-600">Status: {s.status}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PredictionPage;
