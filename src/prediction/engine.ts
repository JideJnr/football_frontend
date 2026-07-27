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

  // Handle multiple H2H data structures from different providers
  const meetings: number =
    h2h?.teamDuel?.meetings ?? h2h?.meetings ??
    h2h?.totalMeetings ?? h2h?.games ?? 0;
  const homeWins: number =
    h2h?.teamDuel?.homeWins ?? h2h?.homeWins ??
    h2h?.homeWinsTotal ?? h2h?.homeWon ?? 0;
  const draws: number =
    h2h?.teamDuel?.draws ?? h2h?.draws ??
    h2h?.drawsTotal ?? h2h?.drawn ?? 0;
  const awayWins: number =
    h2h?.teamDuel?.awayWins ?? h2h?.awayWins ??
    h2h?.awayWinsTotal ?? h2h?.awayWon ?? 0;

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
  if (pos >= n - 4) return 'relegation'; // bottom 5 (expanded from bottom 3)
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

// ─── Home/Away Form Split ────────────────────────────────────────────────
//
//  Separates home and away form to give a more accurate picture of team
//  performance in their respective conditions. Home advantage is a well-
//  documented phenomenon in football.

export interface HomeAwayForm {
  homeForm: number;      // 0–1 weighted home form score
  awayForm: number;      // 0–1 weighted away form score
  homeSampleSize: number;
  awaySampleSize: number;
  homeWins: number;
  homeDraws: number;
  homeLosses: number;
  awayWins: number;
  awayDraws: number;
  awayLosses: number;
  detail: string;
}

export const calcHomeAwayForm = (
  recentMatches: any[],
  teamName: string,
  standings: any[],
): HomeAwayForm => {
  if (!recentMatches || recentMatches.length === 0) {
    return { homeForm: 0.5, awayForm: 0.5, homeSampleSize: 0, awaySampleSize: 0, homeWins: 0, homeDraws: 0, homeLosses: 0, awayWins: 0, awayDraws: 0, awayLosses: 0, detail: 'No recent matches' };
  }

  const totalTeams = standings?.length || 20;
  let homeWeightedPoints = 0;
  let homeTotalWeight = 0;
  let awayWeightedPoints = 0;
  let awayTotalWeight = 0;
  let homeWins = 0, homeDraws = 0, homeLosses = 0;
  let awayWins = 0, awayDraws = 0, awayLosses = 0;

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

    let pts = 0;
    if (own > opp) { pts = 3; if (isHome) homeWins++; else awayWins++; }
    else if (own === opp) { pts = 1; if (isHome) homeDraws++; else awayDraws++; }
    else { if (isHome) homeLosses++; else awayLosses++; }

    if (isHome) {
      homeWeightedPoints += pts * strength;
      homeTotalWeight += 3 * strength;
    } else {
      awayWeightedPoints += pts * strength;
      awayTotalWeight += 3 * strength;
    }
  }

  const homeForm = homeTotalWeight > 0 ? homeWeightedPoints / homeTotalWeight : 0.5;
  const awayForm = awayTotalWeight > 0 ? awayWeightedPoints / awayTotalWeight : 0.5;
  const n = homeWins + homeDraws + homeLosses + awayWins + awayDraws + awayLosses;

  return {
    homeForm: parseFloat(homeForm.toFixed(3)),
    awayForm: parseFloat(awayForm.toFixed(3)),
    homeSampleSize: homeWins + homeDraws + homeLosses,
    awaySampleSize: awayWins + awayDraws + awayLosses,
    homeWins, homeDraws, homeLosses,
    awayWins, awayDraws, awayLosses,
    detail: `Home: ${homeWins}W-${homeDraws}D-${homeLosses}L | Away: ${awayWins}W-${awayDraws}D-${awayLosses}L`,
  };
};

// ─── Goals Scored/Conceded Trends ────────────────────────────────────────
//
//  Analyzes recent goals scored and conceded to determine attacking and
//  defensive strength. Returns averages and trends.

export interface GoalsTrend {
  avgGoalsScored: number;
  avgGoalsConceded: number;
  avgGoalsScoredHome: number;
  avgGoalsConcededHome: number;
  avgGoalsScoredAway: number;
  avgGoalsConcededAway: number;
  scoringTrend: 'improving' | 'declining' | 'stable';
  defensiveTrend: 'improving' | 'declining' | 'stable';
  over25Probability: number;  // estimated probability of over 2.5 goals
  bttsProbability: number;    // estimated probability of both teams scoring
  detail: string;
}

