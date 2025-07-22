import { create } from 'zustand';
import * as api from '../services/api';

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  analytics: [],
  bot: [],
  loading: false,
  error: null,

  getOverview: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.getAnalyticsOverview();
      if (!response.success) throw new Error(response.error || 'Country not found');
      set({ analytics: response.data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  getBotMetrics: async (id:string) => {
    set({ loading: true, error: null });
    try {
      const response = await api.getAnalyticsOverview();
      if (!response.success) throw new Error(response.error || 'Country not found');
      set({ bot: response.data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  getBotPredictions: async (id:string) => {
    set({ loading: true, error: null });
    try {
      const response = await api.getAnalyticsOverview();
      if (!response.success) throw new Error(response.error || 'Country not found');
      set({ bot: response.data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  } 

}));