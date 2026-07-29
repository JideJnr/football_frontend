// ─────────────────────────────────────────────────────────────
//  Prediction Engine Learning System
//  Tracks engine performance, rule success rates, and
//  enables AI-powered match assignment and prediction.
// ─────────────────────────────────────────────────────────────

import { PredictionEngine, EngineRule, MatchSignal } from './engine';

// ─── Learning Data Types ───────────────────────────────────────────────────────

export interface RulePerformance {
  ruleIndex: number;
  totalFires: number;      // How many times this rule fired
  totalWins: number;       // How many times it won
  totalLosses: number;     // How many times it lost
  winRate: number;         // wins / totalFires (0-1)
  avgOdds: number;         // Average odds when rule fired
  avgValueEdge: number;    // Average value edge
  lastUpdated: number;     // Timestamp of last update
  contextFactors: Record<string, number>;  // What conditions lead to success
}

export interface EngineLearningData {
  engineId: string;
  totalPredictions: number;
  totalWins: number;
  totalLosses: number;
  winRate: number;
  roi: number;             // Return on investment
  rulePerformance: RulePerformance[];
  marketPerformance: Record<string, { fires: number; wins: number; losses: number }>;
  leaguePerformance: Record<string, { fires: number; wins: number; losses: number }>;
  contextWeights: Record<string, number>;  // Learned weights for context factors
  lastUpdated: number;
}

export interface MatchEngineAssignment {
  matchId: string;
  engineId: string;
  ruleIndex: number;
  assignedAt: number;
  context: {
    homeForm: number;
    awayForm: number;
    h2hBias: number;
    tablePressure: { home: string; away: string };
    fatigue: { home: string; away: string };
    motivation: { home: number; away: number };
  };
  prediction: {
    market: string;
    pick: string;
    odds: number;
    probability: number;
    valueEdge: number;
  };
  result?: 'won' | 'lost' | 'pending';
  gradedAt?: number;
}

export interface ValueHunterContext {
  matchId: string;
  matchName: string;
  homeTeam: string;
  awayTeam: string;
  tournament: string;
  startTime: number;
  assignedEngines: Array<{
    engineId: string;
    engineName: string;
    engineIcon: string;
    ruleIndex: number;
    confidence: number;
    winRate: number;
    contextFactors: string[];
    prediction: {
      market: string;
      pick: string;
      odds: number;
      probability: number;
      valueEdge: number;
    };
  }>;
  consensus: {
    bestPick: string;
    bestMarket: string;
    bestOdds: number;
    bestProbability: number;
    bestValueEdge: number;
    confidence: 'low' | 'medium' | 'high';
    supportingEngines: string[];
    riskFactors: string[];
  };
}

// ─── Learning Store ────────────────────────────────────────────────────────────

class LearningStore {
  private engineData: Map<string, EngineLearningData> = new Map();
  private matchAssignments: Map<string, MatchEngineAssignment[]> = new Map();
  private readonly STORAGE_KEY = 'prediction_engine_learning';

  constructor() {
    this.loadFromStorage();
  }

  // ── Engine Learning ──────────────────────────────────────────────────────────

  getEngineLearning(engineId: string): EngineLearningData | undefined {
    return this.engineData.get(engineId);
  }

  getAllEngineLearning(): EngineLearningData[] {
    return Array.from(this.engineData.values());
  }

  recordPrediction(
    engineId: string,
    ruleIndex: number,
    matchId: string,
    market: string,
    pick: string,
    odds: number,
    probability: number,
    valueEdge: number,
    context: MatchEngineAssignment['context']
  ): void {
    const existing = this.engineData.get(engineId);
    if (!existing) {
      this.engineData.set(engineId, this.createEmptyLearning(engineId));
    }

    const data = this.engineData.get(engineId)!;
    data.totalPredictions++;
    data.lastUpdated = Date.now();

    // Update rule performance
    const rulePerf = data.rulePerformance.find(r => r.ruleIndex === ruleIndex);
    if (rulePerf) {
      rulePerf.totalFires++;
      rulePerf.avgOdds = (rulePerf.avgOdds * (rulePerf.totalFires - 1) + odds) / rulePerf.totalFires;
      rulePerf.avgValueEdge = (rulePerf.avgValueEdge * (rulePerf.totalFires - 1) + valueEdge) / rulePerf.totalFires;
      rulePerf.lastUpdated = Date.now();
    } else {
      data.rulePerformance.push({
        ruleIndex,
        totalFires: 1,
        totalWins: 0,
        totalLosses: 0,
        winRate: 0,
        avgOdds: odds,
        avgValueEdge: valueEdge,
        lastUpdated: Date.now(),
        contextFactors: {},
      });
    }

    // Update market performance
    if (!data.marketPerformance[market]) {
      data.marketPerformance[market] = { fires: 0, wins: 0, losses: 0 };
    }
    data.marketPerformance[market].fires++;

    // Record match assignment
    const assignments = this.matchAssignments.get(matchId) || [];
    assignments.push({
      matchId,
      engineId,
      ruleIndex,
      assignedAt: Date.now(),
      context,
      prediction: { market, pick, odds, probability, valueEdge },
      result: 'pending',
    });
    this.matchAssignments.set(matchId, assignments);

    this.saveToStorage();
  }