export const calcGoalsTrends = (recentMatches: any[], teamName: string): GoalsTrend => {
  if (!recentMatches || recentMatches.length === 0) {
    return { avgGoalsScored: 0, avgGoalsConceded: 0, avgGoalsScoredHome: 0, avgGoalsConcededHome: 0, avgGoalsScoredAway: 0, avgGoalsConcededAway: 0, scoringTrend: 'stable', defensiveTrend: 'stable', over25Probability: 0.5, bttsProbability: 0.5, detail: 'No recent matches' };
  }

  let totalScored = 0;
  let totalConceded = 0;
  let homeScored = 0;
  let homeConceded = 0;
  let homeGames = 0;
  let awayScored = 0;
  let awayConceded = 0;
  let awayGames = 0;
  const recentScores: number[] = [];  // goals scored in last 5 matches
  const recentConceded: number[] = []; // goals conceded in last 5 matches

  for (const event of recentMatches) {
    const homeName: string = event?.home_team?.name || event?.homeTeam?.name || '';
    const isHome = homeName.toLowerCase() === teamName.toLowerCase();
    const score = event?.score || {};
    const hs = Number(score.home ?? event?.homeScore?.current);
    const as_ = Number(score.away ?? event?.awayScore?.current);
    if (!Number.isFinite(hs) || !Number.isFinite(as_)) continue;

    const own = isHome ? hs : as_;
    const opp = isHome ? as_ : hs;

    totalScored += own;
    totalConceded += opp;
    recentScores.push(own);
    recentConceded.push(opp);

    if (isHome) {
      homeScored += own;
      homeConceded += opp;
      homeGames++;
    } else {
      awayScored += own;
      awayConceded += opp;
      awayGames++;
    }
  }

  const n = recentMatches.length;
  const avgScored = totalScored / n;
  const avgConceded = totalConceded / n;
  const avgScoredHome = homeGames > 0 ? homeScored / homeGames : avgScored;
  const avgConcededHome = homeGames > 0 ? homeConceded / homeGames : avgConceded;
  const avgScoredAway = awayGames > 0 ? awayScored / awayGames : avgScored;
  const avgConcededAway = awayGames > 0 ? awayConceded / awayGames : avgConceded;

  // Scoring trend: compare first half vs second half of recent matches
  const half = Math.max(1, Math.floor(recentScores.length / 2));
  const firstHalfAvg = recentScores.slice(0, half).reduce((a, b) => a + b, 0) / half;
  const secondHalfAvg = recentScores.slice(half).reduce((a, b) => a + b, 0) / (recentScores.length - half);
  const scoringTrend = secondHalfAvg > firstHalfAvg + 0.3 ? 'improving' : secondHalfAvg < firstHalfAvg - 0.3 ? 'declining' : 'stable';

  // Defensive trend
  const firstHalfConcededAvg = recentConceded.slice(0, half).reduce((a, b) => a + b, 0) / half;
  const secondHalfConcededAvg = recentConceded.slice(half).reduce((a, b) => a + b, 0) / (recentConceded.length - half);
  const defensiveTrend = secondHalfConcededAvg < firstHalfConcededAvg - 0.3 ? 'improving' : secondHalfConcededAvg > firstHalfConcededAvg + 0.3 ? 'declining' : 'stable';

  // Over 2.5 probability estimation based on avg total goals
  const avgTotal = avgScored + avgConceded;
  const over25Probability = Math.min(0.95, Math.max(0.05, avgTotal > 2.5 ? 0.7 : avgTotal > 2.0 ? 0.5 : 0.3));

  // BTTS probability estimation
  const bttsProbability = Math.min(0.95, Math.max(0.05, (avgScored > 0.8 && avgConceded > 0.8) ? 0.65 : (avgScored > 0.5 && avgConceded > 0.5) ? 0.45 : 0.25));

  return {
    avgGoalsScored: parseFloat(avgScored.toFixed(2)),
    avgGoalsConceded: parseFloat(avgConceded.toFixed(2)),
    avgGoalsScoredHome: parseFloat(avgScoredHome.toFixed(2)),
    avgGoalsConcededHome: parseFloat(avgConcededHome.toFixed(2)),
    avgGoalsScoredAway: parseFloat(avgScoredAway.toFixed(2)),
    avgGoalsConcededAway: parseFloat(avgConcededAway.toFixed(2)),
    scoringTrend,
    defensiveTrend,
    over25Probability: parseFloat(over25Probability.toFixed(3)),
    bttsProbability: parseFloat(bttsProbability.toFixed(3)),
    detail: `Scored: ${avgScored.toFixed(1)}/game (H: ${avgScoredHome.toFixed(1)}, A: ${avgScoredAway.toFixed(1)}) | Conceded: ${avgConceded.toFixed(1)}/game (H: ${avgConcededHome.toFixed(1)}, A: ${avgConcededAway.toFixed(1)}) | Trend: ${scoringTrend} attack, ${defensiveTrend} defense`,
  };
};

// ─── Fixture Congestion / Fatigue ────────────────────────────────────────
//
//  Analyzes the number of matches played in a recent window and the rest
//  days between matches. Teams with heavy fixture schedules tend to perform
//  worse, especially in the latter stages of congested periods.

export interface FixtureFatigue {
  matchesLast7Days: number;
  matchesLast14Days: number;
  matchesLast30Days: number;
  avgRestDays: number;
  fatigueLevel: 'low' | 'medium' | 'high';
  fatigueMultiplier: number;  // applied to probability: <1.0 = fatigue hurts
  detail: string;
}

export const calcFixtureFatigue = (recentMatches: any[]): FixtureFatigue => {
  if (!recentMatches || recentMatches.length === 0) {
    return { matchesLast7Days: 0, matchesLast14Days: 0, matchesLast30Days: 0, avgRestDays: 0, fatigueLevel: 'low', fatigueMultiplier: 1.0, detail: 'No recent match data' };
  }

  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const fourteenDays = 14 * 24 * 60 * 60 * 1000;
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;

  let matchesLast7 = 0;
  let matchesLast14 = 0;
  let matchesLast30 = 0;
  let totalRestDays = 0;
  let restCount = 0;

  // Sort matches by date (most recent first)
  const sorted = [...recentMatches].sort((a, b) => {
    const aDate = a?.start_time || a?.startTimestamp || 0;
    const bDate = b?.start_time || b?.startTimestamp || 0;
    return bDate - aDate;
  });

  for (let i = 0; i < sorted.length; i++) {
    const matchDate = sorted[i]?.start_time || sorted[i]?.startTimestamp || 0;
    const matchMs = typeof matchDate === 'string' ? new Date(matchDate).getTime() : matchDate < 1e10 ? matchDate * 1000 : matchDate;
    const age = now - matchMs;

    if (age <= sevenDays) matchesLast7++;
    if (age <= fourteenDays) matchesLast14++;
    if (age <= thirtyDays) matchesLast30++;

    // Calculate rest days between consecutive matches
    if (i > 0) {
      const prevDate = sorted[i - 1]?.start_time || sorted[i - 1]?.startTimestamp || 0;
      const prevMs = typeof prevDate === 'string' ? new Date(prevDate).getTime() : prevDate < 1e10 ? prevDate * 1000 : prevDate;
      const restMs = matchMs - prevMs;
      if (restMs > 0) {
        totalRestDays += restMs / (24 * 60 * 60 * 1000);
        restCount++;
      }
    }
  }

  const avgRestDays = restCount > 0 ? totalRestDays / restCount : 3;  // default 3 days if unknown

  // Fatigue multiplier: more matches in last 7 days = more fatigue
  let fatigueMultiplier = 1.0;
  let fatigueLevel: 'low' | 'medium' | 'high' = 'low';
  if (matchesLast7 >= 4) { fatigueMultiplier = 0.85; fatigueLevel = 'high'; }
  else if (matchesLast7 >= 3) { fatigueMultiplier = 0.92; fatigueLevel = 'medium'; }
  else if (matchesLast7 >= 2) { fatigueMultiplier = 0.97; fatigueLevel = 'medium'; }

  // Also consider avg rest days
  if (avgRestDays < 2) fatigueMultiplier *= 0.9;
  else if (avgRestDays < 3) fatigueMultiplier *= 0.95;
  else if (avgRestDays > 5) fatigueMultiplier *= 1.05;

  return {
    matchesLast7Days: matchesLast7,
    matchesLast14Days: matchesLast14,
    matchesLast30Days: matchesLast30,
    avgRestDays: parseFloat(avgRestDays.toFixed(1)),
    fatigueLevel,
    fatigueMultiplier: parseFloat(fatigueMultiplier.toFixed(3)),
    detail: `${matchesLast7} matches in 7d, ${matchesLast14} in 14d | Avg rest: ${avgRestDays.toFixed(1)}d | Fatigue: ${fatigueLevel}`,
  };
};

