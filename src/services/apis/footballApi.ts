import axios from 'axios';

const BASE_URL = 'http://127.0.0.1:8000';

const api = axios.create({ baseURL: BASE_URL });

export const LIVE_WS_URL = BASE_URL.replace(/^http/, 'ws') + '/ws/live';

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
export const enrichMatch = (id: string) =>
  api.post(`/matches/${id}/enrich`).then(r => r.data);

export const predictMatch = (id: string) =>
  api.post(`/matches/${id}/predict`).then(r => r.data);

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

// ── Prediction history ───────────────────────────────────────
export const refreshPredictions = () =>
  api.post('/predictions/refresh').then(r => r.data);

export const getPredictionsToday = () =>
  api.get('/predictions/today').then(r => r.data);

export const getPredictionHistory = (limit = 200) =>
  api.get(`/predictions/history?limit=${limit}`).then(r => r.data);

// ── Betbuilder ───────────────────────────────────────────────
export const saveBetbuilder = (payload: { selections: any[] }) =>
  api.post('/betbuilder', payload).then(r => r.data);

export const getBetbuilderHistory = (limit = 100) =>
  api.get(`/betbuilder/history?limit=${limit}`).then(r => r.data);

// ── Manual scan triggers ─────────────────────────────────────
export const triggerIngestUpcoming = () =>
  api.post('/mongo/scan/upcoming').then(r => r.data);

export const triggerIngestLive = () =>
  api.post('/mongo/scan/live').then(r => r.data);

export const triggerEnrichWorker = () =>
  api.post('/mongo/scan/enrich').then(r => r.data);

export const triggerMatchAndEnrich = (count = 12) =>
  api.post('/mongo/scan/match-and-enrich', null, { params: { count } }).then(r => r.data);

export const triggerGradeResults = (hoursBack = 24) =>
  api.post(`/results/grade?hours_back=${hoursBack}`).then(r => r.data);

export const getOddsOnlyPredictions = () =>
  api.get('/predictions/odds-only').then(r => r.data);

export const getSignalStats = (country = '', tournament = '', minSamples = 5) =>
  api.get('/analytics/signals', { params: { country, tournament, min_samples: minSamples } }).then(r => r.data);

export const getModelExplorer = (params: { preset?: string; model?: string; minSamples?: number; limit?: number }) =>
  api.get('/analytics/model-explorer', {
    params: {
      preset: params.preset || 'all',
      model: params.model || 'all',
      min_samples: params.minSamples ?? 1,
      limit: params.limit ?? 500,
    },
  }).then(r => r.data);

export const triggerFlushToMongo = (date?: string) =>
  api.post('/mongo/flush', null, { params: date ? { match_date: date } : {} }).then(r => r.data);

export const triggerBufferCleanup = () =>
  api.post('/mongo/cleanup').then(r => r.data);

export default api;
