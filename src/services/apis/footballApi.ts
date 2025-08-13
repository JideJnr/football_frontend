import axios from 'axios';

const BASE_URL = 'https://api-football-cy7l.onrender.com';

const api = axios.create({
  baseURL: BASE_URL
});

export const getLiveMatches = async () => {
  const response = await api.get<Response>('/matches/live');
  return response.data;
};

export const getAllMatchesByDate = async (date: string) => {
  const response = await api.get<Response>('/matches/date', { params: { date } });
  return response.data;
};

export const getMatchById = async (id: string) => {
  const response = await api.get<Response>(`/matches/${id}`);
  return response.data;
};

export const getAllCountry = async () => {
  const response = await api.get<Response>('/country');
  return response.data;
};

export const getCountryById = async (id: string) => {
  const response = await api.get<Response>(`/country/${id}`);
  return response.data;
};

export const getTeamById = async (id: string) => {
  const response = await api.get<Response>(`/team/${id}`);
  return response.data;
};

export const getPlayerById = async (id: string) => {
  const response = await api.get<Response>(`/player/${id}`);
  return response.data;
};

export default api;