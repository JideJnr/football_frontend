import axios from 'axios';

const BASE_URL = 'http://127.0.0.1:8000';

const api = axios.create({ baseURL: BASE_URL });

// ── Matches ──────────────────────────────────────────────────
export const getTodayMatches = () =>
  api.get('/matches/today').then(r => r.data);

export const getMatchDetail = (id: string) =>
  api.get(`/matches/today/${id}`).then(r => r.data);

export const getMatchesByDate = (date: string) =>
  api.get(`/matches/by-date/${date}`).then(r => r.data);

export const getLiveMatches = () =>
  api.get('/matches/live').then(r => r.data);

// ── Per-match actions ────────────────────────────────────────
export const enrichMatch = (id: string) =>
  api.post(`/matches/${id}/enrich`).then(r => r.data);

export const predictMatch = (id: string) =>
  api.post(`/matches/${id}/predict`).then(r => r.data);

export const getSofascoreCandidates = (id: string) =>
  api.get(`/matches/${id}/sofascore-candidates`).then(r => r.data);

export const matchSofascoreCandidate = (
  id: string,
  payload: { sofascore_id: string | number; match_date?: string }
) => api.post(`/matches/${id}/sofascore-match`, payload).then(r => r.data);

// ── Buffer status ────────────────────────────────────────────
export const getBufferStatus = () =>
  api.get('/buffer/status').then(r => r.data);

// ── Prediction history ───────────────────────────────────────
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

export default api;
