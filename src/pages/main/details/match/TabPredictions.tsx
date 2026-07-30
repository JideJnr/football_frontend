import { useState, useEffect } from 'react';
import { Target, Brain, CheckCircle, AlertCircle, Clock, X } from 'lucide-react';
import { Sec, Empty } from './shared';
import { trackUserBehavior, getUserPickForMatch } from '../../../../services/apis/footballApi';
import { getValueHunterContext } from '../../../../prediction/engineLearning';

const num = (v: any, fb = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
};

const pct = (v: any) => `${Math.round(num(v))}%`;

const confidenceTone = (c: number) =>
  c >= 75 ? 'text-emerald-300'
  : c >= 65 ? 'text-yellow-300'
  : c >= 55 ? 'text-gray-200'
  : 'text-red-300';

const confidenceBg = (c: number) =>
  c >= 75 ? 'bg-emerald-500'
  : c >= 65 ? 'bg-yellow-500'
  : c >= 55 ? 'bg-gray-400'
  : 'bg-red-500';

const confidenceLabel = (c: number) =>
  c >= 75 ? 'Strong'
  : c >= 65 ? 'Playable'
  : c >= 55 ? 'Lean'
  : 'Avoid';

const pickTypeLabel: Record<string, string> = {
  match_result: 'Result',
  double_chance: 'Protection',
  ensemble_1x2: 'Model Result',
  market_value: 'Market',
  value_bet: 'Value',
  goals: 'Goals',
  live_goals: 'Live Goals',
  live_next_goal: 'Next Goal',
  live_team_to_score: 'Team To Score',
  live_total_goals: 'Live Total',
  live_match_winner: 'Live Winner',
};

const contextualFrom = (prediction: any, m: any) =>
  prediction?.contextual_intelligence
  || m?.intelligence?.prediction?.contextual
  || prediction?.audit?.contextual_intelligence
  || {};

const cleanPick = (pick: any) => ({
  ...pick,
  selection: pick?.selection || pick?.pick || 'No clear pick',
  confidence: num(pick?.confidence),
  type: pick?.type || 'pick',
});

const pickTarget = (pick: any) => {
  const text = String(pick?.selection || pick?.pick || '').toLowerCase();
  if (text.includes('both teams to score - no') || text.includes('btts no')) return 'btts_no';
  if (text.includes('both teams to score') || text.includes('btts')) return 'btts_yes';
  if (text.includes('under')) return 'under';
  if (text.includes('over')) return 'over';
  if (text.includes('home or draw') || text.includes('draw or home') || text.includes('1x')) return 'home_or_draw';
  if (text.includes('away or draw') || text.includes('draw or away')) return 'away_or_draw';
  if (text.includes('x2')) return 'away_or_draw';
  if (text.includes('home or away') || text.includes('away or home') || text.includes('12')) return 'home_or_away';
  if (text.includes('home')) return 'home';
  if (text.includes('away')) return 'away';
  if (text.includes('draw')) return 'draw';
  return 'general';
};

const sideFromModel = (signal: any) => {
  const value = signal?.value || {};
  const probs = value?.probabilities || value;
  const home = num(probs.home_win);
  const draw = num(probs.draw);
  const away = num(probs.away_win);
  if (!home && !draw && !away) return null;
  if (home >= draw && home >= away) return 'home';
  if (away >= home && away >= draw) return 'away';
  return 'draw';
};

const supportsTarget = (target: string, side: string | null) => {
  if (!side) return false;
  if (target === side) return true;
  if (target === 'home_or_draw') return side === 'home' || side === 'draw';
  if (target === 'away_or_draw') return side === 'away' || side === 'draw';
  if (target === 'home_or_away') return side === 'home' || side === 'away';
  return false;
};

const sideFromSelection = (selection: any) => {
  const text = String(selection || '').toLowerCase();
  if (['1', 'home'].includes(text) || text.includes('home')) return 'home';
  if (['2', 'away'].includes(text) || text.includes('away')) return 'away';
  if (['x', 'draw'].includes(text) || text.includes('draw')) return 'draw';
  return null;
};

const goalTargetFromSelection = (selection: any) => {
  const text = String(selection || '').toLowerCase();
  if (text.includes('under')) return 'under';
  if (text.includes('over')) return 'over';
  if (text.includes('both teams to score - no') || text.includes('btts no')) return 'btts_no';
  if (text.includes('both teams to score') || text.includes('btts')) return 'btts_yes';
  return null;
};

const alignsWithTarget = (target: string, selectionTarget: string | null) => {
  if (!selectionTarget) return false;
  if (['home', 'away', 'draw'].includes(selectionTarget)) {
    return supportsTarget(target, selectionTarget);
  }
  return target === selectionTarget;
};

const conflictsWithTarget = (target: string, selectionTarget: string | null) => {
  if (!selectionTarget) return false;
  if (['home', 'away', 'draw'].includes(selectionTarget)) {
    return opposesTarget(target, selectionTarget);
  }
  if (target === 'over') return selectionTarget === 'under';
  if (target === 'under') return selectionTarget === 'over';
  if (target === 'btts_yes') return selectionTarget === 'btts_no';
  if (target === 'btts_no') return selectionTarget === 'btts_yes';
  return false;
};

const classifyMarketPull = (pull: any, target: string) => {
  if (!pull || pull.direction === 'stable') return 'context';
  const selectionTarget = sideFromSelection(pull.selection) || goalTargetFromSelection(pull.selection);
  const aligns = alignsWithTarget(target, selectionTarget);
  const conflicts = conflictsWithTarget(target, selectionTarget);

  if (pull.direction === 'backed') {
    if (aligns) return 'support';
    if (conflicts) return 'risk';
  }
  if (pull.direction === 'faded') {
    if (aligns) return 'risk';
    if (conflicts) return 'support';
  }
  return 'context';
};

const finishedMemoryRows = [
  { key: 'tournament_odds', label: 'Tournament + odds', evidence: true },
  { key: 'country_odds', label: 'Country + odds', evidence: true },
  { key: 'global_odds', label: 'Whole DB + odds', evidence: true },
  { key: 'tournament', label: 'Tournament fallback', evidence: true },
  { key: 'country', label: 'Country fallback', evidence: true },
  { key: 'global', label: 'Whole DB fallback', evidence: false },
];

const finishedMemoryEvidenceScope = (memory: any) => {
  const scopes = memory?.scopes || {};
  for (const row of finishedMemoryRows.filter(item => item.evidence)) {
    const scope = scopes[row.key] || {};
    if (num(scope.samples) > 0) return { ...row, scope };
  }
  const global = scopes.global || {};
  if (num(global.samples) > 0) return { key: 'global', label: 'Whole DB fallback', evidence: false, scope: global };
  return null;
};

const opposesTarget = (target: string, side: string | null) => {
  if (!side) return false;
  if (target === 'home') return side === 'away' || side === 'draw';
  if (target === 'away') return side === 'home' || side === 'draw';
  if (target === 'draw') return side === 'home' || side === 'away';
  if (target === 'home_or_draw') return side === 'away';
  if (target === 'away_or_draw') return side === 'home';
  if (target === 'home_or_away') return side === 'draw';
  return false;
};

