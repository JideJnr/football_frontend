import { create } from 'zustand';

interface BasketballState {
  matches: any[];
  loading: boolean;
  error: string | null;
  setMatches: (matches: any[]) => void;
}

export const useBasketballStore = create<BasketballState>((set) => ({
  matches: [],
  loading: false,
  error: null,
  setMatches: (matches) => set({ matches }),
}));
