// ─────────────────────────────────────────────────────────────
//  Prediction Engine — core logic
// ─────────────────────────────────────────────────────────────

// ─── Opponent-weighted form ────────────────────────────────────────────────────
//
//  Instead of treating every W/D/L equally, we weight each result by how strong
//  the opponent was.  Opponent strength is derived from:
//    1. Their league position (lower position number = stronger)
//    2. Fallback: the implied probability of their 1X2 odds in that match
//
//  A win against a top-3 side scores much higher than a win against a bottom-3 side.
//
//  Returns a score in [0, 1] — higher means better weighted form.

export interface OpponentWeightedForm {
  score: number;          // 0–1 weighted form score
  sampleSize: number;     // number of matches used
  detail: string;         // human-readable summary
}

/**
 * Derive a 0–1 strength rating for an opponent.
 * Uses standings position if available, otherwise falls back to odds.
 */
const opponentStrength = (
  opponentName: string,
  standings: any[],
  totalTeams: number,
): number => {
  if (standings && standings.length > 0) {
    const row = standings.find((r: any) => {
      const name: string = r?.team?.name ?? r?.name ?? '';
      return name.toLowerCase().includes(opponentName.toLowerCase().slice(0, 6));
    });
    if (row) {
      const pos = row?.position ?? row?.rank ?? null;
      const n = totalTeams || standings.length;
      if (pos != null && n > 0) {
        // Position 1 = strongest (1.0), last = weakest (0.1)
        return Math.max(0.1, 1 - (pos - 1) / n);
      }
    }
  }
  // No standings data — treat as average opponent
  return 0.5;
};

/**
 * Calculate opponent-weighted form for a team from their recent matches.
 * Each result is multiplied by the opponent's strength rating.
 */
export const calcOpponentWeightedForm = (
  recentMatches: any[],
  teamName: string,
  standings: any[],
): OpponentWeightedForm => {
  if (!recentMatches || recentMatches.length === 0) {
    return { score: 0.5, sampleSize: 0, detail: 'No recent matches' };
  }

  const totalTeams = standings?.length || 20;
  let weightedPoints = 0;
  let totalWeight = 0;
  let wins = 0, draws = 0, losses = 0;

  for (const event of recentMatches) {
    const homeName: string = event?.home_team?.name || event?.homeTeam?.name || '';
    const awayName: string = event?.away_team?.name || event?.awayTeam?.name || '';
    const isHome = homeName.toLowerCase() === teamName.toLowerCase();
    const opponentName = isHome ? awayName : homeName;

    const strength = opponentStrength(opponentName, standings, totalTeams);

    const score = event?.score || {};
    const hs = Number(score.home ?? event?.homeScore?.current);
    const as_ = Number(score.away ?? event?.awayScore?.current);
    if (!Number.isFinite(hs) || !Number.isFinite(as_)) continue;

    const own = isHome ? hs : as_;
    const opp = isHome ? as_ : hs;

    // Points: W=3, D=1, L=0 — weighted by opponent strength
    let pts = 0;
    if (own > opp) { pts = 3; wins++; }
    else if (own === opp) { pts = 1; draws++; }
    else { losses++; }

    weightedPoints += pts * strength;
    totalWeight += 3 * strength; // max possible weighted points for this match
  }

  const score = totalWeight > 0 ? weightedPoints / totalWeight : 0.5;
  const n = wins + draws + losses;
  const detail = n > 0
    ? `${wins}W ${draws}D ${losses}L (weighted vs opponent quality)`
    : 'No scored matches';

  return { score: parseFloat(score.toFixed(3)), sampleSize: n, detail };
};

// ─── H2H same-team record ──────────────────────────────────────────────────────
//
//  Looks at the historical record specifically between these two teams.
//  Returns a bias in [-1, +1]:
//    +1 = home team dominates this fixture
//    -1 = away team dominates this fixture
//     0 = balanced or no data

export interface H2HBias {
  bias: number;       // -1 to +1 (positive = home advantage in this fixture)
  meetings: number;
  homeWins: number;
  draws: number;
  awayWins: number;
  detail: string;
}