const signalText = (signal: any, m: any) => {
  const home = m?.home_team || 'Home';
  const away = m?.away_team || 'Away';
  const value = signal?.value || {};
  const impact = num(signal?.impact);
  const stronger = impact >= 0 ? home : away;

  switch (signal?.name) {
    case 'goal_pressure':
      return `Recent scoring profile is ${num(value || signal.value).toFixed(1)} on the goal-pressure scale.`;
    case 'odds_edge':
      return `Market pricing leans toward ${stronger}.`;
    case 'league_position_edge':
      return `${stronger} has the better table-position signal.`;
    case 'common_opponent_edge':
      return `${stronger} has the better common-opponent record: ${value.shared_opponents || 0} shared opponents, points ${value.home_points ?? 0}-${value.away_points ?? 0}, goal diff ${value.home_goal_diff ?? 0}-${value.away_goal_diff ?? 0}.`;
    case 'h2h_edge':
      return `Head-to-head: ${home} ${value.home_wins ?? 0} wins, draw ${value.draws ?? 0}, ${away} ${value.away_wins ?? 0}.`;
    case 'league_strength_edge':
      return `${stronger} has faced stronger recent competition.`;
    case 'poisson_model':
      return `Poisson: ${home} ${pct(value.home_win)}, draw ${pct(value.draw)}, ${away} ${pct(value.away_win)}, over 2.5 ${pct(value.over_2_5)}.`;
    case 'dixon_coles_model':
      return `Dixon-Coles: ${home} ${pct(value.home_win)}, draw ${pct(value.draw)}, ${away} ${pct(value.away_win)}, over 2.5 ${pct(value.over_2_5)}.`;
    case 'ensemble_model': {
      const probs = value.probabilities || {};
      return `Ensemble: ${home} ${pct(probs.home_win)}, draw ${pct(probs.draw)}, ${away} ${pct(probs.away_win)}.`;
    }
    case 'elo_model':
      return `ELO: ${home} ${pct(value.home_win_probability)}, ${away} ${pct(value.away_win_probability)}.`;
    case 'finished_database_memory': {
      const evidence = finishedMemoryEvidenceScope(value);
      const b = evidence?.scope || value.blended || {};
      const label = evidence?.label || 'No scoped memory';
      const contextNote = evidence?.evidence === false ? ' Context only until tournament, country, or odds-similar memory exists.' : '';
      return `Finished-match memory (${label}): over 1.5 ${pct((b.over_1_5_rate || 0) * 100)}, over 2.5 ${pct((b.over_2_5_rate || 0) * 100)}, BTTS ${pct((b.btts_rate || 0) * 100)} from ${b.samples || value.samples || 0} games.${contextNote}`;
    }
    case 'prediction_memory':
      return `Graded-pick memory: tournament ${value?.scopes?.tournament?.samples ?? 0}, country ${value?.scopes?.country?.samples ?? 0}, whole DB ${value?.scopes?.global?.samples ?? 0} samples.`;
    case 'odds_progression': {
      const pull = value.strongest_pull;
      if (!pull) return 'No meaningful market movement yet.';
      const move = num(pull.odds_change_percent);
      const implied = num(pull.implied_change_percent);
      return `Market movement: ${pull.selection} ${pull.direction}; odds ${move > 0 ? 'drifted' : move < 0 ? 'shortened' : 'stable'} ${Math.abs(move).toFixed(1)}%, implied probability ${implied > 0 ? 'up' : implied < 0 ? 'down' : 'flat'} ${Math.abs(implied).toFixed(1)}%.`;
    }
    case 'web_context':
      return value.error
        ? 'DuckDuckGo/web context unavailable; statistical data only.'
        : `DuckDuckGo context: ${value.snippets || 0} snippets, ${value.scraped || 0} pages scraped${value.source_titles?.length ? `; ${value.source_titles.slice(0, 2).join(', ')}` : ''}.`;
    default:
      return String(signal?.name || '').replace(/_/g, ' ');
  }
};

const classifySignal = (signal: any, target: string) => {
  const name = signal?.name;
  const impact = num(signal?.impact);

  if (name === 'odds_progression') {
    return classifyMarketPull(signal?.value?.strongest_pull, target);
  }

  if (name === 'market_steam') {
    const side = sideFromSelection(signal?.value?.side);
    if (impact > 0) {
      if (alignsWithTarget(target, side)) return 'support';
      if (conflictsWithTarget(target, side)) return 'risk';
    }
    if (impact < 0) {
      if (alignsWithTarget(target, side)) return 'risk';
      if (conflictsWithTarget(target, side)) return 'support';
    }
    return 'context';
  }

  if (['poisson_model', 'dixon_coles_model', 'ensemble_model'].includes(name)) {
    const side = sideFromModel(signal);
    if (supportsTarget(target, side)) return 'support';
    if (opposesTarget(target, side)) return 'risk';
    const probs = signal?.value?.probabilities || signal?.value || {};
    if (target === 'over' && num(probs.over_2_5) >= 58) return 'support';
    if (target === 'over' && num(probs.over_2_5) <= 42) return 'risk';
    if (target === 'under' && num(probs.over_2_5) <= 42) return 'support';
    if (target === 'under' && num(probs.over_2_5) >= 58) return 'risk';
    if (target === 'btts_yes' && num(probs.btts) >= 58) return 'support';
    if (target === 'btts_yes' && num(probs.btts) <= 42) return 'risk';
    if (target === 'btts_no' && num(probs.btts) <= 42) return 'support';
    if (target === 'btts_no' && num(probs.btts) >= 58) return 'risk';
    return 'context';
  }

  if (name === 'goal_pressure') {
    const pressure = num(signal.value);
    if (target === 'over') return pressure >= 28 ? 'support' : 'risk';
    if (target === 'under') return pressure <= 22 ? 'support' : 'risk';
    return 'context';
  }

  if (name === 'finished_database_memory') {
    const evidence = finishedMemoryEvidenceScope(signal?.value);
    if (!evidence?.evidence) return 'context';
    const b = evidence.scope || {};
    if (target === 'over') return num(b.over_2_5_rate) >= 0.5 || num(b.over_1_5_rate) >= 0.7 ? 'support' : 'risk';
    if (target === 'under') return num(b.over_2_5_rate) <= 0.45 ? 'support' : 'risk';
    if (target === 'home' || target === 'home_or_draw') return num(b.away_win_rate) <= 0.38 ? 'support' : 'risk';
    if (target === 'away' || target === 'away_or_draw') return num(b.home_win_rate) <= 0.38 ? 'support' : 'risk';
    return 'context';
  }

  if (['odds_edge', 'league_position_edge', 'common_opponent_edge', 'h2h_edge', 'league_strength_edge', 'recent_history_edge', 'elo_model'].includes(name)) {
    if (target === 'home' || target === 'home_or_draw') return impact > 0 ? 'support' : impact < 0 ? 'risk' : 'context';
    if (target === 'away' || target === 'away_or_draw') return impact < 0 ? 'support' : impact > 0 ? 'risk' : 'context';
    return 'context';
  }

  return 'context';
};