// ─── Motivation Factor ────────────────────────────────────────────────────
//
//  Beyond table pressure zones, we also consider the motivation level based
//  on how close a team is to a meaningful target (title, top-4, survival,
//  European qualification, relegation battle).

export interface MotivationFactor {
  homeMotivation: number;   // 0.8 - 1.2 multiplier
  awayMotivation: number;
  homeReason: string;
  awayReason: string;
  detail: string;
}

export const calcMotivation = (match: any): MotivationFactor => {
  const standings: any[] = match?.standings || [];
  const homeTeam: string = match?.home_team || '';
  const awayTeam: string = match?.away_team || '';
  const n = standings.length || 20;

  const findTeam = (name: string) => {
    return standings.find((r: any) => {
      const teamName: string = r?.team?.name ?? r?.name ?? '';
      return teamName.toLowerCase().includes(name.toLowerCase().slice(0, 6));
    });
  };

  const homeRow = findTeam(homeTeam);
  const awayRow = findTeam(awayTeam);

  const homePos = homeRow ? (homeRow?.position ?? homeRow?.rank ?? 0) : 0;
  const awayPos = awayRow ? (awayRow?.position ?? awayRow?.rank ?? 0) : 0;

  let homeMotivation = 1.0;
  let awayMotivation = 1.0;
  const homeReasons: string[] = [];
  const awayReasons: string[] = [];

  // Home motivation
  if (homePos === 1) { homeMotivation = 1.15; homeReasons.push('title race'); }
  else if (homePos <= 4) { homeMotivation = 1.10; homeReasons.push('top-4 race'); }
  else if (homePos <= 6) { homeMotivation = 1.05; homeReasons.push('European push'); }
   else if (homePos >= n - 4) { homeMotivation = 1.12; homeReasons.push('relegation battle'); }
  else if (homePos >= n - 5) { homeMotivation = 1.06; homeReasons.push('mid-table push'); }

  // Away motivation
  if (awayPos === 1) { awayMotivation = 1.15; awayReasons.push('title race'); }
  else if (awayPos <= 4) { awayMotivation = 1.10; awayReasons.push('top-4 race'); }
  else if (awayPos <= 6) { awayMotivation = 1.05; awayReasons.push('European push'); }
   else if (awayPos >= n - 4) { awayMotivation = 1.12; awayReasons.push('relegation battle'); }
  else if (awayPos >= n - 5) { awayMotivation = 1.06; awayReasons.push('mid-table push'); }

   // Derby/rivalry bonus
   const homeLeague = homeRow?.league || '';
   const awayLeague = awayRow?.league || '';
   if (homeLeague && awayLeague && homeLeague === awayLeague) {
     // Check if it's a local derby (same city/region)
     // Try multiple possible field names for city/region
     const homeCity = homeRow?.team?.city || homeRow?.team?.region || homeRow?.team?.country || '';
     const awayCity = awayRow?.team?.city || awayRow?.team?.region || awayRow?.team?.country || '';
     if (homeCity && awayCity && homeCity.toLowerCase() === awayCity.toLowerCase()) {
       homeMotivation *= 1.05;
       awayMotivation *= 1.05;
       homeReasons.push('local derby');
       awayReasons.push('local derby');
     }
   }

  // Clamp multipliers
  homeMotivation = Math.max(0.8, Math.min(1.2, homeMotivation));
  awayMotivation = Math.max(0.8, Math.min(1.2, awayMotivation));

  const detail = `Home: ${homeReasons.join(', ') || 'neutral'} (${homeMotivation.toFixed(2)}x) | Away: ${awayReasons.join(', ') || 'neutral'} (${awayMotivation.toFixed(2)}x)`;

  return { homeMotivation, awayMotivation, homeReason: homeReasons.join(', ') || 'neutral', awayReason: awayReasons.join(', ') || 'neutral', detail };
};

// ─── Poisson-based 1x2 Model ──────────────────────────────────────────
//
//  Computes 1x2 probabilities from expected goals using the Poisson distribution.
//  This is the industry-standard approach for football match prediction.
//
//  Expected goals are derived from:
//    1. Team attacking strength (goals scored per game)
//    2. Team defensive strength (goals conceded per game)
//    3. League average goals
//    4. Home advantage factor

export interface Poisson1x2 {
  home: number;       // P(home win)
  draw: number;       // P(draw)
  away: number;       // P(away win)
  lambdaHome: number; // expected goals for home team
  lambdaAway: number; // expected goals for away team
  detail: string;
}

/**
 * Poisson probability mass function: P(X = k) = (lambda^k * e^(-lambda)) / k!
 */
const poissonPmf = (k: number, lambda: number): number => {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  const logP = k * Math.log(lambda) - lambda - logFactorial(k);
  return Math.exp(logP);
};

const logFactorial = (n: number): number => {
  if (n <= 1) return 0;
  let result = 0;
  for (let i = 2; i <= n; i++) result += Math.log(i);
  return result;
};

/**
 * Compute expected goals for a team based on attacking/defensive strength
 * and league averages.
 */
const computeExpectedGoals = (
  teamAttack: number,
  teamDefense: number,
  oppDefense: number,
  leagueAvgGoals: number,
  homeAdvantage: number,
): number => {
  const base = teamAttack * oppDefense * leagueAvgGoals;
  return Math.max(0.05, base * homeAdvantage);
};

/**
 * Compute 1x2 probabilities using the Poisson distribution.
 * Sums probabilities for all scorelines up to a max of 10 goals per team.
 */
export const poisson1x2 = (
  lambdaHome: number,
  lambdaAway: number,
): Poisson1x2 => {
  const maxGoals = 10;
  let pHome = 0;
  let pDraw = 0;
  let pAway = 0;

  for (let h = 0; h <= maxGoals; h++) {
    for (let a = 0; a <= maxGoals; a++) {
      const prob = poissonPmf(h, lambdaHome) * poissonPmf(a, lambdaAway);
      if (h > a) pHome += prob;
      else if (h === a) pDraw += prob;
      else pAway += prob;
    }
  }

  // Normalize to ensure sum = 1
  const total = pHome + pDraw + pAway;
  if (total > 0 && Math.abs(total - 1) > 0.001) {
    pHome /= total;
    pDraw /= total;
    pAway /= total;
  }

  return {
    home: parseFloat(pHome.toFixed(4)),
    draw: parseFloat(pDraw.toFixed(4)),
    away: parseFloat(pAway.toFixed(4)),
    lambdaHome: parseFloat(lambdaHome.toFixed(3)),
    lambdaAway: parseFloat(lambdaAway.toFixed(3)),
    detail: `λ_home=${lambdaHome.toFixed(2)} λ_away=${lambdaAway.toFixed(2)} | P(1)=${(pHome * 100).toFixed(1)}% P(X)=${(pDraw * 100).toFixed(1)}% P(2)=${(pAway * 100).toFixed(1)}%`,
  };
};