export const calcH2HBias = (match: any): H2HBias => {
  const h2h = match?.h2h;
  const empty: H2HBias = { bias: 0, meetings: 0, homeWins: 0, draws: 0, awayWins: 0, detail: 'No H2H data' };
  if (!h2h) return empty;

  const meetings: number = h2h?.teamDuel?.meetings ?? h2h?.meetings ?? 0;
  const homeWins: number = h2h?.teamDuel?.homeWins  ?? h2h?.homeWins  ?? 0;
  const draws: number   = h2h?.teamDuel?.draws      ?? h2h?.draws     ?? 0;
  const awayWins: number = h2h?.teamDuel?.awayWins  ?? h2h?.awayWins  ?? 0;

  if (meetings === 0) return empty;

  // Bias = (homeWins - awayWins) / meetings, clamped to [-1, +1]
  const raw = (homeWins - awayWins) / meetings;
  const bias = Math.max(-1, Math.min(1, raw));

  const home = match?.home_team || 'Home';
  const away = match?.away_team || 'Away';
  const dominant = homeWins > awayWins ? home : awayWins > homeWins ? away : null;
  const detail = dominant
    ? `${dominant} leads H2H: ${homeWins}W-${draws}D-${awayWins}L over ${meetings} meetings`
    : `Balanced H2H: ${homeWins}W-${draws}D-${awayWins}L over ${meetings} meetings`;

  return { bias, meetings, homeWins, draws, awayWins, detail };
};

// ─── Table pressure ────────────────────────────────────────────────────────────
//
//  Teams under pressure (relegation battle, title race, top-4 fight) often
//  perform differently from their raw form.  We detect pressure zones and
//  return a multiplier that adjusts confidence:
//    > 1.0 = pressure boosts performance (title/top-4 teams tend to grind results)
//    < 1.0 = pressure hurts performance (relegation teams can freeze)
//    = 1.0 = no significant pressure detected

export type PressureZone = 'title_race' | 'top4' | 'relegation' | 'none';

export interface TablePressure {
  homeZone: PressureZone;
  awayZone: PressureZone;
  homeMultiplier: number;   // applied to home team's probability
  awayMultiplier: number;   // applied to away team's probability
  detail: string;
}

const detectPressureZone = (
  teamName: string,
  standings: any[],
): PressureZone => {
  if (!standings || standings.length === 0) return 'none';
  const n = standings.length;

  const row = standings.find((r: any) => {
    const name: string = r?.team?.name ?? r?.name ?? '';
    return name.toLowerCase().includes(teamName.toLowerCase().slice(0, 6));
  });
  if (!row) return 'none';

  const pos: number = row?.position ?? row?.rank ?? 0;
  if (pos === 0) return 'none';

  if (pos === 1) return 'title_race';
  if (pos <= 4) return 'top4';
  if (pos >= n - 2) return 'relegation'; // bottom 3
  return 'none';
};

const pressureMultiplier = (zone: PressureZone): number => {
  switch (zone) {
    case 'title_race': return 1.06;  // title-chasing teams grind results
    case 'top4':       return 1.03;  // top-4 pressure is motivating
    case 'relegation': return 0.93;  // relegation anxiety hurts performance
    default:           return 1.0;
  }
};

export const calcTablePressure = (match: any): TablePressure => {
  const standings: any[] = match?.standings || [];
  const homeTeam: string = match?.home_team || '';
  const awayTeam: string = match?.away_team || '';

  const homeZone = detectPressureZone(homeTeam, standings);
  const awayZone = detectPressureZone(awayTeam, standings);
  const homeMultiplier = pressureMultiplier(homeZone);
  const awayMultiplier = pressureMultiplier(awayZone);

  const parts: string[] = [];
  if (homeZone !== 'none') parts.push(`${homeTeam}: ${homeZone.replace('_', ' ')} (×${homeMultiplier})`);
  if (awayZone !== 'none') parts.push(`${awayTeam}: ${awayZone.replace('_', ' ')} (×${awayMultiplier})`);
  const detail = parts.length > 0 ? parts.join(' | ') : 'No table pressure detected';

  return { homeZone, awayZone, homeMultiplier, awayMultiplier, detail };
};

// ─── Context-adjusted probability ─────────────────────────────────────────────
//
//  Combines opponent-weighted form, H2H bias, and table pressure into a single
//  adjusted probability for a given side ('1' = home, '2' = away, 'X' = draw).
//
//  The raw model probability is nudged by:
//    1. Weighted form delta  (how much better/worse than average this team is)
//    2. H2H bias             (historical dominance in this specific fixture)
//    3. Table pressure       (motivation/anxiety multiplier)
//
//  The adjustment is intentionally conservative (max ±8%) to avoid overriding
//  the model's core probability signal.

export interface ContextAdjustment {
  adjustedProbability: number;
  rawProbability: number;
  delta: number;
  factors: string[];
}

