import { create } from 'zustand';

interface TennisState {
  matches: any[];
  loading: boolean;
  error: string | null;
  setMatches: (matches: any[]) => void;
}

export const useTennisStore = create<TennisState>((set) => ({
  matches: [],
  loading: false,
  error: null,
  setMatches: (matches) => set({ matches }),
}));
