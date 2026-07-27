import axios from 'axios';
import { Capacitor, CapacitorHttp } from '@capacitor/core';

// Reads from .env (VITE_API_BASE_URL).
// To switch between Render and local dev, just change that one value.
// Render:  VITE_API_BASE_URL=https://endpoints-dtfx.onrender.com
// Local:   VITE_API_BASE_URL=http://127.0.0.1:8000
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';

const api = axios.create({ baseURL: BASE_URL });

const SPORTYBET_POST_URL = 'https://www.sportybet.com/api/ng/factsCenter/wapConfigurableEventsByOrder';

// WebSocket — wss:// on Render (https), ws:// locally (http)
export const LIVE_WS_URL = BASE_URL.replace(/^https/, 'wss').replace(/^http/, 'ws') + '/ws/live';

// ── Matches ──────────────────────────────────────────────────
export const getTodayMatches = () =>
  api.get('/matches/today').then(r => r.data);

export const getMatchDetail = (id: string) =>
  api.get(`/matches/today/${id}`).then(r => r.data);

export const getMatchesByDate = (date: string) =>
  api.get(`/matches/by-date/${date}`).then(r => r.data);

export const getLiveMatches = () =>
  api.get('/matches/live').then(r => r.data);

export const getUpcomingEnrichedPredicted = () =>
  api.get('/matches/upcoming-enriched-predicted').then(r => r.data);

export const getValueBets = (date?: string, minEdge = 3) =>
  api.get('/agent/value-bets', { params: { date, min_edge: minEdge } }).then(r => r.data);

export const getPerformanceAnalytics = () =>
  api.get('/agent/analytics/performance').then(r => r.data);

export const getRoiAnalysis = () =>
  api.get('/agent/analytics/roi').then(r => r.data);

// ── Per-match actions ────────────────────────────────────────
// NOTE: enrichMatch, predictMatch, analyzeMatchWithAi are deprecated.
// The scheduler auto-enriches and auto-predicts all matches without user interaction.

/** @deprecated Auto-enrichment runs via the scheduler every 30s */
export const enrichMatch = (id: string) =>
  api.post(`/matches/${id}/enrich`).then(r => r.data);

export const getSimilarMatches = (id: string, limit = 10) =>
  api.get(`/matches/${encodeURIComponent(id)}/similar`, { params: { limit } }).then(r => r.data);

export const predictMatch = (id: string) =>
  api.post(`/matches/${id}/predict`).then(r => r.data);

export const analyzeMatchWithAi = (id: string) =>
  api.post(`/matches/${id}/ai-analysis`).then(r => r.data);

export const getOllamaStatus = () =>
  api.get('/agent/ollama/status').then(r => r.data);

export const getSofascoreCandidates = (id: string) =>
  api.get(`/matches/${id}/sofascore-candidates`).then(r => r.data);

export const matchSofascoreCandidate = (
  id: string,
  payload: { sofascore_id: string | number; match_date?: string; event?: any }
) => api.post(`/matches/${id}/sofascore-match`, payload).then(r => r.data);

// ── Buffer status ────────────────────────────────────────────
export const cleanupFinishedMatches = () =>
  api.post('/matches/cleanup').then(r => r.data);

export const purgeGhostMatches = () =>
  api.post('/matches/purge-ghosts').then(r => r.data);

export const getBufferStatus = () =>
  api.get('/buffer/status').then(r => r.data);

export const getMobileBridgeStatus = () =>
  api.get('/mobile-bridge/status').then(r => r.data);

export const uploadProviderPacket = (packet: any) =>
  api.post('/mobile-bridge/provider-packets', packet).then(r => r.data);

// ── Auto-refresh / polling utilities ──────────────
/** Poll for updated predictions at an interval. Returns cleanup function to stop polling. */
export const startPredictionPolling = (
  callback: (data: any) => void,
  intervalMs = 60000,
  immediate = true,
) => {
  let cancelled = false;
  let timer: ReturnType<typeof setInterval> | undefined;
  const poll = async () => {
    if (cancelled) return;
    try {
      const data = await getPredictionsToday();
      callback(data);
    } catch { /* retry next interval */ }
  };
  if (immediate) poll();
  timer = setInterval(poll, intervalMs);
  return () => { cancelled = true; if (timer) clearInterval(timer); };
};

