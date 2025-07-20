import { create } from 'zustand';
import * as api from '../services/api';

interface Match {
  id: string;
  number: string;
  type: string;
  price: number;
  capacity: number;
  amenities: string[];
  isAvailable: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface MatchState {
  Matches: Match[];
  availableMatches: Match[];
  currentMatch: Match | null;
  loading: boolean;
  error: string | null;
  

  
}

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

  getLiveMatches: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.getLiveMatches();
      if (!response.success) throw new Error(response.error || 'Failed to fetch available Matches');
      set({ availableMatches: response.Matches, loading: false });
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

  getAllCountry: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.getAllCountry();
      if (!response.success) throw new Error(response.error || 'Country not found');
      set({ AvailableCountry: response.Country, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },


  getCountryById: async (id: number) => {
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