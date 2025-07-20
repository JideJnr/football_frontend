import axios from 'axios';
import { ApiErrorResponse,  } from '../interfaces/interface';

const BASE_URL = 'https://api-football-cy7l.onrender.com';

const api = axios.create({
  baseURL: BASE_URL
});

export const login = async (credentials: { email: string; password: string }) => {
  const response = await api.post<LoginSuccessResponse | ApiErrorResponse>(
    '/api/v1/auth/signin', 
    credentials
  );
  return response.data; 
};

export const signup = async (credentials: { email: string; password: string }) => {
  const response = await api.post<SignupSuccessResponse | ApiErrorResponse>(
    '/api/v1/auth/signup', 
    credentials
  );
  return response.data; 
};

export const logout = () => api.post('/api/v1/auth/logout');


export const getAllMatchesByDate = async (date: string) => {
  const response = await api.get<GetAllMatchesResponse | ApiErrorResponse>('/matches',{params: { date }});
  return response.data;
};

export const getMatchById = async (id: string) => {
  const response = await api.get<SingleMatchResponse | ApiErrorResponse>(`/matches/${id}`);
  return response.data;
};

export const getAllCountry = async () => {
  const response = await api.get<GetAllCountriesResponse | ApiErrorResponse>('/country/all');
  return response.data;
};

export const getCountryById = async (id: string) => {
  const response = await api.get<SingleCountryResponse | ApiErrorResponse>(`/country/${id}`);
  return response.data;
};

export const getTeamById = async (id: string) => {
  const response = await api.get<SingleCountryResponse | ApiErrorResponse>(`/country/${id}`);
  return response.data;
};

export const getPlayerById = async (id: string) => {
  const response = await api.get<SingleCountryResponse | ApiErrorResponse>(`/country/${id}`);
  return response.data;
};

export const startEngine = async () => {
  const response = await api.post<any>(`/start`);
  return response.data;
};

export const stopEngine = async () => {
  const response = await api.post<any>(`/stop`);
  return response.data;
};

export const getAllBot = async () => {
  const response = await api.get<any>(`/all`);
  return response.data;
};

export const startBotById = async () => {
  const response = await api.post<any>(`/start/id`);
  return response.data;
};

export const stopBotById = async () => {
  const response = await api.post<any>(`/stop/id`);
  return response.data;
};

export const getBotStatus = async () => {
  const response = await api.post<any>(`/status/id`);
  return response.data;
};

export const runBetBuilder = async () => {
  const response = await api.get<any>(`/betBuilder`);
  return response.data;
};

export const postPrediction = async () => {
  const response = await api.post<any>(`/prediction`);
  return response.data;
};

export const getAllPredictionsByDate = async (id: string) => {
  const response = await api.get<SingleCountryResponse | ApiErrorResponse>(`/country/${id}`);
  return response.data;
};

export const getPredictionById = async (id: string) => {
  const response = await api.get<SingleCountryResponse | ApiErrorResponse>(`/country/${id}`);
  return response.data;
};




export default api;