/** Poll for buffer status changes at an interval. Returns cleanup function. */
export const startBufferStatusPolling = (
  callback: (data: any) => void,
  intervalMs = 30000,
  immediate = true,
) => {
  let cancelled = false;
  let timer: ReturnType<typeof setInterval> | undefined;
  const poll = async () => {
    if (cancelled) return;
    try {
      const data = await getBufferStatus();
      callback(data);
    } catch { /* retry next interval */ }
  };
  if (immediate) poll();
  timer = setInterval(poll, intervalMs);
  return () => { cancelled = true; if (timer) clearInterval(timer); };
};

// ── User behavior tracking ──────────────────────
export const trackUserBehavior = (payload: {
  match_id: string;
  action: 'viewed' | 'accepted' | 'rejected' | 'bet_placed' | 'bet_graded' | 'prediction_dismissed';
  pick_type?: string;
  selection?: string;
  confidence?: number;
}) => api.post('/user-behavior/track', payload).then(r => r.data);

export const getUserBehaviorSummary = (daysBack = 30) =>
  api.get(`/user-behavior/summary?days_back=${daysBack}`).then(r => r.data);

// ── Auto-bet ────────────────────────────────────
export const getAutoBetSuggestions = (maxPicks = 5, minConfidence = 65) =>
  api.get('/betbuilder/auto-suggestions', {
    params: { max_picks: maxPicks, min_confidence: minConfidence },
  }).then(r => r.data);

export const autoBetPlace = (payload: { selections: any[]; stake: number; shareCode?: string | null }) =>
  api.post('/betbuilder/auto-place', payload).then(r => r.data);

// ── Prediction coverage ─────────────────────
export const getPredictionCoverage = () =>
  api.get('/diagnostics/prediction-coverage').then(r => r.data);

export const collectSportybetViaMobile = async (scope: 'upcoming' | 'live' = 'upcoming') => {
  if (!Capacitor.isNativePlatform()) {
    throw new Error('Direct provider fetch is mobile-native only. Use this from the Android app.');
  }
  const payload: Record<string, any> = {
    sportId: 'sr:sport:1',
    pageSize: 300,
    isLive: scope === 'live',
  };
  const response = await CapacitorHttp.post({
    url: SPORTYBET_POST_URL,
    headers: {
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      Origin: 'https://www.sportybet.com',
      Referer: 'https://www.sportybet.com/ng/m/sport/football',
    },
    data: payload,
    responseType: 'json',
  });
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`SportyBet mobile fetch failed with status ${response.status}`);
  }
  return uploadProviderPacket({
    source: 'sportybet',
    endpoint: 'wapConfigurableEventsByOrder',
    scope,
    device_id: Capacitor.getPlatform(),
    captured_at: new Date().toISOString(),
    request: payload,
    response: response.data,
  });
};

export const getSystemActivity = (limit = 30) =>
  api.get('/system/activity', { params: { limit } }).then(r => r.data);

export const getWorldCupSpecialStatus = () =>
  api.get('/competition-special/world-cup/status').then(r => r.data);

export const getWorldCupSpecialBuffer = (limit = 200) =>
  api.get('/competition-special/world-cup/buffer', { params: { limit } }).then(r => r.data);

export const setWorldCupSpecialSettings = (payload: any) =>
  api.post('/competition-special/world-cup/settings', payload).then(r => r.data);

export const syncWorldCupSpecial = (params: { startDate?: string; endDate?: string; limitDays?: number } = {}) =>
  api.post('/competition-special/world-cup/sync', null, {
    params: {
      start_date: params.startDate,
      end_date: params.endDate,
      limit_days: params.limitDays ?? 2,
    },
  }).then(r => r.data);

export const enrichPredictWorldCupSpecial = (limit = 4, allowRepeat = false) =>
  api.post('/competition-special/world-cup/enrich-predict', null, {
    params: { limit, allow_repeat: allowRepeat },
  }).then(r => r.data);

export const triggerWorldCupSpecial = () =>
  api.post('/mongo/scan/world-cup-special').then(r => r.data);

export const triggerCompetitionCycles = () =>
  api.post('/mongo/scan/world-cup-special').then(r => r.data);

export const getCompetitionPage = (key: string, bufferLimit = 200) =>
  api.get(`/competition-special/${encodeURIComponent(key)}/page`, { params: { buffer_limit: bufferLimit } }).then(r => r.data);