/**
 * Derive expected goals from recent match data for a team.
 * Uses goals scored/conceded averages adjusted for opponent strength.
 */
export const deriveExpectedGoals = (
  recentMatches: any[],
  teamName: string,
  standings: any[],
  isHome: boolean,
): { lambda: number; avgScored: number; avgConceded: number } => {
  if (!recentMatches || recentMatches.length === 0) {
    return { lambda: 1.0, avgScored: 0, avgConceded: 0 };
  }

  const totalTeams = standings?.length || 20;
  let totalScored = 0;
  let totalConceded = 0;
  let games = 0;

  for (const event of recentMatches) {
    const homeName: string = event?.home_team?.name || event?.homeTeam?.name || '';
    const awayName: string = event?.away_team?.name || event?.awayTeam?.name || '';
    const matchIsHome = homeName.toLowerCase() === teamName.toLowerCase();
    if (isHome !== matchIsHome) continue;

    const score = event?.score || {};
    const hs = Number(score.home ?? event?.homeScore?.current);
    const as_ = Number(score.away ?? event?.awayScore?.current);
    if (!Number.isFinite(hs) || !Number.isFinite(as_)) continue;

    totalScored += matchIsHome ? hs : as_;
    totalConceded += matchIsHome ? as_ : hs;
    games++;
  }

  if (games === 0) return { lambda: 1.0, avgScored: 0, avgConceded: 0 };

  const avgScored = totalScored / games;
  const avgConceded = totalConceded / games;

  // League average goals per team per game (typically ~1.4 for top leagues)
  const leagueAvgGoals = 1.4;

  // Home advantage factor (home teams score ~0.3 more goals per game on average)
  const homeAdvantage = isHome ? 1.15 : 0.85;

  // Opponent defensive strength (average of opponents' defensive weakness)
  // If we concede more than league average, opponent defense is weak (factor > 1)
  const oppDefenseFactor = Math.max(0.5, Math.min(1.5, avgConceded / leagueAvgGoals));

  // Team attacking strength relative to league average
  const attackFactor = Math.max(0.3, avgScored / leagueAvgGoals);

  const lambda = computeExpectedGoals(attackFactor, oppDefenseFactor, oppDefenseFactor, leagueAvgGoals, homeAdvantage);

  return { lambda: parseFloat(lambda.toFixed(3)), avgScored: parseFloat(avgScored.toFixed(2)), avgConceded: parseFloat(avgConceded.toFixed(2)) };
};

// ─── Elo Rating System ─────────────────────────────────────────────────
//
//  Maintains Elo ratings for teams based on match results.
//  Elo ratings provide a robust baseline for team strength that can be used
//  to compute baseline 1x2 probabilities.

export interface EloRating {
  teamName: string;
  elo: number;
  gamesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
}

const DEFAULT_ELO = 1500;
const ELO_K = 32;
const ELO_HOME_ADVANTAGE = 100; // Elo points added for home team

/**
 * Compute expected score (draw probability) for a team given Elo ratings.
 * Returns expected score in [0, 1] where 0.5 = expected draw.
 */
const eloExpectedScore = (eloA: number, eloB: number): number => {
  return 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
};

/**
 * Compute 1x2 probabilities from Elo ratings.
 * Uses the Elo expected score to derive home win, draw, and away win probabilities.
 * The draw probability is estimated based on the closeness of the ratings.
 */
export const elo1x2 = (homeElo: number, awayElo: number): { home: number; draw: number; away: number } => {
  const homeAdvElo = homeElo + ELO_HOME_ADVANTAGE;
  const expectedHome = eloExpectedScore(homeAdvElo, awayElo);
  const expectedAway = eloExpectedScore(awayElo, homeAdvElo);

  // Draw probability is inversely proportional to the rating difference
  const ratingDiff = Math.abs(homeElo - awayElo);
  const drawProb = Math.max(0.15, Math.min(0.45, 0.35 - ratingDiff / 2000));

  // Home and away probabilities share the remaining probability
  const remaining = 1 - drawProb;
  const homeProb = expectedHome * remaining;
  const awayProb = expectedAway * remaining;

  // Normalize
  const total = homeProb + drawProb + awayProb;
  return {
    home: parseFloat((homeProb / total).toFixed(4)),
    draw: parseFloat((drawProb / total).toFixed(4)),
    away: parseFloat((awayProb / total).toFixed(4)),
  };
};

/**
 * Update Elo ratings after a match result.
 * Returns updated ratings for both teams.
 */
export const updateEloRating = (
  homeElo: number,
  awayElo: number,
  homeGoals: number,
  awayGoals: number,
  homeEloCurrent: number = DEFAULT_ELO,
  awayEloCurrent: number = DEFAULT_ELO,
): { homeElo: number; awayElo: number } => {
  const homeAdvElo = homeEloCurrent + ELO_HOME_ADVANTAGE;
  const expectedHome = eloExpectedScore(homeAdvElo, awayEloCurrent);
  const expectedAway = eloExpectedScore(awayEloCurrent, homeAdvElo);

  let homeScore: number;
  if (homeGoals > awayGoals) homeScore = 1;
  else if (homeGoals === awayGoals) homeScore = 0.5;
  else homeScore = 0;

  const awayScore = 1 - homeScore;

  const newHomeElo = homeEloCurrent + ELO_K * (homeScore - expectedHome);
  const newAwayElo = awayEloCurrent + ELO_K * (awayScore - expectedAway);

  return {
    homeElo: Math.round(Math.max(1000, newHomeElo)),
    awayElo: Math.round(Math.max(1000, newAwayElo)),
  };
};

