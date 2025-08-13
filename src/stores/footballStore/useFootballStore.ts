import { create } from 'zustand';
import * as api from '../../services/apis/footballApi';

interface FootballState {
  loading: boolean;
  error: string | null;
  fetchLiveMatches: () => Promise<any>;
  fetchMatchesByDate: (date: string) => Promise<any>;
  getMatchById: (id: string) => Promise<any>;
  getAllCountries: () => Promise<any>;
  getCountryById: (id: string) => Promise<any>;
  getTeamById: (id: string) => Promise<any>;
  getPlayerById: (id: string) => Promise<any>;
}

export const useFootballStore = create<FootballState>((set) => ({
  loading: false,
  error: null,

  fetchLiveMatches: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.getLiveMatches();
      set({ loading: false });
      return response;
    } catch (err: any) {
      set({ loading: false, error: err.message });
      throw err;
    }
  },

  fetchMatchesByDate: async (date: string) => {
    set({ loading: true, error: null });
    try {
      const response = await api.getAllMatchesByDate(date);
      set({ loading: false });
      return response;
    } catch (err: any) {
      set({ loading: false, error: err.message });
      throw err;
    }
  },

  getMatchById: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const response = await api.getMatchById(id);
      set({ loading: false });
      return response;
    } catch (err: any) {
      set({ loading: false, error: err.message });
      throw err;
    }
  },

  getAllCountries: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.getAllCountry();
      set({ loading: false });
      return response;
    } catch (err: any) {
      set({ loading: false, error: err.message });
      throw err;
    }
  },

  getCountryById: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const response = await api.getCountryById(id);
      set({ loading: false });
      return response;
    } catch (err: any) {
      set({ loading: false, error: err.message });
      throw err;
    }
  },

  getTeamById: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const response = await api.getTeamById(id); // ✅ fixed wrong call
      set({ loading: false });
      return response;
    } catch (err: any) {
      set({ loading: false, error: err.message });
      throw err;
    }
  },

  getPlayerById: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const response = await api.getPlayerById(id); // ✅ fixed wrong call
      set({ loading: false });
      return response;
    } catch (err: any) {
      set({ loading: false, error: err.message });
      throw err;
    }
  },
}));
