import { create } from 'zustand';
import * as api from '../services/api';


export const useMatchStore = create<MatchState>((set, get) => ({
  Matches: [],
  availableMatches: [],
  availableCountry: [],
  currentMatch: null,
  currentCountry: null,
  loading: false,
  error: null,

  fetchMatchesByDate: async (date:string) => {
    set({ loading: true, error: null });
    try {
      const response = await api.getAllMatchesByDate(date);
      if (!response.success) throw new Error(response.error || 'Failed to fetch Matches');
      set({ Matches: response.Matches, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },


  getMatchById: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const response = await api.getMatchById(id);
      if (!response.success) throw new Error(response.error || 'Match not found');
      set({ currentMatch: response.Match, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  getAllCountries: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.getAllCountry();
      if (!response.success) throw new Error(response.error || 'Country not found');
      set({ availableCountry: response.Country, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },


  getCountryById: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const response = await api.getCountryById(id);
      if (!response.success) throw new Error(response.error || 'Country not found');
      set({ currentCountry: response.Country, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

    getTeamById: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const response = await api.getCountryById(id);
      if (!response.success) throw new Error(response.error || 'Country not found');
      set({ currentCountry: response.Country, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  
    getPlayerById: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const response = await api.getCountryById(id);
      if (!response.success) throw new Error(response.error || 'Country not found');
      set({ currentCountry: response.Country, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  

}));