// ─── Context-adjusted probability ─────────────────────────────────────
//
//  Combines opponent-weighted form, H2H bias, table pressure, and Poisson
//  model into a single adjusted probability for a given side ('1' = home, '2' = away, 'X' = draw).
//
//  The raw model probability is nudged by:
//    1. Weighted form delta     (how much better/worse than average this team is)
//    2. Home/Away form split    (separate home and away performance)
//    3. Goals scored/conceded   (attacking and defensive strength trends)
//    4. Fixture fatigue         (match congestion and rest days)
//    5. Motivation factor       (league position implications)
//    6. H2H bias                (historical dominance in this specific fixture)
//    7. Table pressure          (motivation/anxiety multiplier)
//    8. Poisson model           (statistical expected goals model)
//    9. Home advantage          (home field advantage factor)
//
//  The adjustment is intentionally moderate (max ±12%) to avoid overriding
//  the model's core probability signal while still providing meaningful corrections.

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
  const teamName = side === '1' ? match?.home_team : match?.away_team;
  const recent = side === '1' ? homeRecent : awayRecent;

  if (side === '1' && homeRecent.length > 0) {
    const wf = calcOpponentWeightedForm(homeRecent, match?.home_team || '', standings);
    if (wf.sampleSize >= 3) {
      // score 0.5 = neutral, >0.5 = good form, <0.5 = poor form
      const formDelta = (wf.score - 0.5) * 0.18; // max ±9% (increased from 0.12)
       delta += formDelta;
       if (Math.abs(formDelta) > 0.01) {
         factors.push(`Home weighted form: ${wf.detail} (${formDelta > 0 ? '+' : ''}${(formDelta * 100).toFixed(1)}%)`);
       }
     }
   }

   if (side === '2' && awayRecent.length > 0) {
     const wf = calcOpponentWeightedForm(awayRecent, match?.away_team || '', standings);
     if (wf.sampleSize >= 3) {
       const formDelta = (wf.score - 0.5) * 0.18;
      delta += formDelta;
      if (Math.abs(formDelta) > 0.01) {
        factors.push(`Away weighted form: ${wf.detail} (${formDelta > 0 ? '+' : ''}${(formDelta * 100).toFixed(1)}%)`);
      }
    }
  }

  // ── 2. Home/Away form split ────────────────────────────────────────
  if (homeRecent.length > 0 && awayRecent.length > 0) {
    const homeForm = calcHomeAwayForm(homeRecent, match?.home_team || '', standings);
    const awayForm = calcHomeAwayForm(awayRecent, match?.away_team || '', standings);

    if (side === '1' && homeForm.homeSampleSize >= 3) {
       const homeFormDelta = (homeForm.homeForm - 0.5) * 0.12; // increased from 0.08
       delta += homeFormDelta;
       if (Math.abs(homeFormDelta) > 0.005) {
         factors.push(`Home form split: ${homeForm.homeWins}W-${homeForm.homeDraws}D-${homeForm.homeLosses}L at home (${homeFormDelta > 0 ? '+' : ''}${(homeFormDelta * 100).toFixed(1)}%)`);
       }
     }
     if (side === '2' && awayForm.awaySampleSize >= 3) {
       const awayFormDelta = (awayForm.awayForm - 0.5) * 0.12;
      delta += awayFormDelta;
      if (Math.abs(awayFormDelta) > 0.005) {
        factors.push(`Away form split: ${awayForm.awayWins}W-${awayForm.awayDraws}D-${awayForm.awayLosses}L away (${awayFormDelta > 0 ? '+' : ''}${(awayFormDelta * 100).toFixed(1)}%)`);
      }
    }
  }

  // ── 3. Goals scored/conceded trends ────────────────────────────────
  if (recent.length >= 3) {
    const goalsTrends = calcGoalsTrends(recent, teamName || '');
     const attackDelta = (goalsTrends.avgGoalsScored - 1.5) * 0.03; // increased from 0.02
     const defenseDelta = (1.5 - goalsTrends.avgGoalsConceded) * 0.03;
    const goalsDelta = attackDelta + defenseDelta;
    delta += goalsDelta;
    if (Math.abs(goalsDelta) > 0.005) {
      factors.push(`Goals trend: ${goalsTrends.avgGoalsScored} scored, ${goalsTrends.avgGoalsConceded} conceded/game (${goalsDelta > 0 ? '+' : ''}${(goalsDelta * 100).toFixed(1)}%)`);
    }
  }

  // ── 4. Fixture fatigue ──────────────────────────────────────────────
  const fatigue = calcFixtureFatigue(recent);
  if (fatigue.fatigueMultiplier !== 1.0) {
     const fatigueDelta = (fatigue.fatigueMultiplier - 1) * 0.08;
    delta += fatigueDelta;
    factors.push(`Fixture fatigue: ${fatigue.detail} (${fatigueDelta > 0 ? '+' : ''}${(fatigueDelta * 100).toFixed(1)}%)`);
  }

  // ── 5. Motivation factor ────────────────────────────────────────────
  const motivation = calcMotivation(match);
  if (side === '1' && motivation.homeMotivation !== 1.0) {
     const motDelta = rawProb * (motivation.homeMotivation - 1) * 1.5;
     delta += motDelta;
     factors.push(`Home motivation: ${motivation.homeReason} (${motivation.homeMotivation.toFixed(2)}x, ${motDelta > 0 ? '+' : ''}${(motDelta * 100).toFixed(1)}%)`);
   }
   if (side === '2' && motivation.awayMotivation !== 1.0) {
     const motDelta = rawProb * (motivation.awayMotivation - 1) * 1.5;
    delta += motDelta;
    factors.push(`Away motivation: ${motivation.awayReason} (${motivation.awayMotivation.toFixed(2)}x, ${motDelta > 0 ? '+' : ''}${(motDelta * 100).toFixed(1)}%)`);
  }

  // ── 6. H2H bias ────────────────────────────────────────────────────────────
  const h2h = calcH2HBias(match);
  if (h2h.meetings >= 3) {
     const h2hDelta = side === '1' ? h2h.bias * 0.06
                    : side === '2' ? -h2h.bias * 0.06
                   : 0; // draws: no H2H adjustment
    delta += h2hDelta;
    if (Math.abs(h2hDelta) > 0.005) {
      factors.push(`H2H: ${h2h.detail} (${h2hDelta > 0 ? '+' : ''}${(h2hDelta * 100).toFixed(1)}%)`);
    }
  }

  // ── 7. Table pressure ──────────────────────────────────────────────────────
  const pressure = calcTablePressure(match);
  if (side === '1' && pressure.homeMultiplier !== 1.0) {
     const pressureDelta = rawProb * (pressure.homeMultiplier - 1) * 1.5;
     delta += pressureDelta;
     factors.push(`Table pressure: ${pressure.detail} (${pressureDelta > 0 ? '+' : ''}${(pressureDelta * 100).toFixed(1)}%)`);
   }
   if (side === '2' && pressure.awayMultiplier !== 1.0) {
     const pressureDelta = rawProb * (pressure.awayMultiplier - 1) * 1.5;
    delta += pressureDelta;
     factors.push(`Table pressure: ${pressure.detail} (${pressureDelta > 0 ? '+' : ''}${(pressureDelta * 100).toFixed(1)}%)`);
   }

   // ── 8. Poisson model ──────────────────────────────────────
   const homeEG = deriveExpectedGoals(homeRecent, match?.home_team || '', standings, true);
   const awayEG = deriveExpectedGoals(awayRecent, match?.away_team || '', standings, false);
   const poisson = poisson1x2(homeEG.lambda, awayEG.lambda);

   if (side === '1') {
     const poissonDelta = poisson.home - rawProb;
     delta += poissonDelta * 0.5;
     if (Math.abs(poissonDelta) > 0.01) {
       factors.push(`Poisson model: P(1)=${(poisson.home * 100).toFixed(1)}% (λ=${poisson.lambdaHome})`);
     }
   } else if (side === '2') {
     const poissonDelta = poisson.away - rawProb;
     delta += poissonDelta * 0.5;
     if (Math.abs(poissonDelta) > 0.01) {
       factors.push(`Poisson model: P(2)=${(poisson.away * 100).toFixed(1)}% (λ=${poisson.lambdaAway})`);
     }
   } else {
     const poissonDelta = poisson.draw - rawProb;
     delta += poissonDelta * 0.5;
     if (Math.abs(poissonDelta) > 0.01) {
       factors.push(`Poisson model: P(X)=${(poisson.draw * 100).toFixed(1)}%`);
     }
   }

    // ── 9. Learned home advantage ──────────────────────────────
    // Home advantage is learned from historical match results rather than hardcoded.
    // This adapts to the specific league/competition's home advantage pattern.
    const homeAdvFactor = learnedHomeAdvantage(match);
    if (side === '1' && homeAdvFactor !== 1.0) {
      const homeAdvBoost = (homeAdvFactor - 1.0) * rawProb;
      delta += homeAdvBoost;
      if (Math.abs(homeAdvBoost) > 0.005) {
        factors.push(`Learned home advantage: ${homeAdvFactor.toFixed(3)}x (${homeAdvBoost > 0 ? '+' : ''}${(homeAdvBoost * 100).toFixed(1)}%)`);
      }
    } else if (side === '2' && homeAdvFactor !== 1.0) {
      const awayPenalty = (1.0 / homeAdvFactor - 1.0) * rawProb;
      delta += awayPenalty;
      if (Math.abs(awayPenalty) > 0.005) {
        factors.push(`Learned away disadvantage: ${homeAdvFactor.toFixed(3)}x (${awayPenalty > 0 ? '+' : ''}${(awayPenalty * 100).toFixed(1)}%)`);
      }
    }

   // Clamp total delta to ±15% and final probability to [0.03, 0.97]
   const clampedDelta = Math.max(-0.15, Math.min(0.15, delta));
   const adjustedProbability = Math.max(0.03, Math.min(0.97, rawProb + clampedDelta));

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
  // Try multiple market ID patterns and name patterns for 1X2
  const selMap: Record<string, string[]> = {
    '1': ['Home', '1', 'Home Win', '1X2 Home', '1 (Home)'],
    'X': ['Draw', 'X', 'Draw', '1X2 Draw', 'X (Draw)'],
    '2': ['Away', '2', 'Away Win', '1X2 Away', '2 (Away)'],
  };
  const targetNames = selMap[side] || [selMap[side]];

  // Try multiple market ID patterns
  const market = markets.find((m: any) => (m.id === '1' || m.id === '1X2' || m.id === 'match_result') && m.status === 1)
    || markets.find((m: any) => m.id === '1' || m.id === '1X2' || m.id === 'match_result')
    || markets.find((m: any) => (m.name || '').toLowerCase().includes('1x2') || (m.name || '').toLowerCase().includes('match result') || (m.name || '').toLowerCase().includes('full time'))
    || markets.find((m: any) => (m.name || '').toLowerCase().includes('1x2') || (m.name || '').toLowerCase().includes('match result'));
  if (!market) return null;

  // Try to find selection by name (multiple possible names per side)
  const sel = market.selections?.find((s: any) =>
    targetNames.some((name: string) => s.name === name || (s.name || '').toLowerCase() === name.toLowerCase())
  );
  if (!sel) return null;
  return { odds: parseOdds(sel.odds), probability: 0, label: targetNames[0], market: '1X2' };
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
  if (selection.includes('home') && !selection.includes('away')) return 'home_advantage';
  if (selection.includes('fatigue') || selection.includes('tired')) return 'fatigue_play';
  if (type.includes('btts') || selection.includes('both teams to score')) return 'btts_yes';
  if (type.includes('no_bet') || selection.includes('no goal') || selection.includes('clean sheet')) return 'btts_no';
  if (type.includes('ht_ft') || type.includes('half time')) return 'ht_ft_double';
  if (type.includes('under')) return 'goals_under';
  return 'value_hunter';
};