const EvidenceBoard = ({ signals, pick, m }: { signals: any[]; pick: any; m: any }) => {
  const target = pickTarget(pick);
  const buckets = signals.reduce((acc: any, signal: any) => {
    if (signal?.name === 'web_context' && !signal?.value?.error && !signal?.value?.snippets) return acc;
    const key = classifySignal(signal, target);
    acc[key].push(signal);
    return acc;
  }, { support: [], risk: [], context: [] });

  const block = (title: string, list: any[], tone: string) => (
    <div className="rounded-lg border border-white/[0.07] bg-white/[0.025] p-3">
      <div className={`mb-2 text-[10px] font-bold uppercase tracking-widest ${tone}`}>{title}</div>
      {list.length ? (
        <div className="space-y-2">
          {list.slice(0, 4).map((s: any, i: number) => (
            <div key={`${s.name}-${i}`} className="text-xs leading-relaxed text-gray-300">
              {signalText(s, m)}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-gray-600">No strong signal in this bucket.</div>
      )}
    </div>
  );

  return (
    <Sec title="Evidence">
      <div className="grid gap-2">
        {block('Supports this pick', buckets.support, 'text-emerald-400')}
        {block('Risks against it', buckets.risk, 'text-red-400')}
        {block('Context only', buckets.context, 'text-gray-500')}
      </div>
    </Sec>
  );
};

const ConfidenceBar = ({ value }: { value: number }) => (
  <div className="mt-2 flex items-center gap-2">
    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
      <div className={`h-full rounded-full ${confidenceBg(value)}`} style={{ width: `${Math.max(3, Math.min(100, value))}%` }} />
    </div>
    <span className={`w-10 text-right text-xs font-bold tabular-nums ${confidenceTone(value)}`}>{value}%</span>
  </div>
);

const StakeCard = ({ pick }: { pick: any }) => {
  const stake = pick?.stake;
  const cal = pick?.calibration;
  if (!stake && !cal) return null;
  const per100 = stake?.stake_per_100 ?? 0;
  const edge = stake?.edge_percent;
  return (
    <Sec title="Stake sizing">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-white/[0.03] px-2 py-2 text-center">
          <div className="text-[9px] text-gray-500">Odds</div>
          <div className="text-base font-bold text-white">{stake?.decimal_odds ? Number(stake.decimal_odds).toFixed(2) : 'N/A'}</div>
        </div>
        <div className="rounded-lg bg-white/[0.03] px-2 py-2 text-center">
          <div className="text-[9px] text-gray-500">Edge</div>
          <div className={`text-base font-bold ${Number(edge || 0) > 0 ? 'text-emerald-400' : 'text-gray-400'}`}>
            {edge == null ? 'N/A' : `${edge}%`}
          </div>
        </div>
        <div className="rounded-lg bg-white/[0.03] px-2 py-2 text-center">
          <div className="text-[9px] text-gray-500">Stake / 100</div>
          <div className={`text-base font-bold ${per100 > 0 ? 'text-emerald-400' : 'text-gray-400'}`}>{per100}</div>
        </div>
      </div>
      <div className="mt-2 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2 text-xs text-gray-500">
        {stake?.recommended
          ? 'Quarter-Kelly says this is playable, capped by league/regime risk.'
          : stake?.decimal_odds
            ? 'Kelly does not show enough edge for an aggressive stake.'
            : 'No matching market price found, so stake is confidence-only.'}
        {cal?.stake_source && <span> Source: {cal.stake_source}.</span>}
      </div>
    </Sec>
  );
};

const PortfolioBadge = ({ prediction }: { prediction: any }) => {
  if (!prediction?.portfolio_rank && !prediction?.correlated) return null;
  return (
    <div className={`rounded-lg border px-3 py-2 text-xs ${
      prediction.correlated ? 'border-orange-500/25 bg-orange-500/10 text-orange-300' : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
    }`}>
      {prediction.correlated
        ? `Portfolio risk: ${prediction.correlation_reason || 'correlated with other active picks'}`
        : `Portfolio rank ${prediction.portfolio_rank}: acceptable exposure.`}
    </div>
  );
};

const LiveGoalPanel = ({ picks, m, prediction }: { picks: any[]; m: any; prediction: any }) => {
  if (!m?.is_live) return null;
  const livePicks = [...(prediction?.live_inplay || []), ...picks.filter((p: any) => String(p.type || '').startsWith('live_'))]
    .filter((pick: any, index: number, all: any[]) => (
      all.findIndex((item: any) => `${item.type || ''}:${item.selection || item.pick || ''}` === `${pick.type || ''}:${pick.selection || pick.pick || ''}`) === index
    ));
  return (
    <Sec title="In-play read">
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/[0.06] p-3">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-blue-300">Live markets</div>
            <div className="text-xs text-gray-500">{m?.period || `${Math.floor(num(m?.played_seconds) / 60)}'`} - score {m?.score?.home ?? '-'}-{m?.score?.away ?? '-'}</div>
          </div>
          {prediction?.time_decay_applied && (
            <div className="rounded bg-white/[0.06] px-2 py-1 text-[10px] text-gray-400">
              decay x{Number(prediction.time_decay_multiplier || 1).toFixed(2)}
            </div>
          )}
        </div>
        {livePicks.length ? (
          <div className="space-y-2">
            {livePicks.map((pick: any, i: number) => (
              <div key={`${pick.selection}-${i}`} className="flex items-start justify-between gap-3 rounded-lg bg-black/20 px-3 py-2">
                <div>
                  <div className="mb-1 text-[9px] font-bold uppercase tracking-widest text-blue-300">{pickTypeLabel[pick.type] || pick.type}</div>
                  <div className="text-sm font-semibold text-white">{pick.selection}</div>
                  <div className="mt-0.5 text-xs text-gray-500">{pick.reason || pick.reasoning}</div>
                </div>
                <div className={`text-sm font-bold ${confidenceTone(pick.confidence)}`}>{pick.confidence}%</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-gray-500">Live state is tracked, but no goal entry is strong enough right now.</div>
        )}
      </div>
    </Sec>
  );
};

const DecisionCard = ({ pick }: { pick: any }) => {
  const p = cleanPick(pick);
  return (
    <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Primary decision</div>
          <div className="mt-1 text-xl font-bold leading-tight text-white">{p.selection}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className={`text-3xl font-black ${confidenceTone(p.confidence)}`}>{p.confidence}%</div>
          <div className="text-[10px] text-gray-500">{confidenceLabel(p.confidence)}</div>
        </div>
      </div>
      <ConfidenceBar value={p.confidence} />
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] font-semibold text-gray-300">
          {pickTypeLabel[p.type] || p.type}
        </span>
        {p.family && (
          <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] font-semibold text-gray-500">
            {p.family}
          </span>
        )}
      </div>
      {p.reason || p.reasoning ? (
        <p className="mt-3 text-xs leading-relaxed text-gray-300">{p.reason || p.reasoning}</p>
      ) : null}
    </div>
  );
};

const NoPickDecisionCard = ({ reason }: { reason?: string | null }) => (
  <div className="rounded-xl border border-yellow-500/25 bg-yellow-500/[0.05] p-4">
    <div className="mb-3 flex items-center justify-between gap-3">
      <div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-yellow-400">Primary decision</div>
        <div className="mt-1 text-xl font-bold leading-tight text-white">No pick</div>
      </div>
      <div className="shrink-0 rounded-lg bg-black/20 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-yellow-300">
        Hold
      </div>
    </div>
    <div className="text-xs leading-relaxed text-gray-400">
      {reason ? String(reason).replace(/_/g, ' ') : 'No market reached the threshold for a confident selection.'}
    </div>
  </div>
);

const GradedResultCard = ({ prediction, pick }: { prediction: any; pick: any }) => {
  const result = prediction?.result || pick?.result;
  const gradedAt = prediction?.graded_at || pick?.gradedAt || pick?.graded_at;
  if (!result && !gradedAt) return null;
  const normalized = String(result || 'graded').toLowerCase();
  const tone = normalized === 'win' || normalized === 'won'
    ? 'border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-300'
    : normalized === 'loss' || normalized === 'lost'
      ? 'border-red-500/25 bg-red-500/[0.06] text-red-300'
      : 'border-yellow-500/25 bg-yellow-500/[0.06] text-yellow-300';
  const finalHome = prediction?.final_home ?? prediction?.finalHome;
  const finalAway = prediction?.final_away ?? prediction?.finalAway;
  const finalScore = finalHome != null && finalAway != null ? `${finalHome}-${finalAway}` : null;

  return (
    <div className={`rounded-xl border px-4 py-3 ${tone}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest opacity-80">Graded result</div>
          <div className="mt-1 text-sm font-bold text-white">{normalized.toUpperCase()}</div>
        </div>
        {finalScore && (
          <div className="rounded-lg bg-black/20 px-3 py-1 text-sm font-bold text-white">{finalScore}</div>
        )}
      </div>
    </div>
  );
};

const IntelligencePanel = ({ intelligence, riskManagement }: { intelligence: any; riskManagement?: any }) => {
  if ((!intelligence || !Object.keys(intelligence).length) && (!riskManagement || !Object.keys(riskManagement).length)) return null;
  const contextTags = intelligence?.match_context?.tags || [];
  const marketFlags = intelligence?.market_behavior?.flags || [];
  const relationships = intelligence?.signal_relationships || {};
  const risk = intelligence?.risk || {};
  const deskRisk = riskManagement || {};
  const deskLevel = deskRisk.risk_level || risk.level;
  const aging = intelligence?.prediction_aging || {};
  const adjustment = num(intelligence?.confidence_adjustment);
  const explain = intelligence?.explain || {};
  const explainLines = Array.isArray(explain) ? explain : explain.lines || [];
  const reasons = [
    ...(relationships.synergies || []).map((value: string) => ({ tone: 'text-emerald-300', value })),
    ...(relationships.conflicts || []).map((value: string) => ({ tone: 'text-red-300', value })),
    ...(risk.reasons || []).map((value: string) => ({ tone: 'text-yellow-300', value })),
  ].slice(0, 5);

  return (
    <Sec title="Intelligence">
      <div className={`rounded-xl border p-3 ${
        deskLevel === 'high'
          ? 'border-red-500/25 bg-red-500/[0.06]'
          : deskLevel === 'medium'
            ? 'border-yellow-500/25 bg-yellow-500/[0.06]'
            : 'border-emerald-500/20 bg-emerald-500/[0.05]'
      }`}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Risk intelligence</div>
            <div className="mt-1 text-sm font-semibold text-white">
              {deskLevel || 'low'} risk{deskRisk.hard_block || intelligence.no_prediction_recommended ? ' - avoid recommended' : ''}
            </div>
          </div>
          <div className={`rounded-lg px-2 py-1 text-xs font-bold ${
            adjustment > 0 ? 'bg-emerald-500/15 text-emerald-300' : adjustment < 0 ? 'bg-red-500/15 text-red-300' : 'bg-white/[0.06] text-gray-400'
          }`}>
            {adjustment > 0 ? '+' : ''}{adjustment}% confidence
          </div>
        </div>
        {deskRisk.violations?.length > 0 && (
          <div className="mb-3 rounded-lg border border-red-500/15 bg-red-500/[0.06] px-3 py-2">
            <div className="mb-1 text-[9px] uppercase tracking-widest text-red-300">Desk controls</div>
            <div className="text-xs leading-relaxed text-red-200">{deskRisk.violations.slice(0, 4).join(', ').replace(/_/g, ' ')}</div>
          </div>
        )}
        {deskRisk.actions?.length > 0 && (
          <div className="mb-3 rounded-lg bg-black/20 px-3 py-2 text-xs text-gray-400">
            {deskRisk.actions.slice(0, 2).map((action: any) => (
              <div key={`${action.type}-${action.selection || action.reason}`}>{String(action.type || '').replace(/_/g, ' ')}{action.from != null ? `: ${action.from} -> ${action.to}` : ''}</div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-black/20 px-3 py-2">
            <div className="text-[9px] uppercase tracking-widest text-gray-600">Market</div>
            <div className="mt-1 text-xs text-gray-300">{marketFlags.length ? marketFlags.slice(0, 3).join(', ') : 'stable / limited movement'}</div>
          </div>
          <div className="rounded-lg bg-black/20 px-3 py-2">
            <div className="text-[9px] uppercase tracking-widest text-gray-600">Prediction age</div>
            <div className="mt-1 text-xs text-gray-300">{aging.phase || 'fresh'}{aging.age_minutes != null ? `, ${aging.age_minutes} min` : ''}</div>
          </div>
        </div>
        {(contextTags.length > 0 || reasons.length > 0) && (
          <div className="mt-3 space-y-2">
            {contextTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {contextTags.slice(0, 7).map((tag: string) => (
                  <span key={tag} className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-gray-400">{tag.replace(/_/g, ' ')}</span>
                ))}
              </div>
            )}
            {reasons.map((item: any, index: number) => (
              <div key={`${item.value}-${index}`} className={`text-xs leading-relaxed ${item.tone}`}>{item.value}</div>
            ))}
          </div>
        )}
        {(explain.why_confidence || explain.why_market_moved || explainLines.length > 0) && (
          <div className="mt-3 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2 text-xs leading-relaxed text-gray-500">
            {explain.why_confidence || explain.why_market_moved || explainLines[0]}
          </div>
        )}
      </div>
    </Sec>
  );
};

const AiReasoningBlock = ({ reasoning }: { reasoning: any }) => {
  if (!reasoning || typeof reasoning !== 'object') return null;
  const entries = Object.entries(reasoning).filter(([, v]) => typeof v === 'string' && (v as string).trim());
  if (!entries.length) return null;
  return (
    <div className="space-y-2 border-t border-white/[0.06] pt-3">
      {entries.slice(0, 5).map(([label, reason]) => (
        <div key={String(label)}>
          <div className="text-[9px] uppercase tracking-widest text-gray-600">{String(label).replace(/_/g, ' ')}</div>
          <div className="mt-0.5 text-xs leading-relaxed text-gray-300">{String(reason)}</div>
        </div>
      ))}
    </div>
  );
};

const analystHasNoEvidence = (analyst: any) => {
  if (analyst?.evidence_status === 'unavailable') return true;
  const finding = String(analyst?.finding || '').toLowerCase();
  return ['no h2h history', 'no common opponents', 'unavailable', 'not present', '0 previous finished matches'].some(marker => finding.includes(marker));
};

const AiAnalystBlock = ({ analysts }: { analysts: any[] }) => {
  if (!Array.isArray(analysts) || analysts.length === 0) return null;
  return (
    <div className="space-y-2 border-t border-white/[0.06] pt-3">
      <div className="text-[9px] font-bold uppercase tracking-widest text-gray-500">Analyst calls</div>
      {analysts.slice(0, 6).map((analyst: any, index: number) => (
        <div key={`${analyst?.name || 'analyst'}-${index}`} className="rounded-lg bg-black/20 px-3 py-2">
          <div className="text-[10px] font-semibold text-violet-200">{analyst?.name || `Analyst ${index + 1}`}</div>
          {analystHasNoEvidence(analyst) && (
            <div className="mt-1 inline-flex rounded border border-amber-300/20 bg-amber-300/[0.08] px-1.5 py-0.5 text-[8px] font-bold uppercase text-amber-200">No source evidence</div>
          )}
          {analyst?.trained_knowledge && (
            <div className="mt-0.5 text-[9px] text-gray-600">{analyst.trained_knowledge}</div>
          )}
          <div className="mt-1 text-xs leading-relaxed text-gray-300">{analyst?.finding || 'No finding returned.'}</div>
        </div>
      ))}
    </div>
  );
};

const AiAnalysisCard = ({
  analysis,
}: {
  analysis: any;
}) => {
  if (!analysis) return null;
  const providerLabel = analysis?.provider || analysis?.source || 'AI Pipeline';
  const providerRole = 'One call per specialist analyst with final model synthesis';

  const rec = analysis?.recommendation || analysis?.consensus || 'No analysis yet';
  const confidence = analysis?.confidence;

  return (
    <Sec title="AI analysis">
      <div className="space-y-3">
        <div className="rounded-xl border border-violet-500/25 bg-violet-500/[0.06] p-3">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-violet-300">{providerLabel}</div>
              <div className="text-[9px] text-gray-600">{providerRole}</div>
              <div className="mt-1 text-sm font-semibold text-white">{rec}</div>
            </div>
            {confidence != null && (
              <div className={'rounded-lg bg-black/20 px-2 py-1 text-sm font-bold ' + confidenceTone(num(confidence))}>
                {pct(confidence)}
              </div>
            )}
          </div>
          {analysis?.key_factors?.length > 0 && (
            <div className="mb-3 space-y-1.5">
              <div className="text-[9px] font-bold uppercase tracking-widest text-gray-500">Key factors</div>
              {analysis.key_factors.slice(0, 4).map((f: string, i: number) => (
                <div key={String(f) + i} className="text-xs leading-relaxed text-emerald-200">â€¢ {f}</div>
              ))}
            </div>
          )}
          <AiReasoningBlock reasoning={analysis?.reasoning} />
          <AiAnalystBlock analysts={analysis?.analysts || analysis?.reasoning_context?.analysts || []} />
        </div>

        <div className="text-[10px] leading-relaxed text-gray-600">AI analysis explains available evidence; it does not guarantee an outcome.</div>
      </div>
    </Sec>
  );
};

const CompactAiAnalysisCard = ({ analysis }: { analysis: any }) => {
  const [open, setOpen] = useState(false);
  if (!analysis) {
    return (
      <Sec title="AI analysis">
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-violet-300">AI Pipeline</div>
          <div className="mt-1 text-sm font-semibold text-white">No AI analysis yet</div>
          <div className="mt-1 text-xs leading-relaxed text-gray-500">Run AI Prediction to generate specialist analysis for this match.</div>
        </div>
      </Sec>
    );
  }
  const providerLabel = analysis?.provider || analysis?.source || 'AI Pipeline';
  const rec = analysis?.recommendation || analysis?.consensus || 'No analysis yet';
  const confidence = analysis?.confidence;
  const analysts = analysis?.analysts || analysis?.reasoning_context?.analysts || [];
  const unavailableAnalysts = analysts.filter(analystHasNoEvidence).length;

  return (
    <>
      <Sec title="AI analysis">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full rounded-xl border border-violet-500/25 bg-violet-500/[0.06] p-3 text-left transition hover:bg-violet-500/[0.1] active:scale-[0.99]"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-violet-300">{providerLabel}</div>
              <div className="text-[9px] text-gray-600">Specialist analysis room</div>
              <div className="mt-1 text-sm font-semibold text-white">{rec}</div>
              {analysts.length > 0 && <div className="mt-2 text-[10px] text-violet-200">{analysts.length} specialist views ready{unavailableAnalysts ? ` · ${unavailableAnalysts} with no source evidence` : ''}</div>}
            </div>
            {confidence != null && (
              <div className={'rounded-lg bg-black/20 px-2 py-1 text-sm font-bold ' + confidenceTone(num(confidence))}>
                {pct(confidence)}
              </div>
            )}
          </div>
        </button>
        <div className="text-[10px] leading-relaxed text-gray-600">Tap to open the specialist chat view.</div>
      </Sec>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70 backdrop-blur-sm sm:items-center sm:justify-center">
          <div className="max-h-[88vh] w-full overflow-hidden rounded-t-2xl border border-white/[0.08] bg-[#111] shadow-2xl sm:max-w-lg sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
              <div>
                <div className="text-sm font-bold text-white">AI specialist room</div>
                <div className="text-[10px] text-gray-500">{providerLabel}</div>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-lg border border-white/10 p-2 text-gray-400 hover:text-white">
                <X size={16} />
              </button>
            </div>
            <div className="max-h-[72vh] space-y-3 overflow-y-auto px-4 py-4">
              <div className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-xs font-black text-violet-200">AI</div>
                <div className="rounded-2xl rounded-tl-sm bg-violet-500/[0.08] px-3 py-2">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-violet-300">Lead analyst</div>
                  <div className="mt-1 text-sm text-white">{rec}</div>
                  {confidence != null && <div className="mt-1 text-xs text-gray-400">Confidence: {pct(confidence)}</div>}
                </div>
              </div>

              {analysis?.key_factors?.slice(0, 4).map((factor: string, i: number) => (
                <div key={`${factor}-${i}`} className="ml-12 rounded-2xl bg-white/[0.04] px-3 py-2 text-xs leading-relaxed text-emerald-100">
                  {factor}
                </div>
              ))}

              {analysts.slice(0, 8).map((analyst: any, index: number) => {
                const initials = String(analyst?.name || `A${index + 1}`)
                  .split(' ')
                  .map(part => part[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase();
                return (
                  <div key={`${analyst?.name || 'analyst'}-${index}`} className="flex gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/30 to-blue-500/20 text-[10px] font-black text-white">
                      {initials}
                    </div>
                    <div className="rounded-2xl rounded-tl-sm bg-white/[0.055] px-3 py-2">
                      <div className="text-xs font-semibold text-white">{analyst?.name || `Specialist ${index + 1}`}</div>
                      {analystHasNoEvidence(analyst) && <div className="mt-1 inline-flex rounded border border-amber-300/20 bg-amber-300/[0.08] px-1.5 py-0.5 text-[8px] font-bold uppercase text-amber-200">No source evidence</div>}
                      {analyst?.trained_knowledge && <div className="mt-0.5 text-[9px] text-gray-500">{analyst.trained_knowledge}</div>}
                      <div className="mt-1 text-xs leading-relaxed text-gray-300">{analyst?.finding || 'No finding returned.'}</div>
                    </div>
                  </div>
                );
              })}

              <AiReasoningBlock reasoning={analysis?.reasoning} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const EngineAgreementPanel = ({ m }: { m: any }) => {
  const matchId = String(m?.id || m?.sportybet_id || m?.match_id || '');
  const context = matchId ? getValueHunterContext(matchId, m) : null;
  if (!context || context.consensus.confidence === 'low' || context.consensus.supportingEngines.length === 0) return null;
  const supporters = context.assignedEngines.filter((engine: any) =>
    context.consensus.supportingEngines.includes(engine.engineId)
    || engine.prediction.pick === context.consensus.bestPick
  );

  return (
    <Sec title="Engine agreement">
      <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] p-3">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Engines agree on this match</div>
            <div className="mt-1 text-base font-bold text-white">{context.consensus.bestPick}</div>
            <div className="mt-0.5 text-xs text-gray-500">{context.consensus.bestMarket} @ {Number(context.consensus.bestOdds || 0).toFixed(2)}</div>
          </div>
          <div className="rounded-lg bg-black/20 px-2 py-1 text-xs font-bold text-emerald-300">{context.consensus.confidence.toUpperCase()}</div>
        </div>
        <div className="space-y-2">
          {supporters.slice(0, 3).map((engine: any, index: number) => (
            <div key={`${engine.engineId}-${index}`} className="rounded-lg bg-black/20 px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white">{engine.engineIcon} {engine.engineName}</div>
                  <div className="mt-0.5 text-[10px] text-gray-500">{engine.contextFactors.slice(0, 3).join(', ') || 'Matched its specialist rule set'}</div>
                </div>
                <div className="text-right text-[10px] text-emerald-300">{(engine.winRate * 100).toFixed(0)}% memory</div>
              </div>
              <div className="mt-1 text-xs leading-relaxed text-gray-300">
                Picked {engine.prediction.pick} because this match fits {engine.prediction.market.replace(/_/g, ' ')} with {Math.round(engine.prediction.probability * 100)}% model probability.
              </div>
            </div>
          ))}
        </div>
      </div>
    </Sec>
  );
};

const AlternativePicks = ({ picks }: { picks: any[] }) => {
  return (
    <Sec title="Secondary leans">
      <div className="space-y-2">
        {!picks.length ? (
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.025] px-3 py-2.5">
            <div className="text-sm font-semibold text-white">No secondary lean</div>
            <div className="mt-1 text-xs text-gray-500">The engine did not find another playable angle.</div>
          </div>
        ) : picks.map((pick: any, i: number) => {
          const p = cleanPick(pick);
          return (
            <div key={`${p.selection}-${i}`} className="rounded-lg border border-white/[0.06] bg-white/[0.025] px-3 py-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-white">{p.selection}</div>
                  <div className="mt-0.5 text-[10px] uppercase tracking-widest text-gray-600">{pickTypeLabel[p.type] || p.type}</div>
                </div>
                <div className={`text-sm font-bold ${confidenceTone(p.confidence)}`}>{p.confidence}%</div>
              </div>
              {(p.reason || p.reasoning) && <div className="mt-2 text-xs text-gray-500">{p.reason || p.reasoning}</div>}
            </div>
          );
        })}
      </div>
    </Sec>
  );
};

const ModelConsensus = ({ models, home, away }: { models: any; home: string; away: string }) => {
  const rows = [
    { label: 'Poisson', data: models?.poisson },
    { label: 'Dixon-Coles', data: models?.dixon_coles },
    { label: 'Ensemble', data: models?.ensemble },
  ].filter(row => row.data && !row.data.error);

  if (!rows.length) return null;

  return (
    <Sec title="Model view">
      <div className="space-y-3">
        {rows.map(row => {
          const probs = row.data.probabilities || {};
          const h = num(probs.home_win);
          const d = num(probs.draw);
          const a = num(probs.away_win);
          const total = h + d + a || 100;
          return (
            <div key={row.label}>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-400">{row.label}</span>
                <span className="text-[10px] text-gray-600">O2.5 {pct(probs.over_2_5)} / BTTS {pct(probs.btts)}</span>
              </div>
              <div className="flex h-6 overflow-hidden rounded-lg bg-white/5">
                <div className="flex items-center justify-center bg-emerald-600/70 text-[10px] font-bold text-white" style={{ width: `${(h / total) * 100}%` }}>{h >= 8 ? pct(h) : ''}</div>
                <div className="flex items-center justify-center bg-gray-500/60 text-[10px] font-bold text-white" style={{ width: `${(d / total) * 100}%` }}>{d >= 8 ? pct(d) : ''}</div>
                <div className="flex items-center justify-center bg-blue-600/70 text-[10px] font-bold text-white" style={{ width: `${(a / total) * 100}%` }}>{a >= 8 ? pct(a) : ''}</div>
              </div>
              <div className="mt-1 flex justify-between text-[9px] text-gray-600">
                <span>{home || 'Home'}</span>
                <span>Draw</span>
                <span>{away || 'Away'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </Sec>
  );
};

const MemoryWeights = ({ prediction, models }: { prediction: any; models: any }) => {
  const firstPick = (prediction?.picks || [])[0] || {};
  const pickMemory = firstPick?.calibration?.memory_weighting;
  const finishedMemory = models?.finished_database_memory;
  if (!pickMemory && !finishedMemory) return null;

  const rows = finishedMemory
    ? finishedMemoryRows
    : [
        { key: 'tournament', label: 'Tournament', evidence: true },
        { key: 'country', label: 'Country', evidence: true },
        { key: 'global', label: 'Whole DB', evidence: false },
      ];

  return (
    <Sec title="Database weight">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {rows.map(row => {
          const scope = pickMemory?.scopes?.[row.key] || finishedMemory?.scopes?.[row.key] || {};
          const weight = pickMemory?.weights?.[row.key] ?? finishedMemory?.weights?.[row.key] ?? 0;
          return (
            <div key={row.key} className="rounded-lg bg-white/[0.03] px-2 py-2 text-center">
              <div className="text-[9px] text-gray-500">{row.label}</div>
              <div className="text-base font-bold text-white">{Math.round(weight * 100)}%</div>
              <div className="text-[9px] text-gray-600">{scope.samples ?? 0} samples</div>
              {row.evidence === false && <div className="mt-1 text-[8px] uppercase tracking-wider text-gray-700">context</div>}
            </div>
          );
        })}
      </div>
    </Sec>
  );
};

const DataQuality = ({ q }: { q: any }) => {
  if (!q) return null;
  const items = [
    ['has_sofascore_detail', 'SofaScore'],
    ['has_sportybet_markets', 'Markets'],
    ['has_web_context', 'Web'],
    ['has_raw_sporty', 'Raw Sporty'],
    ['has_raw_sofascore', 'Raw Sofa'],
  ];
  return (
    <div className="flex flex-wrap gap-2 px-1">
      {items.map(([key, label]) => (
        <span key={key} className={`rounded-full border px-2 py-0.5 text-[10px] ${
          q[key] ? 'border-emerald-800 text-emerald-500' : 'border-white/[0.06] text-gray-700'
        }`}>
          {q[key] ? 'OK' : 'MISS'} {label}
        </span>
      ))}
    </div>
  );
};

const USER_PICK_OPTIONS = [
  { label: 'Home Win', value: 'Home Win', type: 'match_result' },
  { label: 'Draw', value: 'Draw', type: 'match_result' },
  { label: 'Away Win', value: 'Away Win', type: 'match_result' },
  { label: 'Over 2.5', value: 'Over 2.5 goals', type: 'goals' },
  { label: 'Under 2.5', value: 'Under 2.5 goals', type: 'goals' },
  { label: 'BTTS Yes', value: 'Both teams to score', type: 'goals' },
];

const UserPickPanel = ({ matchId, modelSelection }: { matchId: string; modelSelection?: string }) => {
  const [saved, setSaved] = useState<{ selection: string; pick_type: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<'accepted' | 'rejected' | null>(null);

  useEffect(() => {
    if (!matchId) return;
    getUserPickForMatch(matchId)
      .then((res: any) => {
        const picks = (res?.weighted_picks || []).filter((p: any) => p.user_action === 'user_pick');
        if (picks.length) setSaved({ selection: picks[0].selection, pick_type: picks[0].pick_type });
        const fb = (res?.weighted_picks || []).find((p: any) => p.user_action === 'accepted' || p.user_action === 'rejected');
        if (fb) setFeedback(fb.user_action);
      })
      .catch(() => {});
  }, [matchId]);

  const submit = async (option: typeof USER_PICK_OPTIONS[0]) => {
    setSubmitting(true);
    try {
      const userSel = option.value.toLowerCase();
      const modelSel = (modelSelection || '').toLowerCase();
      const agrees = !!(modelSel && userSel.includes(modelSel.split(' ')[0]));
      await trackUserBehavior({
        match_id: matchId,
        action: 'user_pick',
        pick_type: option.type,
        selection: option.value,
        metadata: { source: 'tab_predictions', agrees_with_model: agrees },
      });
      setSaved({ selection: option.value, pick_type: option.type });
    } catch {}
    setSubmitting(false);
  };

  const sendFeedback = async (action: 'accepted' | 'rejected') => {
    if (feedback === action) return;
    setFeedback(action);
    try {
      await trackUserBehavior({
        match_id: matchId,
        action,
        pick_type: saved?.pick_type,
        selection: saved?.selection || modelSelection,
        metadata: { source: 'tab_predictions' },
      });
    } catch {}
  };

  const normModel = (modelSelection || '').toLowerCase();
  const userAgreesWithModel = !!(saved && normModel && saved.selection.toLowerCase().includes(normModel.split(' ')[0]));

  return (
    <Sec title="Your Pick">
      <div className="space-y-3">
        {modelSelection && (
          <div className="flex items-center gap-2">
            <span className="flex-1 text-[10px] text-gray-500">Model: <span className="font-semibold text-white">{modelSelection}</span></span>
            <button
              onClick={() => sendFeedback('accepted')}
              className={`rounded-lg border px-3 py-1 text-[11px] font-semibold transition-colors ${
                feedback === 'accepted'
                  ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                  : 'border-white/10 text-gray-500 hover:border-emerald-500/40 hover:text-emerald-400'
              }`}
            >
              &#10003; Agree
            </button>
            <button
              onClick={() => sendFeedback('rejected')}
              className={`rounded-lg border px-3 py-1 text-[11px] font-semibold transition-colors ${
                feedback === 'rejected'
                  ? 'border-red-500 bg-red-500/20 text-red-300'
                  : 'border-white/10 text-gray-500 hover:border-red-500/40 hover:text-red-400'
              }`}
            >
              &#10007; Disagree
            </button>
          </div>
        )}
        {userAgreesWithModel && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/[0.08] px-3 py-1.5">
            <span className="text-xs text-emerald-400">&#9889; Your pick matches the model &mdash; signals reinforced</span>
          </div>
        )}
        {saved && (
          <div className="flex items-center gap-2 rounded-lg border border-violet-500/30 bg-violet-500/[0.08] px-3 py-2">
            <span className="text-[10px] uppercase tracking-widest text-violet-400">Your pick</span>
            <span className="text-sm font-semibold text-white">{saved.selection}</span>
          </div>
        )}
        <div className="grid grid-cols-3 gap-2">
          {USER_PICK_OPTIONS.map(opt => {
            const matchesModel = !!(normModel && opt.value.toLowerCase().includes(normModel.split(' ')[0]));
            return (
              <button
                key={opt.value}
                disabled={submitting}
                onClick={() => submit(opt)}
                className={`relative rounded-lg border px-2 py-2 text-xs font-semibold transition-colors ${
                  saved?.selection === opt.value
                    ? 'border-violet-500 bg-violet-500/20 text-violet-200'
                    : matchesModel
                      ? 'border-emerald-500/40 bg-emerald-500/[0.06] text-emerald-300 hover:bg-emerald-500/[0.12]'
                      : 'border-white/10 bg-white/[0.03] text-gray-300 hover:border-white/20 hover:bg-white/[0.06]'
                }`}
              >
                {opt.label}
                {matchesModel && <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-emerald-500" />}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] leading-relaxed text-gray-600">
          Your pick trains the intelligence. Agreeing with the model strengthens its signals.
        </p>
      </div>
    </Sec>
  );
};

interface TabPredictionsProps {
  m: any;
  onPredict: () => void;
  onAnalyze: () => void;
  predicting: boolean;
  analyzing: boolean;
  actionMsg: string;
  actionError: string;
}

const PredictionActions = ({
  m,
  onPredict,
  onAnalyze,
  predicting,
  analyzing,
  actionMsg,
  actionError,
}: {
  m: any;
  onPredict: () => void;
  onAnalyze: () => void;
  predicting: boolean;
  analyzing: boolean;
  actionMsg: string;
  actionError: string;
}) => {
  const hasPrediction = m?.prediction;
  const hasAiAnalysis = m?.ai_analysis;

  return (
    <div className="space-y-3">
      {/* Primary action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onPredict}
          disabled={predicting}
          className="flex flex-col items-center gap-2 py-4 rounded-xl border border-white/[0.07] bg-[#161616] hover:border-purple-500/40 hover:bg-purple-500/[0.06] transition disabled:opacity-40 active:scale-[0.98]"
        >
          <Target size={22} className="text-purple-400" />
          <span className="text-xs font-semibold text-gray-300">
            {predicting ? 'Predicting...' : 'Manual Prediction'}
          </span>
        </button>
        <button
          onClick={onAnalyze}
          disabled={analyzing}
          className="flex flex-col items-center gap-2 py-4 rounded-xl border border-white/[0.07] bg-[#161616] hover:border-violet-500/40 hover:bg-violet-500/[0.06] transition disabled:opacity-40 active:scale-[0.98]"
        >
          <Brain size={22} className="text-violet-400" />
          <span className="text-xs font-semibold text-gray-300">
            {analyzing ? 'Analyzing...' : 'AI Prediction'}
          </span>
        </button>
      </div>

      {/* Status messages */}
      {actionMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-2 text-xs text-emerald-400">
          <CheckCircle size={14} />
          {actionMsg}
        </div>
      )}
      {actionError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-xs text-red-400">
          <AlertCircle size={14} />
          {actionError}
        </div>
      )}

      {/* Loading indicator */}
      {(predicting || analyzing) && (
        <div className="flex items-center justify-center py-4 gap-3">
          <Clock size={16} className="text-gray-500 animate-spin" />
          <span className="text-xs text-gray-400">
            {predicting ? 'Running manual prediction engine...' : 'AI analysts are reviewing the match...'}
          </span>
        </div>
      )}

      {/* Prediction status badge */}
      {hasPrediction && !predicting && !analyzing && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-2">
          <CheckCircle size={14} className="text-emerald-400" />
          <span className="text-xs text-emerald-400">
            Prediction available â€” {hasPrediction.status || 'completed'}
          </span>
        </div>
      )}

      {/* AI analysis status badge */}
      {hasAiAnalysis && !analyzing && (
        <div className="flex items-center gap-2 rounded-lg border border-violet-500/20 bg-violet-500/[0.06] px-3 py-2">
          <Brain size={14} className="text-violet-400" />
          <span className="text-xs text-violet-400">
            AI analysis available â€” {hasAiAnalysis.provider || 'completed'}
          </span>
        </div>
      )}
    </div>
  );
};


const NoPredictionPanel = ({ m, predictionError, onPredict, predicting }: { m: any; predictionError: string | null; onPredict: () => void; predicting: boolean }) => {
  // Pull deferred reason from ai_prediction_state audit or intelligence
  const state = m?.manual_prediction_state;
  const audit = state?.prediction?.audit || m?.intelligence?.prediction?.audit || {};
  const noPred = audit?.no_prediction || {};
  const deferReason = noPred?.reason || state?.message || predictionError;
  const missing = audit?.enrichment?.missing || [];
  const signals = state?.prediction?.audit?.signals || {};
  const supportSignals: any[] = signals?.support || [];
  const riskSignals: any[] = signals?.risk || [];
  const models = audit?.models || {};
  const contextual = m?.intelligence?.prediction?.contextual || {};
  const riskLevel = contextual?.risk?.level || m?.intelligence?.learning?.risk_management?.risk_level;
  const confAdj = contextual?.confidence_adjustment;
  const explainLines: string[] = contextual?.explain?.lines || [];

  return (
    <div className="space-y-3">
      {/* Deferred / no pick card */}
      <div className="rounded-xl border border-yellow-500/25 bg-yellow-500/[0.05] p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-yellow-400">Manual Prediction — No Pick</div>
            <div className="mt-1 text-sm font-semibold text-white">
              {deferReason ? String(deferReason).replace(/_/g, ' ') : 'Prediction deferred — insufficient signal'}
            </div>
          </div>
          {riskLevel && (
            <div className={`rounded-lg px-2 py-1 text-xs font-bold ${riskLevel === 'high' ? 'bg-red-500/15 text-red-300' : riskLevel === 'medium' ? 'bg-yellow-500/15 text-yellow-300' : 'bg-white/[0.06] text-gray-400'}`}>
              {riskLevel} risk
            </div>
          )}
        </div>

        {/* Missing data */}
        {missing.length > 0 && (
          <div className="rounded-lg bg-black/20 px-3 py-2">
            <div className="text-[9px] uppercase tracking-widest text-gray-500 mb-1">Missing data</div>
            <div className="flex flex-wrap gap-1">
              {missing.map((item: string) => (
                <span key={item} className="rounded-full border border-red-500/20 px-2 py-0.5 text-[10px] text-red-400">{item.replace(/_/g, ' ')}</span>
              ))}
            </div>
          </div>
        )}

        {/* Confidence adjustment */}
        {confAdj != null && confAdj !== 0 && (
          <div className={`rounded-lg px-3 py-2 text-xs ${confAdj < 0 ? 'bg-red-500/[0.06] text-red-300' : 'bg-emerald-500/[0.06] text-emerald-300'}`}>
            Confidence adjustment: {confAdj > 0 ? '+' : ''}{confAdj}%
          </div>
        )}

        {/* Explain lines */}
        {explainLines.length > 0 && (
          <div className="space-y-1">
            {explainLines.slice(0, 4).map((line: string, i: number) => (
              <div key={i} className="text-xs leading-relaxed text-gray-400">• {line}</div>
            ))}
          </div>
        )}
      </div>

      {/* Support / risk signals if any were evaluated */}
      {(supportSignals.length > 0 || riskSignals.length > 0) && (
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Evaluated Signals</div>
          {supportSignals.slice(0, 3).map((s: any, i: number) => (
            <div key={i} className="text-xs text-emerald-300">↑ {s.name?.replace(/_/g, ' ')} {s.impact != null ? `(${s.impact > 0 ? '+' : ''}${s.impact})` : ''}</div>
          ))}
          {riskSignals.slice(0, 3).map((s: any, i: number) => (
            <div key={i} className="text-xs text-red-300">↓ {s.name?.replace(/_/g, ' ')} {s.impact != null ? `(${s.impact > 0 ? '+' : ''}${s.impact})` : ''}</div>
          ))}
        </div>
      )}

      {/* Model probabilities if available */}
      {(models?.ensemble_prediction || models?.probabilities) && (
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Model Output</div>
          {(() => {
            const probs = models?.probabilities || {};
            const h = Number(probs.home_win || 0);
            const d = Number(probs.draw || 0);
            const a = Number(probs.away_win || 0);
            const total = h + d + a || 100;
            if (!h && !d && !a) return null;
            return (
              <div className="flex h-5 overflow-hidden rounded-lg bg-white/5">
                <div className="flex items-center justify-center bg-emerald-600/70 text-[10px] font-bold text-white" style={{ width: `${(h / total) * 100}%` }}>{h >= 8 ? `${Math.round(h)}%` : ''}</div>
                <div className="flex items-center justify-center bg-gray-500/60 text-[10px] font-bold text-white" style={{ width: `${(d / total) * 100}%` }}>{d >= 8 ? `${Math.round(d)}%` : ''}</div>
                <div className="flex items-center justify-center bg-blue-600/70 text-[10px] font-bold text-white" style={{ width: `${(a / total) * 100}%` }}>{a >= 8 ? `${Math.round(a)}%` : ''}</div>
              </div>
            );
          })()}
        </div>
      )}

      <button
        onClick={onPredict}
        disabled={predicting}
        className="w-full py-3 rounded-xl border border-purple-500/40 bg-purple-500/[0.08] text-sm font-semibold text-purple-300 hover:bg-purple-500/[0.15] transition disabled:opacity-40 active:scale-[0.98]"
      >
        {predicting ? 'Running prediction...' : 'Re-run Prediction'}
      </button>
    </div>
  );
};

const TabPredictions = ({ m, onPredict, onAnalyze, predicting, analyzing, actionMsg, actionError }: TabPredictionsProps) => {
  const prediction = m?.prediction;
  const predictionError = m?.prediction_error;
  const picks = (prediction?.picks || [])
    .filter((p: any) => p?.type !== 'no_bet' && (p?.selection || p?.pick))
    .map(cleanPick)
    .sort((a: any, b: any) => b.confidence - a.confidence);
  const primary = picks.find((p: any) => p.role === 'primary') || picks[0];
  const alternatives = picks.filter((p: any) => p !== primary).slice(0, 2);
  const signals = prediction?.signals || [];
  const contextualIntelligence = contextualFrom(prediction, m);
  const riskManagement = prediction?.risk_management || primary?.risk_management || m?.intelligence?.learning?.risk_management;
  const aiAnalysis = m?.ai_analysis || null;
  // Has the manual engine run at all (even if deferred/no pick)?
  const manualRan = !!(m?.manual_prediction_state || m?.prediction_error || m?.intelligence?.prediction?.audit);
  const state = m?.manual_prediction_state;
  const audit = state?.prediction?.audit || m?.intelligence?.prediction?.audit || {};
  const noPickReason = audit?.no_prediction?.reason || state?.message || predictionError;
  const matchId = m?.id || m?.sportybet_id || m?.match_id || '';

  return (
    <div className="space-y-3 px-4 py-4">
      <PredictionActions
        m={m}
        onPredict={onPredict}
        onAnalyze={onAnalyze}
        predicting={predicting}
        analyzing={analyzing}
        actionMsg={actionMsg}
        actionError={actionError || ''}
      />


      {!prediction && (
        manualRan ? (
          <NoPredictionPanel m={m} predictionError={predictionError} onPredict={onPredict} predicting={predicting} />
        ) : (
          <div className="rounded-xl border border-white/[0.07] bg-[#161616] p-6 text-center space-y-4">
            <div className="text-3xl">?</div>
            <div>
              <div className="text-sm font-semibold text-white">No prediction yet</div>
              <div className="text-xs text-gray-500 mt-1">{predictionError || "The system hasn't run a prediction for this match. You can trigger one now."}</div>
            </div>
            <button onClick={onPredict} disabled={predicting} className="w-full py-3 rounded-xl border border-purple-500/40 bg-purple-500/[0.08] text-sm font-semibold text-purple-300 hover:bg-purple-500/[0.15] transition disabled:opacity-40 active:scale-[0.98]">
              {predicting ? 'Running prediction...' : 'Run Prediction Now'}
            </button>
          </div>
        )
      )}

      {prediction && <LiveGoalPanel picks={picks} m={m} prediction={prediction} />}
      {prediction && <PortfolioBadge prediction={prediction} />}
      {primary ? <DecisionCard pick={primary} /> : <NoPickDecisionCard reason={noPickReason} />}
      {primary && <GradedResultCard prediction={prediction} pick={primary} />}
      <CompactAiAnalysisCard analysis={aiAnalysis} />
      <EngineAgreementPanel m={m} />
      <UserPickPanel matchId={matchId} modelSelection={primary?.selection} />
      <IntelligencePanel intelligence={contextualIntelligence} riskManagement={riskManagement} />
      {primary && <StakeCard pick={primary} />}
      <AlternativePicks picks={alternatives} />
      <EvidenceBoard signals={signals} pick={primary || { selection: 'No pick' }} m={m} />
      <ModelConsensus models={prediction?.models} home={m?.home_team} away={m?.away_team} />
      <MemoryWeights prediction={prediction} models={prediction?.models} />
      <DataQuality q={prediction?.data_quality} />
    </div>
  );
};

export default TabPredictions;
