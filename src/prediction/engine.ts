// ─────────────────────────────────────────────────────────────
//  Prediction Engine — core logic
//  Runs configurable rule sets against raw match data
// ─────────────────────────────────────────────────────────────

export type MarketType =
  | '1x2'
  | 'over_under'
  | 'gg_ng'
  | 'double_chance'
  | 'handicap'
  | 'ht_1x2'
  | 'corners';

export type SignalType = 'value_bet' | 'high_confidence' | 'rule_match';

export interface EngineRule {
  market: MarketType;
  /** minimum model probability to consider (0–1) */
  minProbability: number;
  /** minimum odds to consider */
  minOdds: number;
  /** require value edge (model prob > implied prob + edgeThreshold) */
  requireValue: boolean;
  /** edge threshold above implied prob e.g. 0.03 = 3% */
  edgeThreshold: number;
  /** for over_under: which line e.g. 2.5 */
  ouLine?: number;
  /** for over_under: 'over' | 'under' */
  ouSide?: 'over' | 'under';
  /** for 1x2: '1' | 'X' | '2' */
  side?: '1' | 'X' | '2';
}

export interface PredictionEngine {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  rules: EngineRule[];
  /** tracked stats */
  stats: {
    total: number;
    wins: number;
    losses: number;
    pending: number;
  };
}

export interface MatchSignal {
  matchId: string;
  matchName: string;
  tournament: string;
  startTime: number;
  homeTeam: string;
  awayTeam: string;
  engineId: string;
  engineName: string;
  signalType: SignalType;
  market: string;
  pick: string;
  odds: number;
  modelProbability: number;
  impliedProbability: number;
  valueEdge: number; // (modelProb * odds) - 1
  confidence: 'low' | 'medium' | 'high';
  /** user decision */
  status: 'pending' | 'accepted' | 'rejected' | 'won' | 'lost';
}

// ─── Helpers ────────────────────────────────────────────────

const impliedProb = (odds: number) => 1 / odds;

const confidenceLevel = (prob: number): 'low' | 'medium' | 'high' => {
  if (prob >= 0.65) return 'high';
  if (prob >= 0.50) return 'medium';
  return 'low';
};

const getActiveMarket = (markets: any[], id: string, specifier?: string) => {
  return markets.find((m: any) => {
    const idMatch = m.id === id;
    const specMatch = specifier ? m.specifier === specifier : true;
    // prefer status=1 (active), fall back to status=0
    return idMatch && specMatch;
  });
};

// ─── Market extractors ───────────────────────────────────────

const extract1x2 = (markets: any[], side: '1' | 'X' | '2') => {
  const market = markets.find((m: any) => m.id === '1' && m.status === 1)
    || markets.find((m: any) => m.id === '1');
  if (!market) return null;
  const selMap: Record<string, string> = { '1': 'Home', 'X': 'Draw', '2': 'Away' };
  const sel = market.selections.find((s: any) => s.name === selMap[side]);
  if (!sel) return null;
  return {
    odds: parseFloat(sel.odds),
    probability: parseFloat(sel.probability),
    label: selMap[side],
    market: '1X2',
  };
};

const extractOU = (markets: any[], line: number, side: 'over' | 'under') => {
  const specifier = `total=${line}`;
  const market = markets.find((m: any) => m.id === '18' && m.specifier === specifier && m.status === 1)
    || markets.find((m: any) => m.id === '18' && m.specifier === specifier);
  if (!market) return null;
  const selName = side === 'over' ? `Over ${line}` : `Under ${line}`;
  const sel = market.selections.find((s: any) => s.name === selName);
  if (!sel) return null;
  return {
    odds: parseFloat(sel.odds),
    probability: parseFloat(sel.probability),
    label: selName,
    market: `O/U ${line}`,
  };
};

const extractGGNG = (markets: any[], side: 'gg' | 'ng') => {
  const market = markets.find((m: any) => m.id === '29' && m.status === 1)
    || markets.find((m: any) => m.id === '29');
  if (!market) return null;
  const sel = market.selections.find((s: any) => s.name === (side === 'gg' ? 'Yes' : 'No'));
  if (!sel) return null;
  return {
    odds: parseFloat(sel.odds),
    probability: parseFloat(sel.probability),
    label: side === 'gg' ? 'GG (Both Score)' : 'No Goal',
    market: 'GG/NG',
  };
};

const extractDC = (markets: any[], side: '1X' | '12' | 'X2') => {
  const market = markets.find((m: any) => m.id === '10' && m.status === 1)
    || markets.find((m: any) => m.id === '10');
  if (!market) return null;
  const nameMap: Record<string, string> = {
    '1X': 'Home or Draw',
    '12': 'Home or Away',
    'X2': 'Draw or Away',
  };
  const sel = market.selections.find((s: any) => s.name === nameMap[side]);
  if (!sel) return null;
  return {
    odds: parseFloat(sel.odds),
    probability: parseFloat(sel.probability),
    label: nameMap[side],
    market: 'Double Chance',
  };
};

const extractHT1x2 = (markets: any[], side: '1' | 'X' | '2') => {
  const market = markets.find((m: any) => m.id === '60' && m.status === 1)
    || markets.find((m: any) => m.id === '60');
  if (!market) return null;
  const selMap: Record<string, string> = { '1': 'Home', 'X': 'Draw', '2': 'Away' };
  const sel = market.selections.find((s: any) => s.name === selMap[side]);
  if (!sel) return null;
  return {
    odds: parseFloat(sel.odds),
    probability: parseFloat(sel.probability),
    label: `HT ${selMap[side]}`,
    market: 'HT 1X2',
  };
};