const pickSignalType = (pick: any, probability: number): SignalType => {
  const type = String(pick?.type || '').toLowerCase();
  const stake = pick?.stake || {};
  if (type.includes('value') || stake.value_bet) return 'value_bet';
  if (probability >= 0.65 || Number(pick?.confidence || 0) >= 75) return 'high_confidence';
  if (type.includes('fatigue') || type.includes('home_advantage') || type.includes('btts')) return 'form_signal';
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

  // Determine side for context adjustment
  const selection = String(pick?.selection || pick?.pick || '').toLowerCase();
  const side: '1' | 'X' | '2' = selection.includes('home') || selection === '1' ? '1'
    : selection.includes('away') || selection === '2' ? '2'
    : selection.includes('draw') || selection === 'x' ? 'X' : '1';

  // Apply context adjustment to the probability
  const contextAdj = applyContextAdjustment(probability, side, match);

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
    contextAdjustment: {
      rawProbability: contextAdj.rawProbability,
      delta: contextAdj.delta,
      factors: contextAdj.factors,
    },
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

  // ── NEW ENGINES ──────────────────────────────────────────────────
  {
    id: 'home_advantage',
    name: 'Home Advantage',
    icon: '🏠',
    category: 'result',
    description: 'Exploits the well-documented home advantage in football — teams perform significantly better at home',
    enabled: false,
    rules: [
      { market: '1x2', side: '1', minProbability: 0.55, minOdds: 1.40, requireValue: true, edgeThreshold: 0.05 },
      { market: 'double_chance', dcSide: '1X', minProbability: 0.70, minOdds: 1.15, requireValue: true, edgeThreshold: 0.03 },
      { market: 'over_under', ouLine: 2.5, ouSide: 'over', minProbability: 0.50, minOdds: 1.50, requireValue: true, edgeThreshold: 0 },
    ],
    stats: { total: 0, wins: 0, losses: 0, pending: 0 },
  },
  {
    id: 'fatigue_play',
    name: 'Fatigue Play',
    icon: '😓',
    category: 'special',
    description: 'Targets teams suffering from fixture congestion — tired teams underperform',
    enabled: false,
    rules: [
      { market: '1x2', side: '2', minProbability: 0.40, minOdds: 2.00, requireValue: true, edgeThreshold: 0.05 },
      { market: 'double_chance', dcSide: 'X2', minProbability: 0.55, minOdds: 1.50, requireValue: true, edgeThreshold: 0.04 },
      { market: 'over_under', ouLine: 2.5, ouSide: 'under', minProbability: 0.55, minOdds: 1.60, requireValue: true, edgeThreshold: 0 },
    ],
    stats: { total: 0, wins: 0, losses: 0, pending: 0 },
  },
  {
    id: 'goals_over',
    name: 'Goals Over',
    icon: '⚽',
    category: 'goals',
    description: 'High-scoring games — targets matches with strong attacking trends and weak defenses',
    enabled: false,
    rules: [
      { market: 'over_under', ouLine: 2.5, ouSide: 'over', minProbability: 0.60, minOdds: 1.50, requireValue: true, edgeThreshold: 0 },
      { market: 'over_under', ouLine: 3.5, ouSide: 'over', minProbability: 0.45, minOdds: 2.00, requireValue: true, edgeThreshold: 0.05 },
      { market: 'gg_ng', minProbability: 0.60, minOdds: 1.50, requireValue: true, edgeThreshold: 0 },
    ],
    stats: { total: 0, wins: 0, losses: 0, pending: 0 },
  },
  {
    id: 'goals_under',
    name: 'Goals Under',
    icon: '🛡️',
    category: 'goals',
    description: 'Low-scoring games — targets matches with strong defenses and tired attacking sides',
    enabled: false,
    rules: [
      { market: 'over_under', ouLine: 2.5, ouSide: 'under', minProbability: 0.55, minOdds: 1.60, requireValue: true, edgeThreshold: 0 },
      { market: 'over_under', ouLine: 1.5, ouSide: 'under', minProbability: 0.40, minOdds: 2.50, requireValue: true, edgeThreshold: 0.05 },
      { market: 'gg_ng', minProbability: 0.45, minOdds: 1.80, requireValue: true, edgeThreshold: 0 },
    ],
    stats: { total: 0, wins: 0, losses: 0, pending: 0 },
  },
  {
    id: 'btts_yes',
    name: 'BTTS Yes',
    icon: '🎯',
    category: 'special',
    description: 'Both teams to score — targets matches where both teams have strong attacks and weak defenses',
    enabled: false,
    rules: [
      { market: 'gg_ng', minProbability: 0.60, minOdds: 1.50, requireValue: true, edgeThreshold: 0 },
      { market: 'btts_over', minProbability: 0.55, minOdds: 1.60, requireValue: true, edgeThreshold: 0 },
    ],
    stats: { total: 0, wins: 0, losses: 0, pending: 0 },
  },
  {
    id: 'btts_no',
    name: 'BTTS No',
    icon: '🚫',
    category: 'special',
    description: 'Clean sheets — targets matches where at least one team has a strong defense',
    enabled: false,
    rules: [
      { market: 'gg_ng', minProbability: 0.55, minOdds: 1.80, requireValue: true, edgeThreshold: 0 },
      { market: 'clean_sheet', csSide: 'home', minProbability: 0.45, minOdds: 1.70, requireValue: true, edgeThreshold: 0 },
      { market: 'clean_sheet', csSide: 'away', minProbability: 0.45, minOdds: 2.00, requireValue: true, edgeThreshold: 0 },
    ],
    stats: { total: 0, wins: 0, losses: 0, pending: 0 },
  },
  {
    id: 'ht_ft_double',
    name: 'HT/FT Double',
    icon: '⏱️🏆',
    category: 'special',
    description: 'Half-time to full-time double results — targets matches likely to maintain their HT lead',
    enabled: false,
    rules: [
      { market: 'ht_1x2', side: '1', minProbability: 0.50, minOdds: 1.80, requireValue: true, edgeThreshold: 0.04 },
      { market: 'ht_1x2', side: '2', minProbability: 0.45, minOdds: 2.20, requireValue: true, edgeThreshold: 0.05 },
      { market: 'draw_no_bet', side: '1', minProbability: 0.55, minOdds: 1.50, requireValue: true, edgeThreshold: 0 },
    ],
     stats: { total: 0, wins: 0, losses: 0, pending: 0 },
   },
];

