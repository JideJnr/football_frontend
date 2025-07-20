import { create } from 'zustand';
import * as api from '../services/api';

interface AuthState {
  user: {
    uid: string;
    email: string;
    firstName: string;
    role: string;
  } | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (payload:any) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const response = await api.login({ email, password });
      if (!response.success) {
        const errMsg = response.error || 'Login failed';
        set({ error: errMsg, loading: false, user: null });
        throw new Error(errMsg); 
      }
      set({ user: response.user, loading: false, error: null });
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify({
          uid: response.user.uid,
          email: response.user.email,
          firstName: response.user.firstName,
          role: response.user.role
        }));
        if (response.overview) {
          localStorage.setItem('overview', JSON.stringify({
            totalRooms: response.overview?.totalRooms,
            totalBookings: response.overview?.totalBookings,
            totalCustomers: response.overview?.totalCustomers,
            totalStaff: response.overview?.totalStaff,
            amount: response.overview?.Amount
          }))
        }

      return response
    } catch (err: any) {
      const msg = err.message || 'Login failed';
      set({ error: msg, loading: false, user: null });
      throw new Error(msg); 
    }
  },
  
  logout: async () => {
    set({ loading: true });
    try {
      await api.logout();
      set({ user: null, loading: false });
      localStorage.removeItem('authToken');
    } catch (err: any) {
      set({ 
        error: err.message || 'Logout failed',
        loading: false 
      });
    }
  },
  
  signup: async (payload) => {
    set({ loading: true, error: null });
    try {
      const response = await api.signup(payload);
  
      if (!response.success) {
        const errMsg = response.error || 'SignUp failed';
        set({ error: errMsg, loading: false, user: null });
        throw new Error(errMsg); // 💡 Throw error here to catch it in SignIn
      }
  
      set({ user: response.user, loading: false, error: null });
      if (response.token) {
        localStorage.setItem('authToken', response.token);
      }
    } catch (err: any) {
      const msg = err.message || 'Login failed';
      set({ error: msg, loading: false, user: null });
      throw new Error(msg); 
    }
  },
  
}));