// ─────────────────────────────────────────────────────────────
//  Bet Slip Store — persistent across navigation and refreshes
//  Uses Zustand with localStorage persistence.
// ─────────────────────────────────────────────────────────────
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface BetSlipSelection {
  id: string;                    // unique id for this selection (match_id + selection hash)
  match_id: string;
  match: string;                 // "Home vs Away"
  league: string;
  country: string;
  selection: string;             // e.g. "Home Win", "Over 2.5"
  pick_type: string;             // e.g. "match_result", "goals"
  odds: number;
  confidence?: number;
  added_at: number;              // timestamp
}

interface BetSlipState {
  selections: BetSlipSelection[];
  lastError: string | null;
  lastSuccess: string | null;

  // actions
  addSelection: (selection: Omit<BetSlipSelection, 'id' | 'added_at'>) => { success: boolean; error?: string };
  removeSelection: (id: string) => void;
  clearSelections: () => void;
  updateSelectionOdds: (id: string, odds: number) => void;
  setError: (error: string | null) => void;
  setSuccess: (message: string | null) => void;
  getCombinedOdds: () => number;
  getSelectionCount: () => number;
  hasSelection: (matchId: string) => boolean;
}

const generateId = (matchId: string, selection: string, pickType: string) =>
  `${matchId}::${selection}::${pickType}`.replace(/\s+/g, '_').toLowerCase();

export const useBetSlipStore = create<BetSlipState>()(
  persist(
    (set, get) => ({
      selections: [],
      lastError: null,
      lastSuccess: null,

      addSelection: (selection) => {
        const id = generateId(selection.match_id, selection.selection, selection.pick_type);
        const existing = get().selections.find(s => s.id === id);

        if (existing) {
          set({ lastError: 'This selection is already in your bet slip', lastSuccess: null });
          return { success: false, error: 'This selection is already in your bet slip' };
        }

        const newSelection: BetSlipSelection = {
          ...selection,
          id,
          added_at: Date.now(),
        };

        set(state => ({
          selections: [...state.selections, newSelection],
          lastError: null,
          lastSuccess: `Added: ${selection.selection} (${selection.match})`,
        }));

        // Clear success message after 3 seconds
        setTimeout(() => {
          if (get().lastSuccess === `Added: ${selection.selection} (${selection.match})`) {
            set({ lastSuccess: null });
          }
        }, 3000);

        return { success: true };
      },

      removeSelection: (id) => {
        set(state => ({
          selections: state.selections.filter(s => s.id !== id),
          lastError: null,
        }));
      },

      clearSelections: () => {
        set({ selections: [], lastError: null, lastSuccess: null });
      },

      updateSelectionOdds: (id, odds) => {
        set(state => ({
          selections: state.selections.map(s =>
            s.id === id ? { ...s, odds } : s
          ),
        }));
      },

      setError: (error) => set({ lastError: error, lastSuccess: null }),
      setSuccess: (message) => set({ lastSuccess: message, lastError: null }),

      getCombinedOdds: () => {
        const selections = get().selections;
        if (!selections.length) return 0;
        return selections.reduce((total, pick) => total * Number(pick.odds || 1), 1);
      },

      getSelectionCount: () => get().selections.length,

      hasSelection: (matchId) => get().selections.some(s => s.match_id === matchId),
    }),
    {
      name: 'bet-slip-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        selections: state.selections,
      }),
    }
  )
);
