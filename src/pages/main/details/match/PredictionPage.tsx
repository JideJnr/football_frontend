import { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation } from 'react-router';
import { useHistory } from 'react-router-dom';
import { Brain, Zap, RefreshCw, Shield, Target, TrendingUp, AlertCircle, CheckCircle, Clock, ArrowLeft, Bot, Trophy } from 'lucide-react';
import { useFootballContext } from '../../../../contexts/useFootballContext';
import { predictMatch, analyzeMatchWithAi, analyzeMatchSnapshot, getAllAiAnalyses, getMatchDetail, trackUserBehavior } from '../../../../services/apis/footballApi';
import { usePredictionStore } from '../../../../prediction/usePredictionStore';
import { getValueHunterContext, getTopPerformingEngines, getTopPerformingRules } from '../../../../prediction/engineLearning';
import { Sec, Empty } from './shared';

const confidenceTone = (c: number) =>
  c >= 75 ? 'text-emerald-300' : c >= 58 ? 'text-yellow-300' : 'text-red-300';

const confidenceBg = (c: number) =>
  c >= 75 ? 'bg-emerald-500' : c >= 58 ? 'bg-yellow-500' : 'bg-red-500';

const confidenceLabel = (c: number) =>
  c >= 75 ? 'Strong' : c >= 58 ? 'Moderate' : 'Low';

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

const pickTypeLabel = (pick: any) => pick?.type || pick?.pick_type || 'Pick';

const signalText = (signal: string) => signal.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());