// ─── Rule evaluator ──────────────────────────────────────────

const evaluateRule = (rule: EngineRule, markets: any[]): { odds: number; probability: number; label: string; market: string } | null => {
  switch (rule.market) {
    case '1x2':
      return extract1x2(markets, rule.side || '1');
    case 'over_under':
      return extractOU(markets, rule.ouLine ?? 2.5, rule.ouSide ?? 'over');
    case 'gg_ng':
      return extractGGNG(markets, rule.side === '2' ? 'ng' : 'gg');
    case 'double_chance':
      return extractDC(markets, (rule.side as any) || '1X');
    case 'ht_1x2':
      return extractHT1x2(markets, rule.side || '1');
    default:
      return null;
  }
};

// ─── Main engine runner ──────────────────────────────────────

export const runEngines = (
  matches: any[],
  engines: PredictionEngine[]
): MatchSignal[] => {
  const signals: MatchSignal[] = [];
  const activeEngines = engines.filter((e) => e.enabled);

  for (const match of matches) {
    // skip live/finished matches
    if (match.period && match.period !== 'Not start' && match.period !== 'Not started') continue;

    const markets: any[] = match.all_markets || match.sportybet_markets || match.markets || [];

    for (const engine of activeEngines) {
      for (const rule of engine.rules) {
        const result = evaluateRule(rule, markets);
        if (!result) continue;

        const { odds, probability, label, market } = result;
        const implied = impliedProb(odds);
        const edge = parseFloat(((probability * odds) - 1).toFixed(4));

        // apply filters
        if (probability < rule.minProbability) continue;
        if (odds < rule.minOdds) continue;
        if (rule.requireValue && probability <= implied + rule.edgeThreshold) continue;

        const signalType: SignalType =
          rule.requireValue ? 'value_bet'
          : probability >= 0.65 ? 'high_confidence'
          : 'rule_match';

        signals.push({
          matchId: match.id,
          matchName: match.name,
          tournament: match.tournament || 'Unknown',
          startTime: match.start_time,
          homeTeam: match.home_team,
          awayTeam: match.away_team,
          engineId: engine.id,
          engineName: engine.name,
          signalType,
          market,
          pick: label,
          odds,
          modelProbability: probability,
          impliedProbability: implied,
          valueEdge: edge,
          confidence: confidenceLevel(probability),
          status: 'pending',
        });
      }
    }
  }

  // sort: value bets first, then by edge descending
  return signals.sort((a, b) => {
    if (a.signalType === 'value_bet' && b.signalType !== 'value_bet') return -1;
    if (b.signalType === 'value_bet' && a.signalType !== 'value_bet') return 1;
    return b.valueEdge - a.valueEdge;
  });
};

// ─── Default engines (your starting rule sets) ───────────────

export const DEFAULT_ENGINES: PredictionEngine[] = [
  {
    id: 'value_hunter',
    name: 'Value Hunter',
    description: 'Finds bets where model probability beats the bookmaker by 5%+',
    enabled: true,
    rules: [
      { market: '1x2', side: '1', minProbability: 0.50, minOdds: 1.60, requireValue: true, edgeThreshold: 0.05 },
      { market: '1x2', side: '2', minProbability: 0.45, minOdds: 1.80, requireValue: true, edgeThreshold: 0.05 },
      { market: 'over_under', ouLine: 2.5, ouSide: 'over', minProbability: 0.55, minOdds: 1.60, requireValue: true, edgeThreshold: 0.05 },
      { market: 'gg_ng', minProbability: 0.55, minOdds: 1.60, requireValue: true, edgeThreshold: 0.05 },
    ],
    stats: { total: 0, wins: 0, losses: 0, pending: 0 },
  },
  {
    id: 'over_specialist',
    name: 'Over Specialist',
    description: 'High probability Over 2.5 and Over 1.5 picks',
    enabled: true,
    rules: [
      { market: 'over_under', ouLine: 2.5, ouSide: 'over', minProbability: 0.62, minOdds: 1.50, requireValue: false, edgeThreshold: 0 },
      { market: 'over_under', ouLine: 1.5, ouSide: 'over', minProbability: 0.80, minOdds: 1.20, requireValue: false, edgeThreshold: 0 },
    ],
    stats: { total: 0, wins: 0, losses: 0, pending: 0 },
  },
  {
    id: 'gg_hunter',
    name: 'GG Hunter',
    description: 'Both teams to score — high probability picks',
    enabled: true,
    rules: [
      { market: 'gg_ng', minProbability: 0.60, minOdds: 1.50, requireValue: false, edgeThreshold: 0 },
    ],
    stats: { total: 0, wins: 0, losses: 0, pending: 0 },
  },
  {
    id: 'safe_home',
    name: 'Safe Home',
    description: 'Strong home favourites with high win probability',
    enabled: false,
    rules: [
      { market: '1x2', side: '1', minProbability: 0.65, minOdds: 1.30, requireValue: false, edgeThreshold: 0 },
      { market: 'double_chance', side: '1X' as any, minProbability: 0.80, minOdds: 1.10, requireValue: false, edgeThreshold: 0 },
    ],
    stats: { total: 0, wins: 0, losses: 0, pending: 0 },
  },
];