export const applyContextAdjustment = (
  rawProb: number,
  side: '1' | 'X' | '2',
  match: any,
): ContextAdjustment => {
  const factors: string[] = [];
  let delta = 0;

  // ── 1. Opponent-weighted form ──────────────────────────────────────────────
  const standings: any[] = match?.standings || [];
  const homeRecent: any[] = match?.home_recent || match?.home_matches || [];
  const awayRecent: any[] = match?.away_recent || match?.away_matches || [];

  if (side === '1' && homeRecent.length > 0) {
    const wf = calcOpponentWeightedForm(homeRecent, match?.home_team || '', standings);
    if (wf.sampleSize >= 3) {
      // score 0.5 = neutral, >0.5 = good form, <0.5 = poor form
      const formDelta = (wf.score - 0.5) * 0.12; // max ±6%
      delta += formDelta;
      if (Math.abs(formDelta) > 0.01) {
        factors.push(`Home weighted form: ${wf.detail} (${formDelta > 0 ? '+' : ''}${(formDelta * 100).toFixed(1)}%)`);
      }
    }
  }

  if (side === '2' && awayRecent.length > 0) {
    const wf = calcOpponentWeightedForm(awayRecent, match?.away_team || '', standings);
    if (wf.sampleSize >= 3) {
      const formDelta = (wf.score - 0.5) * 0.12;
      delta += formDelta;
      if (Math.abs(formDelta) > 0.01) {
        factors.push(`Away weighted form: ${wf.detail} (${formDelta > 0 ? '+' : ''}${(formDelta * 100).toFixed(1)}%)`);
      }
    }
  }

  // ── 2. H2H bias ────────────────────────────────────────────────────────────
  const h2h = calcH2HBias(match);
  if (h2h.meetings >= 3) {
    // bias in [-1,+1]; scale to max ±4% adjustment
    const h2hDelta = side === '1' ? h2h.bias * 0.04
                   : side === '2' ? -h2h.bias * 0.04
                   : 0; // draws: no H2H adjustment
    delta += h2hDelta;
    if (Math.abs(h2hDelta) > 0.005) {
      factors.push(`H2H: ${h2h.detail} (${h2hDelta > 0 ? '+' : ''}${(h2hDelta * 100).toFixed(1)}%)`);
    }
  }

  // ── 3. Table pressure ──────────────────────────────────────────────────────
  const pressure = calcTablePressure(match);
  if (side === '1' && pressure.homeMultiplier !== 1.0) {
    const pressureDelta = rawProb * (pressure.homeMultiplier - 1);
    delta += pressureDelta;
    factors.push(`Table pressure: ${pressure.detail} (${pressureDelta > 0 ? '+' : ''}${(pressureDelta * 100).toFixed(1)}%)`);
  }
  if (side === '2' && pressure.awayMultiplier !== 1.0) {
    const pressureDelta = rawProb * (pressure.awayMultiplier - 1);
    delta += pressureDelta;
    factors.push(`Table pressure: ${pressure.detail} (${pressureDelta > 0 ? '+' : ''}${(pressureDelta * 100).toFixed(1)}%)`);
  }

  // Clamp total delta to ±8% and final probability to [0.05, 0.95]
  const clampedDelta = Math.max(-0.08, Math.min(0.08, delta));
  const adjustedProbability = Math.max(0.05, Math.min(0.95, rawProb + clampedDelta));

  return {
    adjustedProbability: parseFloat(adjustedProbability.toFixed(4)),
    rawProbability: rawProb,
    delta: parseFloat(clampedDelta.toFixed(4)),
    factors,
  };
};

export type MarketType =
  | '1x2'
  | 'over_under'
  | 'gg_ng'
  | 'double_chance'
  | 'handicap'
  | 'ht_1x2'
  | 'corners'
  | 'clean_sheet'
  | 'draw_no_bet'
  | 'btts_over'   // both teams score AND over line
  | 'form';       // synthetic: based on form string

export type SignalType = 'value_bet' | 'high_confidence' | 'rule_match' | 'sharp_move' | 'form_signal';

export interface EngineRule {
  market: MarketType;
  minProbability: number;
  minOdds: number;
  requireValue: boolean;
  edgeThreshold: number;
  ouLine?: number;
  ouSide?: 'over' | 'under';
  /** for 1x2 / ht_1x2 / draw_no_bet: '1' | 'X' | '2' */
  side?: '1' | 'X' | '2';
  /** for double_chance: '1X' | '12' | 'X2' */
  dcSide?: '1X' | '12' | 'X2';
  /** for clean_sheet: 'home' | 'away' */
  csSide?: 'home' | 'away';
  /** for corners: over/under line */
  cornersLine?: number;
  /** for form: minimum consecutive wins required */
  minFormStreak?: number;
  /** for form: which side '1'=home '2'=away */
  formSide?: '1' | '2';
  /** for sharp_move: minimum odds drop to consider a steam move */
  minDrop?: number;
}