// ── Competition special (curated SofaScore top 30) ────────────
export const getCompetitionCatalogue = () =>
  api.get('/competition-special/competitions').then(r => r.data);

export const getCompetitionSpecialStatus = (key: string) =>
  api.get(`/competition-special/${encodeURIComponent(key)}/status`).then(r => r.data);

export const getCompetitionSpecialBuffer = (key: string, limit = 200) =>
  api.get(`/competition-special/${encodeURIComponent(key)}/buffer`, { params: { limit } }).then(r => r.data);

export const setCompetitionSpecialSettings = (key: string, payload: any) =>
  api.post(`/competition-special/${encodeURIComponent(key)}/settings`, payload).then(r => r.data);

export const syncCompetitionSpecial = (key: string, limitDays = 3) =>
  api.post(`/competition-special/${encodeURIComponent(key)}/sync`, null, {
    params: { limit_days: limitDays },
  }).then(r => r.data);

export const enrichPredictCompetitionSpecial = (key: string, limit = 8) =>
  api.post(`/competition-special/${encodeURIComponent(key)}/enrich-predict`, null, {
    params: { limit },
  }).then(r => r.data);

export const getCompetitionSpecialDashboard = (bufferLimit = 50) =>
  api.get('/composite/competition-special/dashboard', { params: { buffer_limit: bufferLimit } }).then(r => r.data);

// ── Prediction history ───────────────────────────────────────
export const refreshPredictions = () =>
  api.post('/predictions/refresh').then(r => r.data);

export const getPredictionsToday = () =>
  api.get('/predictions/today').then(r => r.data);

export const getPredictionHistory = (limit = 200) =>
  api.get(`/predictions/history?limit=${limit}`).then(r => r.data);

export const getPredictionCheckData = (limit = 500) =>
  api.get(`/predictions/check-data?limit=${limit}`).then(r => r.data);

export const getPredictionAccuracy = (daysBack = 30) =>
  api.get(`/predictions/accuracy?days_back=${daysBack}`).then(r => r.data);

// ── Betbuilder ───────────────────────────────────────────────
export const saveBetbuilder = (payload: { selections: any[]; request?: any; builder_request?: any }) =>
  api.post('/betbuilder', payload).then(r => r.data);

export const buildAutoBetbuilder = (payload: any) =>
  api.post('/betbuilder/auto', payload).then(r => r.data);

export const bookBetbuilder = (payload: { selections: any[]; stake: number; loadingShareCode?: string | null }) =>
  api.post('/betbuilder/book', payload).then(r => r.data);

export const getEnrichedAnalysis = (matchId: string, forceRefresh = false) =>
  api.post(`/matches/${encodeURIComponent(matchId)}/enriched-analysis`, { force_refresh: forceRefresh }).then(r => r.data);

export const synthesizeSurePicks = (payload: any) =>
  api.post('/betbuilder/sure-picks', payload).then(r => r.data);

export const getBetbuilderHistory = (limit = 100) =>
  api.get(`/betbuilder/history?limit=${limit}`).then(r => r.data);

export const gradeBetbuilderHistory = (limit = 300) =>
  api.post(`/betbuilder/grade?limit=${limit}`).then(r => r.data);

// ── Manual scan triggers ─────────────────────────────────────
// NOTE: These are deprecated. The scheduler handles all ingestion, enrichment,
// and grading automatically. Keep these for emergency debugging only.

/** @deprecated Scheduler handles upcoming ingestion automatically */
export const triggerIngestUpcoming = () =>
  api.post('/mongo/scan/upcoming').then(r => r.data);

/** @deprecated Scheduler handles live ingestion automatically */
export const triggerIngestLive = () =>
  api.post('/mongo/scan/live').then(r => r.data);

/** @deprecated Scheduler handles odds refresh automatically */
export const triggerRefreshBufferOdds = () =>
  api.post('/mongo/scan/refresh-odds').then(r => r.data);

/** @deprecated Scheduler handles enrichment automatically */
export const triggerEnrichWorker = () =>
  api.post('/mongo/scan/enrich').then(r => r.data);

/** @deprecated Scheduler handles live priority automatically */
export const triggerLivePriority = (count = 30) =>
  api.post('/mongo/scan/live-priority', null, { params: { count } }).then(r => r.data);

