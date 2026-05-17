// ─────────────────────────────────────────────────────────────
//  Prediction Store — persists engines config + accepted picks
// ─────────────────────────────────────────────────────────────
import { create } from 'zustand';
import { DEFAULT_ENGINES, PredictionEngine, MatchSignal, runEngines } from './engine';

interface PredictionState {
  engines: PredictionEngine[];
  signals: MatchSignal[];
  acceptedPicks: MatchSignal[];
  lastRun: number | null;
  running: boolean;

  // actions
  runPredictions: (matches: any[]) => void;
  toggleEngine: (id: string) => void;
  updateEngineRule: (engineId: string, ruleIndex: number, patch: Partial<PredictionEngine['rules'][0]>) => void;
  acceptSignal: (matchId: string, engineId: string, market: string) => void;
  rejectSignal: (matchId: string, engineId: string, market: string) => void;
  undoReject: (matchId: string, engineId: string, market: string) => void;
  markResult: (matchId: string, engineId: string, market: string, result: 'won' | 'lost') => void;
  clearAccepted: () => void;
}

export const usePredictionStore = create<PredictionState>((set, get) => ({
  engines: DEFAULT_ENGINES,
  signals: [],
  acceptedPicks: [],
  lastRun: null,
  running: false,

  runPredictions: (matches: any[]) => {
    set({ running: true });
    const signals = runEngines(matches, get().engines);
    set({ signals, running: false, lastRun: Date.now() });
  },

  toggleEngine: (id: string) => {
    set((state) => ({
      engines: state.engines.map((e) =>
        e.id === id ? { ...e, enabled: !e.enabled } : e
      ),
    }));
  },

  updateEngineRule: (engineId, ruleIndex, patch) => {
    set((state) => ({
      engines: state.engines.map((e) => {
        if (e.id !== engineId) return e;
        const rules = e.rules.map((r, i) => (i === ruleIndex ? { ...r, ...patch } : r));
        return { ...e, rules };
      }),
    }));
  },

  acceptSignal: (matchId, engineId, market) => {
    set((state) => {
      const signal = state.signals.find(
        (s) => s.matchId === matchId && s.engineId === engineId && s.market === market
      );
      if (!signal) return state;
      const updated = { ...signal, status: 'accepted' as const };
      return {
        signals: state.signals.map((s) =>
          s.matchId === matchId && s.engineId === engineId && s.market === market ? updated : s
        ),
        acceptedPicks: [...state.acceptedPicks.filter(
          (p) => !(p.matchId === matchId && p.engineId === engineId && p.market === market)
        ), updated],
      };
    });
  },

  rejectSignal: (matchId, engineId, market) => {
    set((state) => ({
      signals: state.signals.map((s) =>
        s.matchId === matchId && s.engineId === engineId && s.market === market
          ? { ...s, status: 'rejected' as const }
          : s
      ),
    }));
  },

  undoReject: (matchId, engineId, market) => {
    set((state) => ({
      signals: state.signals.map((s) =>
        s.matchId === matchId && s.engineId === engineId && s.market === market
          ? { ...s, status: 'pending' as const }
          : s
      ),
    }));
  },

  markResult: (matchId, engineId, market, result) => {
    const updateList = (list: MatchSignal[]) =>
      list.map((s) =>
        s.matchId === matchId && s.engineId === engineId && s.market === market
          ? { ...s, status: result }
          : s
      );
    set((state) => {
      // update engine stats
      const engines = state.engines.map((e) => {
        if (e.id !== engineId) return e;
        return {
          ...e,
          stats: {
            ...e.stats,
            total: e.stats.total + 1,
            wins: result === 'won' ? e.stats.wins + 1 : e.stats.wins,
            losses: result === 'lost' ? e.stats.losses + 1 : e.stats.losses,
            pending: Math.max(0, e.stats.pending - 1),
          },
        };
      });
      return {
        engines,
        signals: updateList(state.signals),
        acceptedPicks: updateList(state.acceptedPicks),
      };
    });
  },

  clearAccepted: () => set({ acceptedPicks: [] }),
}));