// ─── Probability Normalization ──────────────────────────────────────────
//
//  Ensures that P(1) + P(X) + P(2) = 1 after independent adjustments.
//  This is critical because the context adjustment function adjusts each
//  side independently, which can lead to inconsistent probability distributions.

export const normalize1x2 = (p1: number, pX: number, p2: number): { home: number; draw: number; away: number } => {
  const total = p1 + pX + p2;
  if (total <= 0) return { home: 0.33, draw: 0.34, away: 0.33 };
  const norm1 = Math.max(0.03, Math.min(0.94, p1 / total));
  const norm2 = Math.max(0.03, Math.min(0.94, p2 / total));
  const normX = Math.max(0.02, 1 - norm1 - norm2);
  return {
    home: parseFloat(norm1.toFixed(4)),
    draw: parseFloat(normX.toFixed(4)),
    away: parseFloat(norm2.toFixed(4)),
  };
};

// ─── Model Consensus 1x2 ────────────────────────────────────────────────
//
//  Combines the Poisson model, Elo ratings, and backend prediction
//  into a single consensus 1x2 probability distribution.
//  This provides a more robust prediction than any single model alone.

export interface Consensus1x2 {
  home: number;
  draw: number;
  away: number;
  poisson: Poisson1x2;
  elo: { home: number; draw: number; away: number };
  backend: { home: number; draw: number; away: number };
  detail: string;
}