export const getLivePriorityMode = () =>
  api.get('/mongo/live-priority').then(r => r.data);

export const setLivePriorityMode = (enabled: boolean) =>
  api.post('/mongo/live-priority', { enabled }).then(r => r.data);

/** @deprecated Scheduler handles match+enrich automatically */
export const triggerMatchAndEnrich = (count = 12) =>
  api.post('/mongo/scan/match-and-enrich', null, { params: { count } }).then(r => r.data);

/** @deprecated Scheduler handles grading automatically */
export const triggerGradeResults = (hoursBack = 24) =>
  api.post(`/results/grade?hours_back=${hoursBack}`).then(r => r.data);

export const getOddsOnlyPredictions = () =>
  api.get('/predictions/odds-only').then(r => r.data);

export const getSignalStats = (country = '', tournament = '', minSamples = 5) =>
  api.get('/analytics/signals', { params: { country, tournament, min_samples: minSamples } }).then(r => r.data);

export const getSignalMatches = (signalName = 'consensus_longshot_value', result = '', limit = 300) =>
  api.get('/analytics/signal-matches', {
    params: { signal_name: signalName, result, limit },
  }).then(r => r.data);

export const getModelExplorer = (params: { preset?: string; model?: string; pickType?: string; selectionKey?: string; minSamples?: number; limit?: number }) =>
  api.get('/analytics/model-explorer', {
    params: {
      preset: params.preset || 'all',
      model: params.model || 'all',
      pick_type: params.pickType || '',
      selection_key: params.selectionKey || '',
      min_samples: params.minSamples ?? 1,
      limit: params.limit ?? 500,
    },
  }).then(r => r.data);

export const triggerFlushToMongo = (date?: string) =>
  api.post('/mongo/flush', null, { params: date ? { match_date: date } : {} }).then(r => r.data);

export const triggerBufferCleanup = () =>
  api.post('/mongo/cleanup').then(r => r.data);

// ── Composite endpoints (single-call page loaders) ───────────────────────────
export const getPredictionDashboard = () =>
  api.get('/composite/prediction-dashboard').then(r => r.data);

export const getAnalyticsDashboard = (days = 30) =>
  api.get('/composite/analytics-dashboard', { params: { days } }).then(r => r.data);

// ── Pipeline Control ─────────────────────────────────────────────────────────
export const getPipelines = () =>
  api.get('/pipelines').then(r => r.data);

export const enablePipeline = (engineId: string) =>
  api.post(`/pipelines/${engineId}/enable`).then(r => r.data);

export const disablePipeline = (engineId: string) =>
  api.post(`/pipelines/${engineId}/disable`).then(r => r.data);

export const applyPipelinePreset = (preset: 'cloud' | 'local' | 'off') =>
  api.post(`/pipelines/preset/${preset}`).then(r => r.data);

export const getSchedulerIntervals = (activeOnly = true) =>
  api.get('/scheduler/intervals', { params: { active_only: activeOnly } }).then(r => r.data);

export const patchSchedulerIntervals = (intervals: Record<string, number>) =>
  api.patch('/scheduler/intervals', { intervals }).then(r => r.data);

export const resetSchedulerIntervals = () =>
  api.post('/scheduler/intervals/reset').then(r => r.data);

// ── SofaScore-only pipeline (cloud mode) ─────────────────────────────────────
export const getSofaPipelineStatus = () =>
  api.get('/sofa-pipeline/status').then(r => r.data);

export const toggleSofaPipeline = (enabled: boolean) =>
  api.post('/sofa-pipeline/toggle', { enabled }).then(r => r.data);

export const runSofaPipeline = (params: { date?: string; ingestLimit?: number; enrichBatch?: number } = {}) =>
  api.post('/sofa-pipeline/run', null, {
    params: {
      date: params.date,
      ingest_limit: params.ingestLimit ?? 300,
      enrich_batch: params.enrichBatch ?? 20,
    },
  }).then(r => r.data);

export const sofaPipelineIngest = (date?: string, limit = 300) =>
  api.post('/sofa-pipeline/ingest', null, { params: { date, limit } }).then(r => r.data);

export const sofaPipelineEnrich = (date?: string, batchSize = 10, liveOnly = false) =>
  api.post('/sofa-pipeline/enrich', null, {
    params: { date, batch_size: batchSize, live_only: liveOnly },
  }).then(r => r.data);

export default api;