  recordResult(matchId: string, engineId: string, won: boolean): void {
    const assignments = this.matchAssignments.get(matchId);
    if (!assignments) return;

    const assignment = assignments.find(a => a.engineId === engineId && a.result === 'pending');
    if (!assignment) return;

    assignment.result = won ? 'won' : 'lost';
    assignment.gradedAt = Date.now();

    // Update engine learning
    const data = this.engineData.get(engineId);
    if (data) {
      data.totalWins += won ? 1 : 0;
      data.totalLosses += won ? 0 : 1;
      data.winRate = data.totalPredictions > 0 ? data.totalWins / data.totalPredictions : 0;
      data.roi = data.totalPredictions > 0
        ? (data.totalWins * 1.5 - data.totalLosses) / data.totalPredictions
        : 0;

      // Update rule performance
      const rulePerf = data.rulePerformance.find(r => r.ruleIndex === assignment.ruleIndex);
      if (rulePerf) {
        if (won) rulePerf.totalWins++;
        else rulePerf.totalLosses++;
        rulePerf.winRate = rulePerf.totalFires > 0 ? rulePerf.totalWins / rulePerf.totalFires : 0;
      }

      // Update market performance
      const market = assignment.prediction.market;
      if (data.marketPerformance[market]) {
        if (won) data.marketPerformance[market].wins++;
        else data.marketPerformance[market].losses++;
      }

      data.lastUpdated = Date.now();
    }

    this.saveToStorage();
  }

  // ── Match Assignment Lookup ──────────────────────────────────────────────────

  getMatchAssignments(matchId: string): MatchEngineAssignment[] {
    return this.matchAssignments.get(matchId) || [];
  }

  getEngineMatchHistory(engineId: string, limit = 50): MatchEngineAssignment[] {
    const all: MatchEngineAssignment[] = [];
    for (const assignments of this.matchAssignments.values()) {
      all.push(...assignments.filter(a => a.engineId === engineId));
    }
    return all.sort((a, b) => b.assignedAt - a.assignedAt).slice(0, limit);
  }

  // ── Value Hunter Context ─────────────────────────────────────────────────────

  buildValueHunterContext(matchId: string, match: any): ValueHunterContext | null {
    const assignments = this.matchAssignments.get(matchId);
    if (!assignments || assignments.length === 0) return null;

    const enginePromises = assignments.map(async (assignment) => {
      const engineLearning = this.getEngineLearning(assignment.engineId);
      const rulePerf = engineLearning?.rulePerformance.find(r => r.ruleIndex === assignment.ruleIndex);

      return {
        engineId: assignment.engineId,
        engineName: this.getEngineName(assignment.engineId),
        engineIcon: this.getEngineIcon(assignment.engineId),
        ruleIndex: assignment.ruleIndex,
        confidence: rulePerf?.winRate || 0.5,
        winRate: rulePerf?.winRate || 0,
        contextFactors: this.extractContextFactors(assignment.context),
        prediction: assignment.prediction,
      };
    });

    // For now, return synchronous version (can be made async later)
    const assignedEngines = assignments.map((assignment) => {
      const engineLearning = this.getEngineLearning(assignment.engineId);
      const rulePerf = engineLearning?.rulePerformance.find(r => r.ruleIndex === assignment.ruleIndex);

      return {
        engineId: assignment.engineId,
        engineName: this.getEngineName(assignment.engineId),
        engineIcon: this.getEngineIcon(assignment.engineId),
        ruleIndex: assignment.ruleIndex,
        confidence: rulePerf?.winRate || 0.5,
        winRate: rulePerf?.winRate || 0,
        contextFactors: this.extractContextFactors(assignment.context),
        prediction: assignment.prediction,
      };
    });

    // Build consensus from all assigned engines
    const consensus = this.buildConsensus(assignedEngines);

    return {
      matchId,
      matchName: match?.name || match?.match_name || `${match?.home_team || 'Home'} vs ${match?.away_team || 'Away'}`,
      homeTeam: match?.home_team || '',
      awayTeam: match?.away_team || '',
      tournament: match?.tournament || match?.league_name || 'Unknown',
      startTime: match?.start_time || Date.now(),
      assignedEngines,
      consensus,
    };
  }