export const computeConsensus1x2 = (
  match: any,
  backendProbs?: { home: number; draw: number; away: number },
): Consensus1x2 => {
  const standings: any[] = match?.standings || [];
  const homeRecent: any[] = match?.home_recent || match?.home_matches || [];
  const awayRecent: any[] = match?.away_recent || match?.away_matches || [];

  // Poisson model
  const homeEG = deriveExpectedGoals(homeRecent, match?.home_team || '', standings, true);
  const awayEG = deriveExpectedGoals(awayRecent, match?.away_team || '', standings, false);
  const poisson = poisson1x2(homeEG.lambda, awayEG.lambda);

  // Elo model (use default ratings if no historical data)
  const homeElo = match?.home_elo || DEFAULT_ELO;
  const awayElo = match?.away_elo || DEFAULT_ELO;
  const elo = elo1x2(homeElo, awayElo);

  // Backend probabilities (fallback to Poisson if not available)
  const backend = backendProbs || { home: poisson.home, draw: poisson.draw, away: poisson.away };

  // Weighted consensus: 40% Poisson, 30% Elo, 30% Backend
  const consensusHome = poisson.home * 0.4 + elo.home * 0.3 + backend.home * 0.3;
  const consensusDraw = poisson.draw * 0.4 + elo.draw * 0.3 + backend.draw * 0.3;
  const consensusAway = poisson.away * 0.4 + elo.away * 0.3 + backend.away * 0.3;

  // Normalize to ensure sum = 1
  const normalized = normalize1x2(consensusHome, consensusDraw, consensusAway);

  return {
    home: normalized.home,
    draw: normalized.draw,
    away: normalized.away,
    poisson,
    elo,
    backend,
    detail: `Poisson: ${(poisson.home * 100).toFixed(1)}/${(poisson.draw * 100).toFixed(1)}/${(poisson.away * 100).toFixed(1)} | Elo: ${(elo.home * 100).toFixed(1)}/${(elo.draw * 100).toFixed(1)}/${(elo.away * 100).toFixed(1)} | Consensus: ${(normalized.home * 100).toFixed(1)}/${(normalized.draw * 100).toFixed(1)}/${(normalized.away * 100).toFixed(1)}`,
  };
};

// ─── Prediction Accuracy Tracker ────────────────────────────────────────
//
//  Simple feedback mechanism that tracks prediction accuracy over time.
//  This can be used to adjust model weights and improve future predictions.

export interface PredictionAccuracy {
  totalPredictions: number;
  correctPredictions: number;
  accuracy: number;
  bySide: { home: { total: number; correct: number }; draw: { total: number; correct: number }; away: { total: number; correct: number } };
}

const accuracyStore: Map<string, PredictionAccuracy> = new Map();

export const recordPredictionResult = (
  matchId: string,
  predictedSide: '1' | 'X' | '2',
  actualResult: '1' | 'X' | '2',
): void => {
  const key = matchId;
  let acc = accuracyStore.get(key);
  if (!acc) {
    acc = {
      totalPredictions: 0,
      correctPredictions: 0,
      accuracy: 0,
      bySide: {
        home: { total: 0, correct: 0 },
        draw: { total: 0, correct: 0 },
        away: { total: 0, correct: 0 },
      },
    };
    accuracyStore.set(key, acc);
  }

  acc.totalPredictions++;
  const sideKey = predictedSide === '1' ? 'home' : predictedSide === 'X' ? 'draw' : 'away';
  acc.bySide[sideKey].total++;
  if (predictedSide === actualResult) {
    acc.correctPredictions++;
    acc.bySide[sideKey].correct++;
  }
  acc.accuracy = acc.totalPredictions > 0 ? acc.correctPredictions / acc.totalPredictions : 0;
};

export const getPredictionAccuracy = (matchId?: string): PredictionAccuracy | Map<string, PredictionAccuracy> => {
  if (matchId) {
    return accuracyStore.get(matchId) || { totalPredictions: 0, correctPredictions: 0, accuracy: 0, bySide: { home: { total: 0, correct: 0 }, draw: { total: 0, correct: 0 }, away: { total: 0, correct: 0 } } };
  }
  return accuracyStore;
};

export const getOverallAccuracy = (): number => {
  let total = 0;
  let correct = 0;
  accuracyStore.forEach((acc) => {
    total += acc.totalPredictions;
    correct += acc.correctPredictions;
  });
  return total > 0 ? correct / total : 0;
};

// ─── Learned Home Advantage ─────────────────────────────────────
//
//  Computes a home advantage multiplier from historical match results.
//  Instead of using a hardcoded value, this learns the home advantage
//  from actual match data, making it specific to the league/competition.
//
//  The home advantage factor is computed as:
//    homeWinRate / (1 - homeWinRate - drawRate)
//  which represents how much more likely the home team is to win
//  compared to the away team, based on historical data.
//
//  Falls back to 1.0 (no advantage) if insufficient data is available.

interface HomeAdvantageStats {
  homeWins: number;
  draws: number;
  awayWins: number;
  totalMatches: number;
}

const homeAdvantageStore: Map<string, HomeAdvantageStats> = new Map();

export const recordMatchResult = (
  homeTeam: string,
  awayTeam: string,
  result: '1' | 'X' | '2',
  league?: string,
): void => {
  const key = league || 'global';
  let stats = homeAdvantageStore.get(key);
  if (!stats) {
    stats = { homeWins: 0, draws: 0, awayWins: 0, totalMatches: 0 };
    homeAdvantageStore.set(key, stats);
  }
  stats.totalMatches++;
  if (result === '1') stats.homeWins++;
  else if (result === 'X') stats.draws++;
  else stats.awayWins++;
};

export const learnedHomeAdvantage = (match: any): number => {
  const league = match?.tournament || match?.league || '';
  const stats = homeAdvantageStore.get(league) || homeAdvantageStore.get('global');

  if (!stats || stats.totalMatches < 10) {
    // Insufficient data — return neutral
    return 1.0;
  }

  const homeWinRate = stats.homeWins / stats.totalMatches;
  const awayWinRate = stats.awayWins / stats.totalMatches;
  const drawRate = stats.draws / stats.totalMatches;

  // Home advantage factor: ratio of home win rate to away win rate
  // A value of 1.0 means no advantage, >1.0 means home advantage
  if (awayWinRate <= 0) return 1.0; // Avoid division by zero
  const factor = homeWinRate / awayWinRate;

  // Clamp to reasonable range [0.8, 1.3]
  return Math.max(0.8, Math.min(1.3, factor));
};

// ─── Batch Learn from Historical Results ────────────────────────
//
//  Pre-computes home advantage factors from a batch of historical results.
//  Call this periodically (e.g., after each match day) to update the model.

export const batchLearnHomeAdvantage = (results: Array<{ homeTeam: string; awayTeam: string; result: '1' | 'X' | '2'; league?: string }>): void => {
  for (const r of results) {
    recordMatchResult(r.homeTeam, r.awayTeam, r.result, r.league);
  }
};
