import { create } from 'zustand';
import * as api from '../../services/apis/footballApi';

interface FootballState {
  loading: boolean;
  error: string | null;
  getTodayMatches: () => Promise<any>;
  getMatchesByDate: (date: string) => Promise<any>;
  getMatchDetail: (id: string) => Promise<any>;
}

const wrap = (set: any, fn: () => Promise<any>, showLoading = true) => async () => {
  if (showLoading) set({ loading: true, error: null });
  try {
    const res = await fn();
    set({ loading: false });
    return res;
  } catch (err: any) {
    set({ loading: false, error: err.message });
    throw err;
  }
};

export const useFootballStore = create<FootballState>((set) => ({
  loading: false,
  error: null,
  getTodayMatches: () => wrap(set, api.getTodayMatches)(),
  getMatchesByDate: (date) => wrap(set, () => api.getMatchesByDate(date))(),
  // Match detail is a targeted fetch — always show loading
  getMatchDetail: (id) => wrap(set, () => api.getMatchDetail(id))(),
}));