  // ── Persistence ──────────────────────────────────────────────────────────────

  private saveToStorage(): void {
    try {
      const data = {
        engineData: Array.from(this.engineData.entries()),
        matchAssignments: Array.from(this.matchAssignments.entries()),
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save learning data to storage:', e);
    }
  }

  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return;

      const data = JSON.parse(raw);
      this.engineData = new Map(data.engineData || []);
      this.matchAssignments = new Map(data.matchAssignments || []);
    } catch (e) {
      console.warn('Failed to load learning data from storage:', e);
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private createEmptyLearning(engineId: string): EngineLearningData {
    return {
      engineId,
      totalPredictions: 0,
      totalWins: 0,
      totalLosses: 0,
      winRate: 0,
      roi: 0,
      rulePerformance: [],
      marketPerformance: {},
      leaguePerformance: {},
      contextWeights: {},
      lastUpdated: Date.now(),
    };
  }

  private getEngineName(engineId: string): string {
    const names: Record<string, string> = {
      value_hunter: 'Value Hunter',
      away_value: 'Away Value',
      over_specialist: 'Over Specialist',
      under_specialist: 'Under Specialist',
      gg_hunter: 'GG Hunter',
      btts_over: 'BTTS + Over',
      safe_home: 'Safe Home',
      draw_specialist: 'Draw Specialist',
      ht_specialist: 'HT Specialist',
      clean_sheet_hunter: 'Clean Sheet',
      form_momentum: 'Form Momentum',
      corners_hunter: 'Corners Hunter',
      sharp_follower: 'Sharp Follower',
      drift_fader: 'Drift Fader',
      home_advantage: 'Home Advantage',
      fatigue_play: 'Fatigue Play',
      goals_over: 'Goals Over',
      goals_under: 'Goals Under',
      btts_yes: 'BTTS Yes',
      btts_no: 'BTTS No',
      ht_ft_double: 'HT/FT Double',
    };
    return names[engineId] || engineId;
  }

  private getEngineIcon(engineId: string): string {
    const icons: Record<string, string> = {
      value_hunter: '💰',
      away_value: '✈️',
      over_specialist: '⚽',
      under_specialist: '🔒',
      gg_hunter: '🎯',
      btts_over: '🔥',
      safe_home: '🏠',
      draw_specialist: '🤝',
      ht_specialist: '⏱️',
      clean_sheet_hunter: '🧤',
      form_momentum: '📈',
      corners_hunter: '📐',
      sharp_follower: '🔪',
      drift_fader: '📉',
      home_advantage: '🏠',
      fatigue_play: '😓',
      goals_over: '⚽',
      goals_under: '🛡️',
      btts_yes: '🎯',
      btts_no: '🚫',
      ht_ft_double: '⏱️🏆',
    };
    return icons[engineId] || '📡';
  }

  private extractContextFactors(context: MatchEngineAssignment['context']): string[] {
    const factors: string[] = [];

    if (context.homeForm > 0.6) factors.push('Strong home form');
    else if (context.homeForm < 0.4) factors.push('Weak home form');

    if (context.awayForm > 0.6) factors.push('Strong away form');
    else if (context.awayForm < 0.4) factors.push('Weak away form');

    if (Math.abs(context.h2hBias) > 0.3) {
      factors.push(`H2H dominance (${context.h2hBias > 0 ? 'home' : 'away'})`);
    }

    if (context.tablePressure.home !== 'none') {
      factors.push(`Home: ${context.tablePressure.home.replace('_', ' ')}`);
    }
    if (context.tablePressure.away !== 'none') {
      factors.push(`Away: ${context.tablePressure.away.replace('_', ' ')}`);
    }

    if (context.fatigue.home === 'high' || context.fatigue.away === 'high') {
      factors.push('Fixture congestion');
    }

    if (context.motivation.home > 1.1 || context.motivation.away > 1.1) {
      factors.push('High motivation match');
    }

    return factors;
  }

  private buildConsensus(engines: ValueHunterContext['assignedEngines']): ValueHunterContext['consensus'] {
    if (engines.length === 0) {
      return {
        bestPick: '',
        bestMarket: '',
        bestOdds: 0,
        bestProbability: 0,
        bestValueEdge: 0,
        confidence: 'low',
        supportingEngines: [],
        riskFactors: [],
      };
    }

    // Find the engine with highest confidence * winRate
    const scored = engines.map(e => ({
      ...e,
      score: e.confidence * e.winRate,
    }));

    scored.sort((a, b) => b.score - a.score);

    const best = scored[0];
    const supportingEngines = scored.filter(e => e.engineId !== best.engineId && e.score > 0.5).map(e => e.engineId);

    // Determine confidence based on supporting engines and win rates
    let confidence: 'low' | 'medium' | 'high' = 'low';
    if (supportingEngines.length >= 2 && best.winRate > 0.55) confidence = 'high';
    else if (supportingEngines.length >= 1 && best.winRate > 0.5) confidence = 'medium';

    // Collect risk factors
    const riskFactors: string[] = [];
    for (const e of scored) {
      if (e.winRate < 0.4) {
        riskFactors.push(`${e.engineName} has low win rate (${(e.winRate * 100).toFixed(0)}%)`);
      }
      if (e.prediction.valueEdge < 0) {
        riskFactors.push(`${e.engineName} shows negative value edge`);
      }
    }

    return {
      bestPick: best.prediction.pick,
      bestMarket: best.prediction.market,
      bestOdds: best.prediction.odds,
      bestProbability: best.prediction.probability,
      bestValueEdge: best.prediction.valueEdge,
      confidence,
      supportingEngines,
      riskFactors: riskFactors.slice(0, 3),
    };
  }

  // ── Batch Operations ─────────────────────────────────────────────────────────

  batchRecordResults(results: Array<{ matchId: string; engineId: string; won: boolean }>): void {
    for (const result of results) {
      this.recordResult(result.matchId, result.engineId, result.won);
    }
  }

  getTopPerformingEngines(limit = 10): Array<{ engineId: string; winRate: number; totalPredictions: number }> {
    return this.getAllEngineLearning()
      .filter(e => e.totalPredictions >= 5)
      .sort((a, b) => b.winRate - a.winRate)
      .slice(0, limit)
      .map(e => ({
        engineId: e.engineId,
        winRate: e.winRate,
        totalPredictions: e.totalPredictions,
      }));
  }

  getTopPerformingRules(limit = 20): Array<{ engineId: string; ruleIndex: number; winRate: number; totalFires: number }> {
    const rules: Array<{ engineId: string; ruleIndex: number; winRate: number; totalFires: number }> = [];

    for (const [engineId, data] of this.engineData) {
      for (const rule of data.rulePerformance) {
        if (rule.totalFires >= 3) {
          rules.push({
            engineId,
            ruleIndex: rule.ruleIndex,
            winRate: rule.winRate,
            totalFires: rule.totalFires,
          });
        }
      }
    }

    return rules.sort((a, b) => b.winRate - a.winRate).slice(0, limit);
  }
}

// ─── Singleton Instance ────────────────────────────────────────────────────────

export const learningStore = new LearningStore();

// ─── Helper Functions ──────────────────────────────────────────────────────────

export const recordEnginePrediction = (
  engineId: string,
  ruleIndex: number,
  matchId: string,
  market: string,
  pick: string,
  odds: number,
  probability: number,
  valueEdge: number,
  context: MatchEngineAssignment['context']
): void => {
  learningStore.recordPrediction(engineId, ruleIndex, matchId, market, pick, odds, probability, valueEdge, context);
};

export const recordEngineResult = (matchId: string, engineId: string, won: boolean): void => {
  learningStore.recordResult(matchId, engineId, won);
};

export const getMatchEngineAssignments = (matchId: string): MatchEngineAssignment[] => {
  return learningStore.getMatchAssignments(matchId);
};

export const getValueHunterContext = (matchId: string, match: any): ValueHunterContext | null => {
  return learningStore.buildValueHunterContext(matchId, match);
};

export const getEngineLearningData = (engineId: string): EngineLearningData | undefined => {
  return learningStore.getEngineLearning(engineId);
};

export const getAllEngineLearningData = (): EngineLearningData[] => {
  return learningStore.getAllEngineLearning();
};

export const getTopPerformingEngines = (limit = 10) => {
  return learningStore.getTopPerformingEngines(limit);
};

export const getTopPerformingRules = (limit = 20) => {
  return learningStore.getTopPerformingRules(limit);
};
