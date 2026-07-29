// ─────────────────────────────────────────────────────────────
//  Prediction Store — persists engines config + accepted picks
//  Backend predictions are the source of truth. The client-side
//  engine is kept as a fallback for matches without backend data.
//  Engines are always on — no toggle needed.
//  Match grading automatically assigns engines and records results.
// ─────────────────────────────────────────────────────────────
import { create } from 'zustand';
import { DEFAULT_ENGINES, PredictionEngine, MatchSignal, runEngines, assignEnginesToMatch } from './engine';
import { getPredictionsToday, getUpcomingEnrichedPredicted } from '../services/apis/footballApi';
import { learningStore, recordEngineResult, getMatchEngineAssignments, MatchEngineAssignment } from './engineLearning';

interface PredictionState {
  engines: PredictionEngine[];
  signals: MatchSignal[];
  acceptedPicks: MatchSignal[];
  lastRun: number | null;
  running: boolean;
  backendPredictionsLoaded: boolean;
  matchAssignments: Record<string, MatchEngineAssignment[]>;

  // actions
  runPredictions: (matches: any[]) => void;
  loadBackendPredictions: () => Promise<void>;
  initBackendPredictions: () => Promise<void>;
  updateEngineRule: (engineId: string, ruleIndex: number, patch: Partial<PredictionEngine['rules'][0]>) => void;
  acceptSignal: (matchId: string, engineId: string, market: string) => void;
  rejectSignal: (matchId: string, engineId: string, market: string) => void;
  undoReject: (matchId: string, engineId: string, market: string) => void;
  markResult: (matchId: string, engineId: string, market: string, result: 'won' | 'lost') => void;
  gradeMatch: (matchId: string, result: 'won' | 'lost', matchData?: any) => void;
  assignEnginesToMatch: (matchId: string, matchData: any) => void;
  clearAccepted: () => void;
  refreshEngineLearning: () => void;
}

/** Convert a backend prediction into a MatchSignal for the store. */
function backendPredictionToSignal(prediction: any): MatchSignal {
  const bestPick = prediction.best_pick || (prediction.picks?.[0] ?? {});
  const conf = bestPick.confidence ?? prediction.confidence ?? 50;
  const confidenceLevel: 'low' | 'medium' | 'high' = conf >= 70 ? 'high' : conf >= 55 ? 'medium' : 'low';
  return {
    matchId: prediction.match_id ?? prediction.matchId ?? '',
    matchName: prediction.match_name ?? prediction.matchName ?? '',
    tournament: prediction.league_name ?? prediction.leagueName ?? '',
    startTime: 0,
    homeTeam: '',
    awayTeam: '',
    engineId: 'backend_ai',
    engineName: 'Backend AI',
    engineIcon: '🤖',
    signalType: 'value_bet',
    market: bestPick.type ?? prediction.pick_type ?? '1x2',
    pick: bestPick.selection ?? prediction.selection ?? '',
    odds: bestPick.odds ?? 0,
    modelProbability: conf / 100,
    impliedProbability: 0,
    valueEdge: bestPick.edge ?? 0,
    confidence: confidenceLevel,
    status: 'pending',
    note: bestPick.reason ?? prediction.reason ?? '',
  };
}

export const usePredictionStore = create<PredictionState>((set, get) => ({
  engines: DEFAULT_ENGINES.map(e => ({
    ...e,
    alwaysOn: true,  // All engines are always on
  })),
  signals: [],
  acceptedPicks: [],
  lastRun: null,
  running: false,
  backendPredictionsLoaded: false,
  matchAssignments: {},

  /** Fetch backend predictions and merge them into the store as the primary signals. */
  loadBackendPredictions: async () => {
    try {
      const data = await getPredictionsToday();
      const predictions = data?.predictions ?? [];
      const signals: MatchSignal[] = predictions.map(backendPredictionToSignal);
      set({ signals, backendPredictionsLoaded: true, lastRun: Date.now() });
    } catch {
      // Backend predictions unavailable — keep existing signals
    }
  },

  /** Auto-load backend predictions on store init. */
  initBackendPredictions: async () => {
    await get().loadBackendPredictions();
    // Refresh every 60s
    setInterval(() => get().loadBackendPredictions(), 60000);
  },

  runPredictions: (matches: any[]) => {
    set({ running: true });
    // Backend predictions are the authority. The client-side engine is
    // kept as a fallback for matches without backend data.
    const signals = runEngines(matches, get().engines);
    set({ signals, running: false, lastRun: Date.now() });
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

  gradeMatch: (matchId, result, matchData) => {
    // Grade all pending signals for this match
    const { signals, engines } = get();
    const matchSignals = signals.filter(s => s.matchId === matchId && s.status === 'pending');

    for (const signal of matchSignals) {
      const won = result === 'won';
      recordEngineResult(matchId, signal.engineId, won);

      // Update local stats
      get().markResult(matchId, signal.engineId, signal.market, result);
    }

    // Also grade any engine assignments from the learning store
    const assignments = getMatchEngineAssignments(matchId);
    for (const assignment of assignments) {
      if (assignment.result === 'pending') {
        const won = result === 'won';
        recordEngineResult(matchId, assignment.engineId, won);
      }
    }
  },

  assignEnginesToMatch: (matchId, matchData) => {
    const { engines } = get();
    const assignments = assignEnginesToMatch(matchData, engines);

    set((state) => ({
      matchAssignments: {
        ...state.matchAssignments,
        [matchId]: assignments,
      },
    }));

    // Also record in learning store
    for (const assignment of assignments) {
      learningStore.recordPrediction(
        assignment.engineId,
        assignment.ruleIndex,
        matchId,
        assignment.prediction.market,
        assignment.prediction.pick,
        assignment.prediction.odds,
        assignment.prediction.probability,
        assignment.prediction.valueEdge,
        assignment.context
      );
    }
  },

  clearAccepted: () => set({ acceptedPicks: [] }),

  refreshEngineLearning: () => {
    // Refresh engine learning data from the store
    const { engines } = get();
    const updatedEngines = engines.map(e => {
      const learning = learningStore.getEngineLearning(e.id);
      if (!learning) return e;
      return {
        ...e,
        learning: {
          winRate: learning.winRate,
          totalPredictions: learning.totalPredictions,
          topRules: learning.rulePerformance
            .sort((a, b) => b.winRate - a.winRate)
            .slice(0, 3)
            .map(r => ({ ruleIndex: r.ruleIndex, winRate: r.winRate, fires: r.totalFires })),
        },
      };
    });
    set({ engines: updatedEngines });
  },
}));
