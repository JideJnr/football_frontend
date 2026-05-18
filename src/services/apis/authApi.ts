import axios from 'axios';

const BASE_URL = 'https://api-football-cy7l.onrender.com';

const api = axios.create({
  baseURL: BASE_URL
});

type AuthResponse = {
  success?: boolean;
  error?: string;
  token?: string;
  user?: any;
  overview?: any;
};

export const login = async (credentials: { email: string; password: string }) => {
  const response = await api.post<AuthResponse>(
    '/api/v1/auth/signin', 
    credentials
  );
  return response.data; 
};

export const signup = async (credentials: { email: string; password: string }) => {
  const response = await api.post<AuthResponse>(
    '/api/v1/auth/signup', 
    credentials
  );
  return response.data; 
};

export const logout = () => api.post('/api/v1/auth/logout');

export default api;