const ReasoningDisplay = ({ reasoning }: { reasoning: Record<string, any> }) => {
  if (!reasoning || Object.keys(reasoning).length === 0) return null;
  if (typeof reasoning === 'string') {
    return (
      <div className="mt-3">
        <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">AI Reasoning</div>
        <div className="text-xs text-gray-300 whitespace-pre-wrap">{reasoning}</div>
      </div>
    );
  }
  return (
    <div className="mt-3">
      <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">AI Reasoning Steps</div>
      <div className="space-y-2">
        {Object.entries(reasoning).map(([key, value], i) => (
          <div key={key} className="flex gap-2">
            <div className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center">
              <span className="text-[9px] font-bold text-violet-300">{i + 1}</span>
            </div>
            <div className="flex-1">
              <div className="text-[9px] uppercase tracking-widest text-gray-500">{key.replace(/_/g, ' ')}</div>
              <div className="text-xs text-gray-300">{typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface PredictionResult {
  status: string;
  recommendation?: string;
  confidence?: number;
  value_bet?: boolean;
  key_factors?: string[];
  reasoning?: Record<string, string>;
  market_signal?: string;
  btts?: string;
  over_2_5?: string;
  source?: string;
  model?: string;
  model_label?: string;
  model_role?: string;
  model_emoji?: string;
  message?: string;
}

interface MatchData {
  id?: string;
  match_id?: string;
  sportybet_id?: string;
  name?: string;
  sportybet_name?: string;
  home_team?: string;
  away_team?: string;
  tournament?: string;
  category?: string;
  match_date?: string;
  start_time?: string;
  is_live?: boolean;
  prediction?: PredictionResult;
  prediction_error?: string;
  ai_analysis?: any;
  [key: string]: any;
}

const PredictionPage = () => {
  const params = useParams<{ matchId: string }>();
  const history = useHistory();
  const location = useLocation();
  const id = decodeURIComponent(
    location.pathname.split('/match/')[1]?.split('/')[0] || params.matchId || ''
  );

  const { getMatchDetail, matchDetail, loading, error } = useFootballContext();

  const [match, setMatch] = useState<MatchData | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'prediction' | 'ai'>('overview');
  const [predicting, setPredicting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzingSnapshot, setAnalyzingSnapshot] = useState(false);
  const [loadingAllAi, setLoadingAllAi] = useState(false);
  const [actionMsg, setActionMsg] = useState('');
  const [actionError, setActionError] = useState('');
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
  const [aiResult, setAiResult] = useState<any>(null);
  const [aiProvider, setAiProvider] = useState<string>('');
  const [allAiResults, setAllAiResults] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    getMatchDetail(id);
  }, [id, getMatchDetail]);

  useEffect(() => {
    if (matchDetail) {
      setMatch(matchDetail);
      if (matchDetail?.prediction) setPredictionResult(matchDetail.prediction);
      if (matchDetail?.ai_analysis && !aiResult) setAiResult(matchDetail.ai_analysis);
    }
  }, [matchDetail, aiResult]);

  // Load value hunter context and learning data
  useEffect(() => {
    if (!id || !matchDetail) return;

    // Build value hunter context from local learning store
    const matchData = {
      id,
      name: matchDetail?.name || matchDetail?.match_name,
      home_team: matchDetail?.home_team || matchDetail?.homeTeam,
      away_team: matchDetail?.away_team || matchDetail?.awayTeam,
      tournament: matchDetail?.tournament || matchDetail?.league_name,
      start_time: matchDetail?.start_time,
    };
    const ctx = getValueHunterContext(id, matchData);
    setValueHunterCtx(ctx);

    // Load top performing engines and rules
    setTopEngines(getTopPerformingEngines(5));
    setTopRules(getTopPerformingRules(10));
  }, [id, matchDetail]);

  // Grade match handler
  const handleGradeMatch = async () => {
    if (!id || !matchDetail) return;
    setGrading(true);
    setActionMsg('');
    setActionError('');
    try {
      const score = matchDetail?.score || {};
      const homeScore = Number(score.home ?? matchDetail?.homeScore?.current ?? 0);
      const awayScore = Number(score.away ?? matchDetail?.awayScore?.current ?? 0);

      let result: 'won' | 'lost' | 'draw' = 'draw';
      if (homeScore > awayScore) result = 'won';
      else if (homeScore < awayScore) result = 'lost';

      gradeMatch(id, result, matchDetail);
      setActionMsg(`Match graded: ${result.toUpperCase()}. Engines have learned from this outcome.`);
      await refreshMatch();
    } catch (err: any) {
      setActionError(err?.response?.data?.detail || err?.message || 'Grading failed');
    } finally {
      setGrading(false);
    }
  };

  const refreshMatch = useCallback(async () => {
    if (!id) return;
    await getMatchDetail(id);
    if (matchDetail) {
      setMatch(matchDetail);
      if (matchDetail?.prediction) setPredictionResult(matchDetail.prediction);
    }
  }, [id, matchDetail, getMatchDetail]);

  const handleManualPredict = async () => {
    if (!id) return;
    setPredicting(true);
    setActionMsg('');
    setActionError('');
    setPredictionResult(null);
    try {
      await trackUserBehavior({ match_id: id, action: 'viewed', pick_type: 'manual_prediction' });
      const res = await predictMatch(id);
      setPredictionResult(res.prediction || res);
      setActionMsg('Prediction completed successfully');
      await refreshMatch();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : detail?.message || err?.message || 'Prediction failed';
      setActionError(msg);
    } finally {
      setPredicting(false);
    }
  };

  const handleAiAnalysis = async () => {
    if (!id) return;
    setAnalyzing(true);
    setActionMsg('');
    setActionError('');
    setAiResult(null);
    setAiProvider('');
    try {
      await trackUserBehavior({ match_id: id, action: 'viewed', pick_type: 'ai_analysis' });
      const res = await analyzeMatchWithAi(id);
      const analysis = res.analysis || res;
      setAiResult(analysis);
      setAiProvider(res.provider || 'AI');
      setActionMsg('AI analysis completed successfully');
      // Refresh match data but preserve AI result
      await refreshMatch();
      // Re-apply AI result after refresh in case it was cleared
      setAiResult(analysis);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : detail?.message || err?.message || 'AI analysis failed';
      setActionError(msg);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAiSnapshot = async () => {
    if (!id) return;
    setAnalyzingSnapshot(true);
    setActionMsg('');
    setActionError('');
    setAiResult(null);
    setAiProvider('');
    try {
      await trackUserBehavior({ match_id: id, action: 'viewed', pick_type: 'ai_snapshot' });
      const res = await analyzeMatchSnapshot(id);
      const analysis = res.analysis || res;
      setAiResult(analysis);
      setAiProvider(res.provider || 'AI');
      setActionMsg('AI snapshot analysis completed successfully');
      // Refresh match data but preserve AI result
      await refreshMatch();
      setAiResult(analysis);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : detail?.message || err?.message || 'AI snapshot analysis failed';
      setActionError(msg);
    } finally {
      setAnalyzingSnapshot(false);
    }
  };

  const handleLoadAllAi = async () => {
    if (!id) return;
    setLoadingAllAi(true);
    setActionMsg('');
    setActionError('');
    try {
      const data = await getAllAiAnalyses(id);
      setAllAiResults(data);
      setActionMsg(`Loaded ${data.provider_count || 0} AI analyses`);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : detail?.message || err?.message || 'Failed to load AI analyses';
      setActionError(msg);
    } finally {
      setLoadingAllAi(false);
    }
  };

  const m = match || matchDetail;

  return (
    <div className="min-h-full bg-[#0f0f0f] text-white pb-8">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0f0f0f]/95 border-b border-white/[0.06] px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <button onClick={() => history.goBack()} className="text-gray-400 hover:text-white transition">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-base font-bold text-white">Prediction</h1>
        </div>
      </div>

      {/* Match Info */}
      {m && (
        <div className="px-4 pt-4">
          <div className="bg-[#161616] border border-white/[0.07] rounded-xl p-4 mb-3">
            <div className="text-center mb-3">
              <div className="text-lg font-bold text-white">
                {m?.home_team || m?.homeTeam || 'Home'} vs {m?.away_team || m?.awayTeam || 'Away'}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {m?.tournament || m?.league_name || ''}
                {m?.match_date && ` · ${m.match_date}`}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-white/[0.03] px-2 py-2">
                <div className="text-[9px] text-gray-500 uppercase">Home</div>
                <div className="text-sm font-bold text-white">{m?.home_team || m?.homeTeam || '—'}</div>
              </div>
              <div className="rounded-lg bg-white/[0.03] px-2 py-2">
                <div className="text-[9px] text-gray-500 uppercase">Away</div>
                <div className="text-sm font-bold text-white">{m?.away_team || m?.awayTeam || '—'}</div>
              </div>
              <div className="rounded-lg bg-white/[0.03] px-2 py-2">
                <div className="text-[9px] text-gray-500 uppercase">Status</div>
                <div className="text-sm font-bold text-gray-300">{m?.is_live ? 'Live' : 'Upcoming'}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Value Hunter Context - AI Engine Analysis */}
      {valueHunterCtx && (
        <div className="px-4 mb-4">
          <Sec title="🤖 Value Hunter Analysis">
            <div className="space-y-3">
              {/* Consensus */}
              <div className={`rounded-xl border p-3 ${
                valueHunterCtx.consensus.confidence === 'high'
                  ? 'border-emerald-500/30 bg-emerald-500/[0.08]'
                  : valueHunterCtx.consensus.confidence === 'medium'
                  ? 'border-yellow-500/30 bg-yellow-500/[0.08]'
                  : 'border-white/[0.07] bg-white/[0.02]'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Consensus Pick</div>
                    <div className="text-sm font-bold text-white mt-0.5">{valueHunterCtx.consensus.bestPick || 'No clear consensus'}</div>
                  </div>
                  <div className={`text-right px-2 py-1 rounded-lg text-xs font-bold ${
                    valueHunterCtx.consensus.confidence === 'high'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : valueHunterCtx.consensus.confidence === 'medium'
                      ? 'bg-yellow-500/20 text-yellow-300'
                      : 'bg-white/10 text-gray-400'
                  }`}>
                    {valueHunterCtx.consensus.confidence.toUpperCase()}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-black/20 rounded-lg p-2">
                    <div className="text-[9px] text-gray-500">Market</div>
                    <div className="text-xs font-bold text-white">{valueHunterCtx.consensus.bestMarket}</div>
                  </div>
                  <div className="bg-black/20 rounded-lg p-2">
                    <div className="text-[9px] text-gray-500">Odds</div>
                    <div className="text-xs font-bold text-white">{valueHunterCtx.consensus.bestOdds.toFixed(2)}</div>
                  </div>
                  <div className="bg-black/20 rounded-lg p-2">
                    <div className="text-[9px] text-gray-500">Edge</div>
                    <div className={`text-xs font-bold ${valueHunterCtx.consensus.bestValueEdge > 0 ? 'text-emerald-400' : 'text-gray-400'}`}>
                      {valueHunterCtx.consensus.bestValueEdge > 0 ? '+' : ''}{(valueHunterCtx.consensus.bestValueEdge * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
                {valueHunterCtx.consensus.supportingEngines.length > 0 && (
                  <div className="mt-2 text-[10px] text-gray-500">
                    Supported by: {valueHunterCtx.consensus.supportingEngines.join(', ')}
                  </div>
                )}
              </div>

              {/* Assigned Engines */}
              <div>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">Assigned Engines ({valueHunterCtx.assignedEngines.length})</div>
                <div className="space-y-2">
                  {valueHunterCtx.assignedEngines.map((engine: any, idx: number) => (
                    <div key={idx} className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2.5">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{engine.engineIcon}</span>
                          <div>
                            <div className="text-xs font-semibold text-white">{engine.engineName}</div>
                            <div className="text-[9px] text-gray-500">Rule {engine.ruleIndex + 1}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-xs font-bold ${engine.winRate >= 0.55 ? 'text-emerald-400' : engine.winRate >= 0.45 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {(engine.winRate * 100).toFixed(0)}% win rate
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-[10px] text-gray-400">
                          {engine.prediction.pick} @ {engine.prediction.odds.toFixed(2)}
                        </div>
                        <div className={`text-[10px] font-mono ${engine.prediction.valueEdge > 0 ? 'text-emerald-400' : 'text-gray-500'}`}>
                          {engine.prediction.valueEdge > 0 ? '+' : ''}{(engine.prediction.valueEdge * 100).toFixed(1)}% edge
                        </div>
                      </div>
                      {engine.contextFactors.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {engine.contextFactors.slice(0, 3).map((factor: string, i: number) => (
                            <span key={i} className="text-[8px] px-1.5 py-0.5 rounded bg-white/5 text-gray-500">
                              {factor}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Risk Factors */}
              {valueHunterCtx.consensus.riskFactors.length > 0 && (
                <div className="bg-red-500/[0.06] border border-red-500/20 rounded-lg p-2.5">
                  <div className="text-[10px] font-bold text-red-400 uppercase tracking-wide mb-1">Risk Factors</div>
                  {valueHunterCtx.consensus.riskFactors.map((risk: string, i: number) => (
                    <div key={i} className="text-[10px] text-red-300">• {risk}</div>
                  ))}
                </div>
              )}
            </div>
          </Sec>
        </div>
      )}

      {/* AI Learning Stats */}
      {(topEngines.length > 0 || topRules.length > 0) && (
        <div className="px-4 mb-4">
          <Sec title="📊 AI Learning Insights">
            <div className="space-y-3">
              {topEngines.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide mb-2">Top Performing Engines</div>
                  <div className="space-y-1.5">
                    {topEngines.map((engine, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white/[0.03] rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">🏆</span>
                          <span className="text-xs font-semibold text-white">{engine.engineId.replace(/_/g, ' ')}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-gray-500">{engine.totalPredictions} preds</span>
                          <span className={`text-xs font-bold ${engine.winRate >= 0.55 ? 'text-emerald-400' : 'text-yellow-400'}`}>
                            {(engine.winRate * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {topRules.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wide mb-2">Top Performing Rules</div>
                  <div className="space-y-1.5">
                    {topRules.slice(0, 5).map((rule, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white/[0.03] rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">📐</span>
                          <span className="text-xs text-gray-300">
                            {rule.engineId.replace(/_/g, ' ')} · Rule {rule.ruleIndex + 1}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-gray-500">{rule.totalFires} fires</span>
                          <span className={`text-xs font-bold ${rule.winRate >= 0.55 ? 'text-emerald-400' : 'text-yellow-400'}`}>
                            {(rule.winRate * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Sec>
        </div>
      )}

      {/* Action Buttons */}
      <div className="px-4 mb-4">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleManualPredict}
            disabled={predicting}
            className="flex flex-col items-center gap-2 py-4 rounded-xl border border-white/[0.07] bg-[#161616] hover:border-purple-500/40 hover:bg-purple-500/[0.06] transition disabled:opacity-40"
          >
            <Target size={24} className="text-purple-400" />
            <span className="text-xs font-semibold text-gray-300">
              {predicting ? 'Running...' : 'Run Prediction'}
            </span>
            <span className="text-[9px] text-gray-500">Statistical engine (no AI)</span>
          </button>
          <button
            onClick={handleAiAnalysis}
            disabled={analyzing}
            className="flex flex-col items-center gap-2 py-4 rounded-xl border border-white/[0.07] bg-[#161616] hover:border-violet-500/40 hover:bg-violet-500/[0.06] transition disabled:opacity-40"
          >
            <Brain size={24} className="text-violet-400" />
            <span className="text-xs font-semibold text-gray-300">
              {analyzing ? 'AI Analyzing...' : 'Run AI Prediction'}
            </span>
            <span className="text-[9px] text-gray-500">Groq / Ollama with reasoning</span>
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <button
            onClick={handleAiSnapshot}
            disabled={analyzingSnapshot}
            className="flex items-center justify-center gap-2 py-3 rounded-xl border border-white/[0.07] bg-[#161616] hover:border-blue-500/40 hover:bg-blue-500/[0.06] transition disabled:opacity-40"
          >
            <RefreshCw size={16} className="text-blue-400" />
            <span className="text-xs font-semibold text-gray-300">
              {analyzingSnapshot ? 'Refreshing...' : 'Refresh AI Snapshot'}
            </span>
          </button>
          <button
            onClick={handleLoadAllAi}
            disabled={loadingAllAi}
            className="flex items-center justify-center gap-2 py-3 rounded-xl border border-white/[0.07] bg-[#161616] hover:border-emerald-500/40 hover:bg-emerald-500/[0.06] transition disabled:opacity-40"
          >
            <Zap size={16} className="text-emerald-400" />
            <span className="text-xs font-semibold text-gray-300">
              {loadingAllAi ? 'Loading...' : 'All AI Analyses'}
            </span>
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {actionMsg && (
        <div className="px-4 mb-3">
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-2 text-xs text-emerald-400">
            <CheckCircle size={14} />
            {actionMsg}
          </div>
        </div>
      )}
      {actionError && (
        <div className="px-4 mb-3">
          <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-xs text-red-400">
            <AlertCircle size={14} />
            {actionError}
          </div>
        </div>
      )}

      {/* Loading State */}
      {(predicting || analyzing || analyzingSnapshot || loadingAllAi) && (
        <div className="px-4 mb-4">
          <div className="flex items-center justify-center py-8 gap-3">
            <Clock size={20} className="text-gray-500 animate-spin" />
            <span className="text-sm text-gray-400">
              {predicting ? 'Running prediction engine...' : analyzing ? 'AI is analyzing the match...' : analyzingSnapshot ? 'Refreshing AI snapshot...' : 'Loading all AI analyses...'}
            </span>
          </div>
        </div>
      )}

      {/* Manual Prediction Result */}
      {predictionResult && (
        <div className="px-4 mb-4">
          <Sec title="Manual Prediction Result">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Status</span>
                <span className={`text-xs font-bold ${predictionResult.status === 'predicted' ? 'text-emerald-400' : predictionResult.status === 'error' ? 'text-red-400' : 'text-gray-400'}`}>
                  {predictionResult.status}
                </span>
              </div>
              {predictionResult.recommendation && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Recommendation</span>
                    <span className="text-sm font-bold text-white">{predictionResult.recommendation}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Confidence</span>
                    <span className={`text-sm font-bold ${confidenceTone(predictionResult.confidence || 0)}`}>
                      {predictionResult.confidence}%
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full ${confidenceBg(predictionResult.confidence || 0)}`}
                      style={{ width: `${Math.max(3, Math.min(100, predictionResult.confidence || 0))}%` }}
                    />
                  </div>
                  {predictionResult.key_factors && predictionResult.key_factors.length > 0 && (
                    <div className="mt-3">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Key Factors</div>
                      <div className="space-y-1.5">
                        {(predictionResult.key_factors || []).map((factor: string, i: number) => (
                          <div key={i} className="text-xs text-emerald-200">• {factor}</div>
                        ))}
                      </div>
                    </div>
                  )}
                  {predictionResult.reasoning && Object.keys(predictionResult.reasoning).length > 0 && (
                    <div className="mt-3">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Reasoning</div>
                      <div className="space-y-1.5">
                        {Object.entries(predictionResult.reasoning).map(([key, value]) => (
                          <div key={key}>
                            <div className="text-[9px] uppercase tracking-widest text-gray-600">{key.replace(/_/g, ' ')}</div>
                            <div className="text-xs text-gray-300">{String(value)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {predictionResult.market_signal && (
                      <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-gray-300">
                        Market: {predictionResult.market_signal}
                      </span>
                    )}
                    {predictionResult.btts && (
                      <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-gray-300">
                        BTTS: {predictionResult.btts}
                      </span>
                    )}
                    {predictionResult.over_2_5 && (
                      <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-gray-300">
                        Over 2.5: {predictionResult.over_2_5}
                      </span>
                    )}
                    {predictionResult.value_bet && (
                      <span className="rounded-full border border-yellow-500/30 px-2 py-0.5 text-[10px] text-yellow-300">
                        Value Bet
                      </span>
                    )}
                  </div>
                </>
              )}
              {predictionResult.status === 'error' && (
                <div className="text-xs text-red-400">{predictionResult.message || 'Prediction failed'}</div>
              )}
            </div>
          </Sec>
        </div>
      )}

      {/* AI Analysis Result */}
      {aiResult && (
        <div className="px-4 mb-4">
          <Sec title={`AI Analysis — ${aiProvider || 'Result'}`}>
            <div className="space-y-3">
              {aiResult.recommendation ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Recommendation</span>
                    <span className="text-sm font-bold text-white">{aiResult.recommendation}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Confidence</span>
                    <span className={`text-sm font-bold ${confidenceTone(aiResult.confidence || 0)}`}>
                      {aiResult.confidence}%
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full ${confidenceBg(aiResult.confidence || 0)}`}
                      style={{ width: `${Math.max(3, Math.min(100, aiResult.confidence || 0))}%` }}
                    />
                  </div>
                  {aiResult.key_factors && aiResult.key_factors.length > 0 && (
                    <div className="mt-3">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Key Factors</div>
                      <div className="space-y-1.5">
                        {(aiResult.key_factors || []).map((factor: string, i: number) => (
                          <div key={i} className="text-xs text-violet-200">• {factor}</div>
                        ))}
                      </div>
                    </div>
                  )}
                  {aiResult.reasoning && (
                    <ReasoningDisplay reasoning={aiResult.reasoning} />
                  )}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {aiResult.market_signal && (
                      <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-gray-300">
                        Market: {aiResult.market_signal}
                      </span>
                    )}
                    {aiResult.btts && (
                      <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-gray-300">
                        BTTS: {aiResult.btts}
                      </span>
                    )}
                    {aiResult.over_2_5 && (
                      <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-gray-300">
                        Over 2.5: {aiResult.over_2_5}
                      </span>
                    )}
                    {aiResult.value_bet && (
                      <span className="rounded-full border border-yellow-500/30 px-2 py-0.5 text-[10px] text-yellow-300">
                        Value Bet
                      </span>
                    )}
                  </div>
                </>
              ) : aiResult.status === 'error' ? (
                <div className="text-xs text-red-400">{aiResult.message || 'AI analysis failed'}</div>
              ) : (
                <div className="text-xs text-gray-400">
                  {aiResult.analysis ? 'Analysis generated — see details below' : 'AI analysis completed'}
                </div>
              )}
            </div>
          </Sec>
        </div>
      )}

      {/* All AI Analyses (multi-provider) */}
      {allAiResults && allAiResults.providers && (
        <div className="px-4 mb-4">
          <Sec title="All AI Analyses">
            <div className="space-y-4">
              {allAiResults.overall_consensus && (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] p-3">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-1">Overall Consensus</div>
                  <div className="text-sm font-bold text-white">{allAiResults.overall_consensus}</div>
                </div>
              )}
              {Object.entries(allAiResults.providers).map(([providerKey, providerData]: [string, any]) => (
                <div key={providerKey} className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-300">{providerData.label || providerKey}</span>
                    <span className="text-[9px] text-gray-500">{providerData.role || ''}</span>
                  </div>
                  {providerData.recommendation && (
                    <div className="text-sm font-bold text-white mb-1">{providerData.recommendation}</div>
                  )}
                  {providerData.confidence && (
                    <div className="text-xs text-gray-400 mb-2">Confidence: {providerData.confidence}%</div>
                  )}
                  {providerData.reasoning && <ReasoningDisplay reasoning={providerData.reasoning} />}
                </div>
              ))}
            </div>
          </Sec>
        </div>
      )}

      {/* Existing TabPredictions integration */}
      {!predictionResult && !aiResult && !loading && (
        <div className="px-4 mb-4">
          <Sec title="Prediction Status">
            <Empty msg="No prediction yet. Use the buttons above to run manual or AI prediction." />
          </Sec>
        </div>
      )}

      {loading && !m && (
        <div className="flex items-center justify-center py-20 text-sm text-gray-500">Loading match details...</div>
      )}

      {error && (
        <div className="px-4 mb-4">
          <div className="text-xs text-red-400 text-center">{error}</div>
        </div>
      )}
    </div>
  );
};

export default PredictionPage;