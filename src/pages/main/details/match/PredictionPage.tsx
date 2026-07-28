import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import { Brain, Zap, RefreshCw, Shield, Target, TrendingUp, AlertCircle, CheckCircle, Clock, ArrowLeft } from 'lucide-react';
import { useFootballContext } from '../../../../contexts/useFootballContext';
import { predictMatch, analyzeMatchWithAi, analyzeMatchSnapshot, getMatchDetail, trackUserBehavior } from '../../../../services/apis/footballApi';
import { Sec, Empty, ActionButton, val, confidenceTone, confidenceBg, confidenceLabel, pct, pickTypeLabel, signalText } from './shared';

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
  const navigate = useNavigate();
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
  const [actionMsg, setActionMsg] = useState('');
  const [actionError, setActionError] = useState('');
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
  const [aiResult, setAiResult] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    const fetchMatch = async () => {
      try {
        const data = await getMatchDetail(id);
        setMatch(data);
        if (data?.prediction) setPredictionResult(data.prediction);
        if (data?.ai_analysis) setAiResult(data.ai_analysis);
      } catch {}
    };
    fetchMatch();
  }, [id]);

  const refreshMatch = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getMatchDetail(id);
      setMatch(data);
      if (data?.prediction) setPredictionResult(data.prediction);
      if (data?.ai_analysis) setAiResult(data.ai_analysis);
    } catch {}
  }, [id]);

  const handleManualPredict = async () => {
    if (!id) return;
    setPredicting(true);
    setActionMsg('');
    setActionError('');
    setPredictionResult(null);
    try {
      await trackUserBehavior({ match_id: id, action: 'viewed', pick_type: 'manual_prediction' });
      const res = await predictMatch(id);
      setPredictionResult(res);
      setActionMsg('Manual prediction completed successfully');
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
    try {
      await trackUserBehavior({ match_id: id, action: 'viewed', pick_type: 'ai_analysis' });
      const res = await analyzeMatchWithAi(id);
      setAiResult(res);
      setActionMsg('AI analysis completed successfully');
      await refreshMatch();
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
    try {
      await trackUserBehavior({ match_id: id, action: 'viewed', pick_type: 'ai_snapshot' });
      const res = await analyzeMatchSnapshot(id);
      setAiResult(res);
      setActionMsg('AI snapshot analysis completed successfully');
      await refreshMatch();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : detail?.message || err?.message || 'AI snapshot analysis failed';
      setActionError(msg);
    } finally {
      setAnalyzingSnapshot(false);
    }
  };

  const m = match || matchDetail;

  return (
    <div className="min-h-full bg-[#0f0f0f] text-white pb-8">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0f0f0f]/95 border-b border-white/[0.06] px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white transition">
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
              {predicting ? 'Predicting...' : 'Manual Prediction'}
            </span>
          </button>
          <button
            onClick={handleAiAnalysis}
            disabled={analyzing}
            className="flex flex-col items-center gap-2 py-4 rounded-xl border border-white/[0.07] bg-[#161616] hover:border-violet-500/40 hover:bg-violet-500/[0.06] transition disabled:opacity-40"
          >
            <Brain size={24} className="text-violet-400" />
            <span className="text-xs font-semibold text-gray-300">
              {analyzing ? 'AI Analyzing...' : 'AI Prediction'}
            </span>
          </button>
        </div>
        <button
          onClick={handleAiSnapshot}
          disabled={analyzingSnapshot}
          className="w-full mt-3 flex items-center justify-center gap-2 py-3 rounded-xl border border-white/[0.07] bg-[#161616] hover:border-blue-500/40 hover:bg-blue-500/[0.06] transition disabled:opacity-40"
        >
          <RefreshCw size={16} className="text-blue-400" />
          <span className="text-xs font-semibold text-gray-300">
            {analyzingSnapshot ? 'Refreshing Snapshot...' : 'Refresh AI Snapshot'}
          </span>
        </button>
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
      {(predicting || analyzing || analyzingSnapshot) && (
        <div className="px-4 mb-4">
          <div className="flex items-center justify-center py-8 gap-3">
            <Clock size={20} className="text-gray-500 animate-spin" />
            <span className="text-sm text-gray-400">
              {predicting ? 'Running manual prediction...' : analyzing ? 'AI is analyzing the match...' : 'Refreshing AI snapshot...'}
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
                  {predictionResult.key_factors?.length > 0 && (
                    <div className="mt-3">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Key Factors</div>
                      <div className="space-y-1.5">
                        {predictionResult.key_factors.map((factor, i) => (
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
          <Sec title="AI Analysis Result">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Provider</span>
                <span className="text-xs font-bold text-violet-400">
                  {aiResult.provider || 'AI'}
                </span>
              </div>
              {aiResult.recommendation && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">AI Recommendation</span>
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
                  {aiResult.key_factors?.length > 0 && (
                    <div className="mt-3">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Key Factors</div>
                      <div className="space-y-1.5">
                        {aiResult.key_factors.map((factor, i) => (
                          <div key={i} className="text-xs text-violet-200">• {factor}</div>
                        ))}
                      </div>
                    </div>
                  )}
                  {aiResult.reasoning && Object.keys(aiResult.reasoning).length > 0 && (
                    <div className="mt-3">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">AI Reasoning</div>
                      <div className="space-y-1.5">
                        {Object.entries(aiResult.reasoning).map(([key, value]) => (
                          <div key={key}>
                            <div className="text-[9px] uppercase tracking-widest text-gray-600">{key.replace(/_/g, ' ')}</div>
                            <div className="text-xs text-gray-300">{String(value)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
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
              )}
              {aiResult.status === 'error' && (
                <div className="text-xs text-red-400">{aiResult.message || 'AI analysis failed'}</div>
              )}
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