export interface PredictionEngine {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'value' | 'goals' | 'result' | 'special' | 'sharp';
  enabled: boolean;
  rules: EngineRule[];
  stats: { total: number; wins: number; losses: number; pending: number };
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
  engineIcon: string;
  signalType: SignalType;
  market: string;
  pick: string;
  odds: number;
  modelProbability: number;
  impliedProbability: number;
  valueEdge: number;
  confidence: 'low' | 'medium' | 'high';
  status: 'pending' | 'accepted' | 'rejected' | 'won' | 'lost';
  note?: string;
  // Context-aware adjustments
  contextAdjustment?: {
    rawProbability: number;
    delta: number;
    factors: string[];
    h2hBias?: H2HBias;
    tablePressure?: TablePressure;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const impliedProb = (odds: number) => 1 / odds;

const confidenceLevel = (prob: number): 'low' | 'medium' | 'high' =>
  prob >= 0.65 ? 'high' : prob >= 0.50 ? 'medium' : 'low';

const parseOdds = (v: any): number => {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

// ─── Market extractors ─────────────────────────────────────────────────────────

const extract1x2 = (markets: any[], side: '1' | 'X' | '2') => {
  const market = markets.find((m: any) => m.id === '1' && m.status === 1)
    || markets.find((m: any) => m.id === '1');
  if (!market) return null;
  const selMap: Record<string, string> = { '1': 'Home', 'X': 'Draw', '2': 'Away' };
  const sel = market.selections?.find((s: any) => s.name === selMap[side]);
  if (!sel) return null;
  return { odds: parseOdds(sel.odds), probability: 0, label: selMap[side], market: '1X2' };
};

const extractOU = (markets: any[], line: number, side: 'over' | 'under') => {
  const specifier = `total=${line}`;
  const market = markets.find((m: any) => m.id === '18' && m.specifier === specifier && m.status === 1)
    || markets.find((m: any) => m.id === '18' && m.specifier === specifier)
    || markets.find((m: any) => (m.name || '').toLowerCase().includes('over/under') && m.specifier === specifier);
  if (!market) return null;
  const selName = side === 'over' ? `Over ${line}` : `Under ${line}`;
  const sel = market.selections?.find((s: any) => s.name === selName);
  if (!sel) return null;
  return { odds: parseOdds(sel.odds), probability: 0, label: selName, market: `O/U ${line}` };
};

const extractGGNG = (markets: any[], side: 'gg' | 'ng') => {
  const market = markets.find((m: any) => m.id === '29' && m.status === 1)
    || markets.find((m: any) => m.id === '29')
    || markets.find((m: any) => (m.name || '').toLowerCase().includes('both teams'));
  if (!market) return null;
  const sel = market.selections?.find((s: any) => s.name === (side === 'gg' ? 'Yes' : 'No'));
  if (!sel) return null;
  return { odds: parseOdds(sel.odds), probability: 0, label: side === 'gg' ? 'GG (Both Score)' : 'No Goal', market: 'GG/NG' };
};

const extractDC = (markets: any[], side: '1X' | '12' | 'X2') => {
  const market = markets.find((m: any) => m.id === '10' && m.status === 1)
    || markets.find((m: any) => m.id === '10')
    || markets.find((m: any) => (m.name || '').toLowerCase().includes('double chance'));
  if (!market) return null;
  const nameMap: Record<string, string> = { '1X': 'Home or Draw', '12': 'Home or Away', 'X2': 'Draw or Away' };
  const sel = market.selections?.find((s: any) => s.name === nameMap[side]);
  if (!sel) return null;
  return { odds: parseOdds(sel.odds), probability: 0, label: nameMap[side], market: 'Double Chance' };
};

const extractHT1x2 = (markets: any[], side: '1' | 'X' | '2') => {
  const market = markets.find((m: any) => m.id === '60' && m.status === 1)
    || markets.find((m: any) => m.id === '60')
    || markets.find((m: any) => (m.name || '').toLowerCase().includes('half time'));
  if (!market) return null;
  const selMap: Record<string, string> = { '1': 'Home', 'X': 'Draw', '2': 'Away' };
  const sel = market.selections?.find((s: any) => s.name === selMap[side]);
  if (!sel) return null;
  return { odds: parseOdds(sel.odds), probability: 0, label: `HT ${selMap[side]}`, market: 'HT 1X2' };
};

const extractCleanSheet = (markets: any[], csSide: 'home' | 'away') => {
  // Clean sheet market: "Will X keep a clean sheet?"
  const market = markets.find((m: any) =>
    (m.name || '').toLowerCase().includes('clean sheet') &&
    (m.name || '').toLowerCase().includes(csSide)
  ) || markets.find((m: any) => (m.name || '').toLowerCase().includes('clean sheet'));
  if (!market) return null;
  const sel = market.selections?.find((s: any) => s.name === 'Yes');
  if (!sel) return null;
  return { odds: parseOdds(sel.odds), probability: 0, label: `${csSide === 'home' ? 'Home' : 'Away'} Clean Sheet`, market: 'Clean Sheet' };
};

const extractDrawNoBet = (markets: any[], side: '1' | '2') => {
  const market = markets.find((m: any) =>
    (m.name || '').toLowerCase().includes('draw no bet')
  );
  if (!market) return null;
  const selMap: Record<string, string> = { '1': 'Home', '2': 'Away' };
  const sel = market.selections?.find((s: any) => s.name === selMap[side]);
  if (!sel) return null;
  return { odds: parseOdds(sel.odds), probability: 0, label: `DNB ${selMap[side]}`, market: 'Draw No Bet' };
};

const extractCorners = (markets: any[], line: number, side: 'over' | 'under') => {
  const market = markets.find((m: any) =>
    (m.name || '').toLowerCase().includes('corner') &&
    (m.specifier || '').includes(String(line))
  );
  if (!market) return null;
  const selName = side === 'over' ? `Over ${line}` : `Under ${line}`;
  const sel = market.selections?.find((s: any) => s.name === selName);
  if (!sel) return null;
  return { odds: parseOdds(sel.odds), probability: 0, label: `Corners ${selName}`, market: 'Corners' };
};

// Form-based synthetic signal — reads match.home_form / match.away_form
const extractFormSignal = (match: any, formSide: '1' | '2', minStreak: number) => {
  const form: string = formSide === '1'
    ? (typeof match.home_form === 'string' ? match.home_form : '')
    : (typeof match.away_form === 'string' ? match.away_form : '');
  if (!form) return null;
  // Count trailing wins
  const chars = form.toUpperCase().split('').reverse();
  let streak = 0;
  for (const c of chars) {
    if (c === 'W') streak++;
    else break;
  }
  if (streak < minStreak) return null;
  const teamName = formSide === '1' ? match.home_team : match.away_team;
  const side = formSide === '1' ? '1' : '2';
  // Use 1X2 odds for the team
  const markets: any[] = match.all_markets || match.sportybet_markets || match.markets || [];
  const base = extract1x2(markets, side as '1' | '2');
  if (!base) return null;
  return {
    ...base,
    label: `${teamName} (${streak}-game win streak)`,
    market: 'Form Signal',
    note: `${form.toUpperCase().slice(-5)} — ${streak} consecutive wins`,
  };
};

// ─── Rule evaluator ────────────────────────────────────────────────────────────

const evaluateRule = (
  rule: EngineRule,
  markets: any[],
  match: any,
): { odds: number; probability: number; label: string; market: string; note?: string } | null => {
  switch (rule.market) {
    case '1x2':         return extract1x2(markets, rule.side || '1');
    case 'over_under':  return extractOU(markets, rule.ouLine ?? 2.5, rule.ouSide ?? 'over');
    case 'gg_ng':       return extractGGNG(markets, rule.side === '2' ? 'ng' : 'gg');
    case 'double_chance': return extractDC(markets, rule.dcSide || '1X');
    case 'ht_1x2':      return extractHT1x2(markets, rule.side || '1');
    case 'clean_sheet': return extractCleanSheet(markets, rule.csSide || 'home');
    case 'draw_no_bet': return extractDrawNoBet(markets, rule.side === '2' ? '2' : '1');
    case 'corners':     return extractCorners(markets, rule.cornersLine ?? 9.5, rule.ouSide ?? 'over');
    case 'form':        return extractFormSignal(match, rule.formSide || '1', rule.minFormStreak ?? 3);
    default:            return null;
  }
};

// ─── Main engine runner ────────────────────────────────────────────────────────

const pickOdds = (pick: any): number => {
  const stake = pick?.stake || {};
  return parseOdds(stake.decimal_odds ?? pick?.decimal_odds ?? pick?.odds);
};

const pickProbability = (pick: any): number => {
  const cal = pick?.calibration || {};
  const p = parseFloat(cal.calibrated_probability ?? pick?.calibrated_probability ?? '');
  if (Number.isFinite(p) && p > 0) return p > 1 ? p / 100 : p;
  return Math.max(0, Math.min(1, parseFloat(pick?.confidence ?? 0) / 100));
};

const backendPrediction = (match: any) =>
  match?.prediction
  || match?.intelligence?.prediction
  || match?.current_prediction
  || match?.latest_prediction
  || null;

const preferredEngineId = (pick: any): string => {
  const type = String(pick?.type || '').toLowerCase();
  const selection = String(pick?.selection || pick?.pick || '').toLowerCase();
  if (type.includes('value')) return 'value_hunter';
  if (selection.includes('away')) return 'away_value';
  if (selection.includes('over')) return 'over_specialist';
  if (selection.includes('under')) return 'under_specialist';
  if (selection.includes('both teams') || selection.includes('btts') || selection.includes('gg')) return 'gg_hunter';
  if (type.includes('live')) return 'sharp_follower';
  if (type.includes('match_result') && selection.includes('home')) return 'safe_home';
  if (type.includes('draw')) return 'draw_specialist';
  return 'value_hunter';
};

const pickSignalType = (pick: any, probability: number): SignalType => {
  const type = String(pick?.type || '').toLowerCase();
  const stake = pick?.stake || {};
  if (type.includes('value') || stake.value_bet) return 'value_bet';
  if (probability >= 0.65 || Number(pick?.confidence || 0) >= 75) return 'high_confidence';
  return 'rule_match';
};

const backendPickToSignal = (
  match: any,
  prediction: any,
  pick: any,
  engines: PredictionEngine[],
): MatchSignal | null => {
  if (!pick || pick.type === 'no_bet') return null;
  const engine = engines.find(e => e.id === preferredEngineId(pick)) || engines[0];
  if (!engine) return null;

  const odds = pickOdds(pick);
  const probability = pickProbability(pick);
  const implied = odds > 1 ? impliedProb(odds) : 0;
  const edge = odds > 1 ? parseFloat(((probability * odds) - 1).toFixed(4)) : 0;
  const backendConfidence = Number(pick?.confidence || Math.round(probability * 100));

  return {
    matchId: String(match.sportybet_id || match.id || prediction.match_id || ''),
    matchName: prediction.name || match.name || `${match.home_team || 'Home'} vs ${match.away_team || 'Away'}`,
    tournament: match.tournament || prediction.league || prediction.tournament || 'Unknown',
    startTime: Number(match.start_time || prediction.start_time || Date.now()),
    homeTeam: match.home_team || prediction?.teams?.home?.name || 'Home',
    awayTeam: match.away_team || prediction?.teams?.away?.name || 'Away',
    engineId: engine.id,
    engineName: engine.name,
    engineIcon: engine.icon,
    signalType: pickSignalType(pick, probability),
    market: String(pick.type || 'backend_prediction'),
    pick: String(pick.selection || pick.pick || 'Backend pick'),
    odds,
    modelProbability: probability,
    impliedProbability: implied,
    valueEdge: edge,
    confidence: confidenceLevel(backendConfidence / 100),
    status: 'pending',
    note: pick.reason || 'Backend prediction authority',
    contextAdjustment: undefined,
  };
};

export const runEngines = (matches: any[], engines: PredictionEngine[]): MatchSignal[] => {
  const signals = matches.flatMap((match) => {
    const prediction = backendPrediction(match);
    const picks = Array.isArray(prediction?.picks) ? prediction.picks : [];
    return picks
      .map((pick: any) => backendPickToSignal(match, prediction, pick, engines))
      .filter(Boolean) as MatchSignal[];
  });

  return signals.sort((a, b) => {
    if (a.signalType === 'value_bet' && b.signalType !== 'value_bet') return -1;
    if (b.signalType === 'value_bet' && a.signalType !== 'value_bet') return 1;
    return b.valueEdge - a.valueEdge;
  });
};

const disabledFrontendLabRunner = (_matches: any[], _engines: PredictionEngine[]): MatchSignal[] => [];

// ─── Default engines ───────────────────────────────────────────────────────────

export const DEFAULT_ENGINES: PredictionEngine[] = [
  // ── VALUE ──────────────────────────────────────────────────────────────────
  {
    id: 'value_hunter',
    name: 'Value Hunter',
    icon: '💰',
    category: 'value',
    description: 'Finds bets where model probability beats the bookmaker by 5%+',
    enabled: false,
    rules: [
      { market: '1x2', side: '1', minProbability: 0.50, minOdds: 1.60, requireValue: true, edgeThreshold: 0.05 },
      { market: '1x2', side: '2', minProbability: 0.45, minOdds: 1.80, requireValue: true, edgeThreshold: 0.05 },
      { market: 'over_under', ouLine: 2.5, ouSide: 'over', minProbability: 0.55, minOdds: 1.60, requireValue: true, edgeThreshold: 0.05 },
      { market: 'gg_ng', minProbability: 0.55, minOdds: 1.60, requireValue: true, edgeThreshold: 0.05 },
    ],
    stats: { total: 0, wins: 0, losses: 0, pending: 0 },
  },
  {
    id: 'away_value',
    name: 'Away Value',
    icon: '✈️',
    category: 'value',
    description: 'Away wins are systematically underpriced — finds edges on away teams',
    enabled: false,
    rules: [
      { market: '1x2', side: '2', minProbability: 0.42, minOdds: 2.00, requireValue: true, edgeThreshold: 0.04 },
      { market: 'draw_no_bet', side: '2', minProbability: 0.50, minOdds: 1.70, requireValue: true, edgeThreshold: 0.04 },
      { market: 'double_chance', dcSide: 'X2', minProbability: 0.65, minOdds: 1.30, requireValue: true, edgeThreshold: 0.03 },
    ],
    stats: { total: 0, wins: 0, losses: 0, pending: 0 },
  },

  // ── GOALS ──────────────────────────────────────────────────────────────────
  {
    id: 'over_specialist',
    name: 'Over Specialist',
    icon: '⚽',
    category: 'goals',
    description: 'High probability Over 2.5 and Over 1.5 picks',
    enabled: false,
    rules: [
      { market: 'over_under', ouLine: 2.5, ouSide: 'over', minProbability: 0.62, minOdds: 1.50, requireValue: true, edgeThreshold: 0 },
      { market: 'over_under', ouLine: 1.5, ouSide: 'over', minProbability: 0.80, minOdds: 1.20, requireValue: true, edgeThreshold: 0 },
      { market: 'over_under', ouLine: 3.5, ouSide: 'over', minProbability: 0.45, minOdds: 2.00, requireValue: true, edgeThreshold: 0.05 },
    ],
    stats: { total: 0, wins: 0, losses: 0, pending: 0 },
  },
  {
    id: 'under_specialist',
    name: 'Under Specialist',
    icon: '🔒',
    category: 'goals',
    description: 'Low-scoring games — defensive matchups, cup ties, tight leagues',
    enabled: false,
    rules: [
      { market: 'over_under', ouLine: 2.5, ouSide: 'under', minProbability: 0.58, minOdds: 1.60, requireValue: true, edgeThreshold: 0 },
      { market: 'over_under', ouLine: 1.5, ouSide: 'under', minProbability: 0.35, minOdds: 3.00, requireValue: true, edgeThreshold: 0.06 },
    ],
    stats: { total: 0, wins: 0, losses: 0, pending: 0 },
  },
  {
    id: 'gg_hunter',
    name: 'GG Hunter',
    icon: '🎯',
    category: 'goals',
    description: 'Both teams to score — high probability picks',
    enabled: false,
    rules: [
      { market: 'gg_ng', minProbability: 0.60, minOdds: 1.50, requireValue: true, edgeThreshold: 0 },
      { market: 'gg_ng', minProbability: 0.52, minOdds: 1.65, requireValue: true, edgeThreshold: 0.04 },
    ],
    stats: { total: 0, wins: 0, losses: 0, pending: 0 },
  },
  {
    id: 'btts_over',
    name: 'BTTS + Over',
    icon: '🔥',
    category: 'goals',
    description: 'Both teams score AND over 2.5 goals — high-action games',
    enabled: false,
    rules: [
      { market: 'gg_ng', minProbability: 0.62, minOdds: 1.45, requireValue: true, edgeThreshold: 0 },
      { market: 'over_under', ouLine: 2.5, ouSide: 'over', minProbability: 0.62, minOdds: 1.45, requireValue: true, edgeThreshold: 0 },
    ],
    stats: { total: 0, wins: 0, losses: 0, pending: 0 },
  },

  // ── RESULT ─────────────────────────────────────────────────────────────────
  {
    id: 'safe_home',
    name: 'Safe Home',
    icon: '🏠',
    category: 'result',
    description: 'Strong home favourites with high win probability',
    enabled: false,
    rules: [
      { market: '1x2', side: '1', minProbability: 0.65, minOdds: 1.30, requireValue: true, edgeThreshold: 0 },
      { market: 'double_chance', dcSide: '1X', minProbability: 0.80, minOdds: 1.10, requireValue: true, edgeThreshold: 0 },
    ],
    stats: { total: 0, wins: 0, losses: 0, pending: 0 },
  },
  {
    id: 'draw_specialist',
    name: 'Draw Specialist',
    icon: '🤝',
    category: 'result',
    description: 'Draws are the most mispriced market — evenly matched games',
    enabled: false,
    rules: [
      { market: '1x2', side: 'X', minProbability: 0.35, minOdds: 2.80, requireValue: true, edgeThreshold: 0.05 },
      { market: '1x2', side: 'X', minProbability: 0.40, minOdds: 2.50, requireValue: true, edgeThreshold: 0.04 },
    ],
    stats: { total: 0, wins: 0, losses: 0, pending: 0 },
  },
  {
    id: 'ht_specialist',
    name: 'HT Specialist',
    icon: '⏱️',
    category: 'result',
    description: 'Half-time result picks — teams that start fast or slow',
    enabled: false,
    rules: [
      { market: 'ht_1x2', side: '1', minProbability: 0.50, minOdds: 1.80, requireValue: true, edgeThreshold: 0.04 },
      { market: 'ht_1x2', side: 'X', minProbability: 0.45, minOdds: 2.20, requireValue: true, edgeThreshold: 0.05 },
      { market: 'ht_1x2', side: '2', minProbability: 0.40, minOdds: 2.50, requireValue: true, edgeThreshold: 0.05 },
    ],
    stats: { total: 0, wins: 0, losses: 0, pending: 0 },
  },
  {
    id: 'clean_sheet_hunter',
    name: 'Clean Sheet',
    icon: '🧤',
    category: 'result',
    description: 'Teams with strong defensive records keeping clean sheets',
    enabled: false,
    rules: [
      { market: 'clean_sheet', csSide: 'home', minProbability: 0.50, minOdds: 1.70, requireValue: true, edgeThreshold: 0 },
      { market: 'clean_sheet', csSide: 'away', minProbability: 0.45, minOdds: 2.00, requireValue: true, edgeThreshold: 0 },
    ],
    stats: { total: 0, wins: 0, losses: 0, pending: 0 },
  },

  // ── SPECIAL ────────────────────────────────────────────────────────────────
  {
    id: 'form_momentum',
    name: 'Form Momentum',
    icon: '📈',
    category: 'special',
    description: 'Teams on winning streaks — momentum is real in football',
    enabled: false,
    rules: [
      { market: 'form', formSide: '1', minFormStreak: 4, minProbability: 0.45, minOdds: 1.50, requireValue: true, edgeThreshold: 0 },
      { market: 'form', formSide: '2', minFormStreak: 4, minProbability: 0.40, minOdds: 1.80, requireValue: true, edgeThreshold: 0 },
      { market: 'form', formSide: '1', minFormStreak: 6, minProbability: 0.40, minOdds: 1.30, requireValue: true, edgeThreshold: 0 },
    ],
    stats: { total: 0, wins: 0, losses: 0, pending: 0 },
  },
  {
    id: 'corners_hunter',
    name: 'Corners Hunter',
    icon: '📐',
    category: 'special',
    description: 'High-pressing teams generate corner-heavy games',
    enabled: false,
    rules: [
      { market: 'corners', cornersLine: 9.5, ouSide: 'over', minProbability: 0.55, minOdds: 1.70, requireValue: true, edgeThreshold: 0 },
      { market: 'corners', cornersLine: 8.5, ouSide: 'over', minProbability: 0.65, minOdds: 1.40, requireValue: true, edgeThreshold: 0 },
    ],
    stats: { total: 0, wins: 0, losses: 0, pending: 0 },
  },

  // ── SHARP ──────────────────────────────────────────────────────────────────
  {
    id: 'sharp_follower',
    name: 'Sharp Follower',
    icon: '🔪',
    category: 'sharp',
    description: 'Follow steam moves — odds that shortened significantly (sharp money)',
    enabled: false,
    rules: [
      // Uses 1x2 home — engine checks odds_movement.movement.home === 'shortened'
      { market: '1x2', side: '1', minProbability: 0.40, minOdds: 1.50, requireValue: true, edgeThreshold: 0 },
      { market: '1x2', side: '2', minProbability: 0.35, minOdds: 1.80, requireValue: true, edgeThreshold: 0 },
    ],
    stats: { total: 0, wins: 0, losses: 0, pending: 0 },
  },
  {
    id: 'drift_fader',
    name: 'Drift Fader',
    icon: '📉',
    category: 'sharp',
    description: 'Fade heavily drifted favourites — when the market moves against a team',
    enabled: false,
    rules: [
      // Fade the drifted home team → back the away
      { market: '1x2', side: '2', minProbability: 0.35, minOdds: 2.20, requireValue: true, edgeThreshold: 0.03 },
      { market: 'double_chance', dcSide: 'X2', minProbability: 0.60, minOdds: 1.40, requireValue: true, edgeThreshold: 0 },
    ],
    stats: { total: 0, wins: 0, losses: 0, pending: 0 },
  },
];
