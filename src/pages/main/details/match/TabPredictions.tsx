import { useState } from 'react';
import { Sec, Empty, ActionButton } from './shared';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pct = (v: any) => (v != null ? `${Math.round(Number(v))}%` : '—');

const confidenceColor = (c: number) =>
  c >= 70 ? 'text-emerald-400' : c >= 55 ? 'text-yellow-400' : 'text-red-400';

const confidenceBg = (c: number) =>
  c >= 70 ? 'bg-emerald-500' : c >= 55 ? 'bg-yellow-500' : 'bg-red-500';

const confidenceLabel = (c: number) =>
  c >= 75 ? 'Strong' : c >= 65 ? 'Good' : c >= 55 ? 'Moderate' : 'Weak';

// Map internal pick types to readable labels
const pickTypeLabel: Record<string, string> = {
  match_result:   'Match Result',
  goals:          'Goals',
  live_goals:     'Live Goals',
  double_chance:  'Double Chance',
  ensemble_1x2:   'Model Consensus',
  value_bet:      'Value Bet',
  red_card:       'Red Card Impact',
  no_bet:         'No Bet',
};

// Map internal signal names to human sentences
const signalHuman = (name: string, value: any, impact: number, m: any): string => {
  const home = m?.home_team || 'Home';
  const away = m?.away_team || 'Away';
  const abs = Math.abs(impact);
  const stronger = impact > 0 ? home : away;
  const weaker   = impact > 0 ? away : home;

  switch (name) {
    case 'goal_pressure':
      if (value >= 40) return `Both teams have been involved in high-scoring games recently — expect goals.`;
      if (value >= 20) return `Moderate goal pressure — at least one or two goals likely.`;
      return `Low goal pressure — could be a tight, low-scoring game.`;

    case 'league_position_edge':
      if (abs < 3) return `Both teams are close in the table — evenly matched on paper.`;
      return `${stronger} sits ${Math.round(abs / 1.5)} places higher in the table, giving them a positional edge.`;

    case 'odds_edge':
      if (abs < 2) return `The market sees this as a very even contest.`;
      return `The bookmaker's odds lean toward ${stronger} — the market has priced in an edge.`;

    case 'h2h_edge': {
      const hw = value?.home_wins ?? 0;
      const aw = value?.away_wins ?? 0;
      const d  = value?.draws ?? 0;
      const n  = value?.sample_size ?? 0;
      if (!n) return `No head-to-head history available.`;
      if (hw === aw) return `Head-to-head is perfectly split over ${n} meetings (${hw}W ${d}D ${aw}L).`;
      const dom = hw > aw ? home : away;
      const domW = hw > aw ? hw : aw;
      return `${dom} has dominated this fixture — ${domW} wins from ${n} meetings (${hw}W ${d}D ${aw}L).`;
    }

    case 'market_steam': {
      const side = value?.side === '1' ? home : away;
      const move = value?.probability_move ?? 0;
      if (move < 0) return `${side}'s odds have shortened — sharp money is backing them.`;
      return `${side}'s odds have drifted — the market is moving away from them.`;
    }

    case 'ensemble_model': {
      const probs = value?.probabilities || {};
      const hw = Math.round(probs.home_win ?? 0);
      const d  = Math.round(probs.draw ?? 0);
      const aw = Math.round(probs.away_win ?? 0);
      return `Combined models give ${home} ${hw}%, Draw ${d}%, ${away} ${aw}%.`;
    }

    case 'dixon_coles_model': {
      const hw = Math.round(value?.home_win ?? 0);
      const aw = Math.round(value?.away_win ?? 0);
      const o25 = Math.round(value?.over_2_5 ?? 0);
      const btts = Math.round(value?.btts ?? 0);
      return `Dixon-Coles model: ${home} ${hw}% · ${away} ${aw}% · Over 2.5 ${o25}% · BTTS ${btts}%.`;
    }

    case 'poisson_model': {
      const hw = Math.round(value?.home_win ?? 0);
      const aw = Math.round(value?.away_win ?? 0);
      const o25 = Math.round(value?.over_2_5 ?? 0);
      return `Poisson model: ${home} ${hw}% · ${away} ${aw}% · Over 2.5 ${o25}%.`;
    }

    case 'elo_model': {
      const helo = value?.home_elo ?? 1500;
      const aelo = value?.away_elo ?? 1500;
      const hwp  = Math.round(value?.home_win_probability ?? 50);
      if (helo === aelo) return `ELO ratings are equal — no historical strength edge.`;
      const stronger2 = helo > aelo ? home : away;
      return `ELO gives ${stronger2} a ${hwp > 50 ? hwp : 100 - hwp}% win probability based on historical results.`;
    }

    case 'avg_rating_edge':
      if (abs < 1) return `Player ratings are very close between the two sides.`;
      return `${stronger} has a higher average player rating — ${abs.toFixed(1)} points ahead.`;

    case 'recent_history_edge':
      if (abs < 2) return `Recent form is evenly matched between both teams.`;
      return `${stronger} has been in better recent form based on results and goals.`;

    case 'league_strength_edge': {
      const hAvg = value?.home_recent_avg ?? 0;
      const aAvg = value?.away_recent_avg ?? 0;
      const league = value?.match_league?.name || 'this league';
      if (Math.abs(hAvg - aAvg) < 5) return `Both teams have been playing at a similar level of competition recently.`;
      const battle_hardened = hAvg > aAvg ? home : away;
      return `${battle_hardened} has been playing in stronger competitions recently — better battle-tested for ${league}.`;
    }

    case 'goal_pressure_live':
    case 'live_chase_pressure': {
      const min = value?.minute ?? 0;
      const diff = value?.score_diff ?? 0;
      if (diff === 0) return `It's level at ${min}' — both teams will push for a winner.`;
      const chasing = diff < 0 ? home : away;
      return `${chasing} is chasing the game at ${min}' — expect more attacking pressure.`;
    }

    case 'late_goal_league':
      return `${value || 'This league'} has a strong history of late goals — stay alert past 75'.`;

    case 'late_goal_window':
      return `${value || 'Late in the game'} — the late-goal window is open based on league memory.`;

    case 'late_goal_memory':
      return `Historical data shows this fixture type produces late goals frequently.`;

    case 'red_card_state':
      return `A red card has changed the game — ${value || 'numerical advantage'} now in play.`;

    case 'market_favorite':
      return `The market identifies ${value || 'one side'} as the clear favourite.`;

    case 'web_context': {
      const snippets = value?.snippets ?? 0;
      const err = value?.error;
      if (err && err.includes('timed out')) return `Web search timed out — prediction based on statistical models only.`;
      if (err) return `Web context unavailable — prediction based on statistical models only.`;
      if (snippets > 0) return `${snippets} web snippet${snippets > 1 ? 's' : ''} found and factored into the analysis.`;
      return `No web context found — prediction based on statistical models only.`;
    }

    case 'prediction_memory': {
      const rate = value?.blended_win_rate;
      const t = value?.scopes?.tournament?.samples ?? 0;
      const c = value?.scopes?.country?.samples ?? 0;
      const g = value?.scopes?.global?.samples ?? 0;
      return `Graded-pick memory blends tournament (${t}), country (${c}), and whole database (${g}) samples${rate != null ? ` at ${rate}% historical win rate` : ''}.`;
    }

    case 'finished_database_memory': {
      const b = value?.blended || {};
      const samples = value?.samples ?? 0;
      const hw = Math.round((b.home_win_rate ?? 0) * 100);
      const dr = Math.round((b.draw_rate ?? 0) * 100);
      const aw = Math.round((b.away_win_rate ?? 0) * 100);
      return `Finished-match memory uses ${samples} weighted database samples: home ${hw}%, draw ${dr}%, away ${aw}%.`;
    }

    case 'odds_progression': {
      const pull = value?.strongest_pull;
      if (!pull) return `No meaningful market movement yet.`;
      return `Market movement: ${pull.selection} is ${pull.direction} (${pull.odds_change_percent}% odds move, ${pull.implied_change_percent}% implied shift).`;
    }

    default:
      return name.replace(/_/g, ' ');
  }
};

// ─── Confidence bar ────────────────────────────────────────────────────────────

const ConfidenceBar = ({ value }: { value: number }) => (
  <div className="flex items-center gap-2 mt-1.5">
    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${confidenceBg(value)}`} style={{ width: `${value}%` }} />
    </div>
    <span className={`text-xs font-bold tabular-nums w-8 text-right ${confidenceColor(value)}`}>{value}%</span>
  </div>
);

// ─── Pick card ─────────────────────────────────────────────────────────────────

const PickCard = ({ pick, isTop }: { pick: any; isTop: boolean }) => {
  const c = pick.confidence ?? 0;
  const type = pickTypeLabel[pick.type] || pick.type?.replace(/_/g, ' ') || 'Pick';
  const selection = pick.pick || pick.selection || '—';
  const reason = pick.reasoning || pick.reason || '';
  const isNoBet = pick.type === 'no_bet';

  if (isNoBet) return null;

  return (
    <div className={`rounded-xl overflow-hidden border ${
      isTop ? 'border-emerald-700/60 bg-emerald-950/20' : 'border-white/[0.07] bg-white/[0.02]'
    }`}>
      <div className="px-4 py-3">
        {/* Type badge + top label */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{type}</span>
          {isTop && <span className="text-[10px] font-bold text-emerald-400 border border-emerald-700 px-1.5 py-0.5 rounded">Top Pick</span>}
          {pick.type === 'value_bet' && <span className="text-[10px] font-bold text-yellow-400 border border-yellow-700 px-1.5 py-0.5 rounded">💰 Value</span>}
        </div>

        {/* Selection */}
        <div className="text-base font-bold text-white leading-tight">{selection}</div>

        {/* Confidence bar */}
        <ConfidenceBar value={c} />
        <div className="text-[10px] text-gray-600 mt-0.5">{confidenceLabel(c)} confidence</div>

        {/* Reason */}
        {reason && (
          <p className="text-xs text-gray-400 mt-2 leading-relaxed">{reason}</p>
        )}

        {/* Odds if available */}
        {pick.odds && (
          <div className="mt-2 text-[11px] text-gray-500">Odds: <span className="text-white font-semibold">{pick.odds}</span></div>
        )}
      </div>
    </div>
  );
};

// ─── Model consensus block ─────────────────────────────────────────────────────

const ModelConsensus = ({ models, home, away }: { models: any; home: string; away: string }) => {
  const items = [
    { label: 'Poisson',      data: models?.poisson,      key: 'poisson' },
    { label: 'Dixon-Coles',  data: models?.dixon_coles,  key: 'dixon' },
    { label: 'ELO',          data: models?.elo,           key: 'elo' },
    { label: 'Ensemble',     data: models?.ensemble,      key: 'ensemble' },
  ].filter(m => m.data && !m.data.error);

  if (!items.length) return null;

  return (
    <Sec title="Model Consensus">
      <div className="space-y-3">
        {items.map(({ label, data, key }) => {
          const probs = key === 'elo'
            ? { home_win: data.home_win_probability, draw: 100 - data.home_win_probability - data.away_win_probability, away_win: data.away_win_probability }
            : data.probabilities || data;
          const hw = Math.round(Number(probs?.home_win ?? 0));
          const d  = Math.round(Number(probs?.draw ?? 0));
          const aw = Math.round(Number(probs?.away_win ?? 0));
          const total = hw + d + aw || 100;

          return (
            <div key={key}>
              <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                <span className="font-semibold text-gray-400">{label}</span>
                {(data.over_2_5 || data.btts) && (
                  <span className="text-gray-600">
                    {data.over_2_5 ? `O2.5 ${Math.round(data.over_2_5)}%` : ''}
                    {data.over_2_5 && data.btts ? ' · ' : ''}
                    {data.btts ? `BTTS ${Math.round(data.btts)}%` : ''}
                  </span>
                )}
              </div>
              {/* Stacked bar */}
              <div className="flex h-5 rounded-lg overflow-hidden gap-px">
                <div className="flex items-center justify-center text-[10px] font-bold text-white bg-emerald-700/70 transition-all" style={{ width: `${(hw / total) * 100}%` }}>
                  {hw > 8 ? `${hw}%` : ''}
                </div>
                <div className="flex items-center justify-center text-[10px] font-bold text-white bg-gray-600/60 transition-all" style={{ width: `${(d / total) * 100}%` }}>
                  {d > 8 ? `${d}%` : ''}
                </div>
                <div className="flex items-center justify-center text-[10px] font-bold text-white bg-blue-700/70 transition-all" style={{ width: `${(aw / total) * 100}%` }}>
                  {aw > 8 ? `${aw}%` : ''}
                </div>
              </div>
              <div className="flex justify-between text-[9px] text-gray-600 mt-0.5">
                <span>{home}</span>
                <span>Draw</span>
                <span>{away}</span>
              </div>
            </div>
          );
        })}
      </div>
    </Sec>
  );
};

// ─── Signal row ────────────────────────────────────────────────────────────────

const MemoryWeights = ({ prediction, models }: { prediction: any; models: any }) => {
  const firstPick = (prediction?.picks || [])[0] || {};
  const pickMemory = firstPick?.calibration?.memory_weighting;
  const finishedMemory = models?.finished_database_memory;
  if (!pickMemory && !finishedMemory) return null;

  const rows = [
    { key: 'tournament', label: 'Tournament' },
    { key: 'country', label: 'Country' },
    { key: 'global', label: 'Whole DB' },
  ];

  return (
    <Sec title="Database Weighting">
      <div className="space-y-3">
        {pickMemory && (
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Graded Picks</div>
              <div className="text-xs font-bold text-emerald-400">
                {pickMemory.blended_win_rate != null ? `${pickMemory.blended_win_rate}%` : 'Learning'}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {rows.map(row => {
                const scope = pickMemory.scopes?.[row.key] || {};
                const weight = pickMemory.weights?.[row.key] ?? 0;
                return (
                  <div key={row.key} className="rounded bg-black/20 px-2 py-2">
                    <div className="text-[9px] text-gray-500">{row.label}</div>
                    <div className="text-sm font-bold text-white">{Math.round(weight * 100)}%</div>
                    <div className="text-[9px] text-gray-600">{scope.samples ?? 0} graded</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {finishedMemory && (
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Finished Matches</div>
              <div className="text-xs text-gray-500">{finishedMemory.samples ?? 0} samples</div>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {rows.map(row => {
                const scope = finishedMemory.scopes?.[row.key] || {};
                const weight = finishedMemory.weights?.[row.key] ?? 0;
                const effective = finishedMemory.effective_weights?.[row.key] ?? 0;
                return (
                  <div key={row.key} className="rounded bg-black/20 px-2 py-2">
                    <div className="text-[9px] text-gray-500">{row.label}</div>
                    <div className="text-sm font-bold text-white">{Math.round(weight * 100)}%</div>
                    <div className="text-[9px] text-gray-600">{scope.samples ?? 0} games - active {Math.round(effective * 100)}%</div>
                  </div>
                );
              })}
            </div>
            {finishedMemory.blended && (
              <div className="grid grid-cols-3 gap-1 text-center text-[10px]">
                <div className="rounded bg-emerald-500/10 py-1 text-emerald-300">Home {Math.round((finishedMemory.blended.home_win_rate || 0) * 100)}%</div>
                <div className="rounded bg-white/[0.04] py-1 text-gray-300">Draw {Math.round((finishedMemory.blended.draw_rate || 0) * 100)}%</div>
                <div className="rounded bg-blue-500/10 py-1 text-blue-300">Away {Math.round((finishedMemory.blended.away_win_rate || 0) * 100)}%</div>
              </div>
            )}
          </div>
        )}
      </div>
    </Sec>
  );
};

const SignalRow = ({ signal, m }: { signal: any; m: any }) => {
  const [open, setOpen] = useState(false);
  const impact = signal.impact ?? 0;
  const abs = Math.abs(impact);

  // Skip purely internal/noise signals
  if (signal.name === 'recent_history_edge' && abs < 1) return null;
  if (signal.name === 'web_context' && !signal.value?.error && !signal.value?.snippets) return null;

  const human = signalHuman(signal.name, signal.value, impact, m);
  const impactColor = impact > 3 ? 'text-emerald-400' : impact < -3 ? 'text-red-400' : 'text-gray-500';
  const impactLabel = impact > 3 ? '↑ Positive' : impact < -3 ? '↓ Negative' : '→ Neutral';

  // Signals with rich value objects get an expand toggle
  const hasDetail = signal.value && typeof signal.value === 'object' &&
    ['h2h_edge', 'ensemble_model', 'dixon_coles_model', 'poisson_model', 'elo_model', 'league_strength_edge'].includes(signal.name);

  return (
    <div className="border-b border-white/[0.04] last:border-0 py-2.5">
      <div className="flex items-start gap-3 cursor-pointer" onClick={() => hasDetail && setOpen(!open)}>
        {/* Impact dot */}
        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
          impact > 3 ? 'bg-emerald-500' : impact < -3 ? 'bg-red-500' : 'bg-gray-600'
        }`} />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-300 leading-relaxed">{human}</p>
        </div>
        <div className="text-right shrink-0">
          <span className={`text-[10px] font-semibold ${impactColor}`}>{impactLabel}</span>
          {hasDetail && <div className="text-[9px] text-gray-600 mt-0.5">{open ? '▲' : '▼'}</div>}
        </div>
      </div>

      {/* Detail expansion for model signals */}
      {open && hasDetail && signal.name === 'h2h_edge' && (
        <div className="mt-2 ml-5 grid grid-cols-3 gap-2 text-center">
          {[
            { label: m?.home_team || 'Home', value: signal.value.home_wins, color: 'text-emerald-400' },
            { label: 'Draw',                 value: signal.value.draws,     color: 'text-gray-400' },
            { label: m?.away_team || 'Away', value: signal.value.away_wins, color: 'text-blue-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white/[0.03] rounded-lg py-2">
              <div className={`text-base font-bold ${color}`}>{value}</div>
              <div className="text-[9px] text-gray-600 truncate px-1">{label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Main component ────────────────────────────────────────────────────────────

interface TabPredictionsProps {
  m: any;
  onPredict: () => void;
  predicting: boolean;
  actionMsg: string;
}

const TabPredictions = ({ m, onPredict, predicting, actionMsg }: TabPredictionsProps) => {
  const prediction = m?.prediction;

  // prediction can come from the history format (has best_pick/picks/signals at top level)
  // or from the enriched format (has picks/signals/models)
  const picks: any[] = prediction?.picks || [];
  const signals: any[] = prediction?.signals || [];
  const models = prediction?.models;
  const summary = prediction?.summary;
  const home = m?.home_team || '';
  const away = m?.away_team || '';

  // Filter out no_bet picks for display
  const displayPicks = picks.filter((p: any) => p.type !== 'no_bet' && (p.pick || p.selection));

  return (
    <div className="px-4 py-4 space-y-3">
      <ActionButton
        onClick={onPredict}
        loading={predicting}
        label="🔮 Run Prediction"
        loadingLabel="Running prediction…"
        variant="purple"
      />
      {actionMsg && <div className="text-center text-xs text-emerald-400">{actionMsg}</div>}

      {!prediction ? (
        <Empty msg="No prediction yet — tap Run Prediction" />
      ) : (
        <>
          {/* Picks */}
          {displayPicks.length > 0 && (
            <div className="space-y-2.5">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Picks</div>
              {displayPicks.map((p: any, i: number) => (
                <PickCard key={i} pick={p} isTop={i === 0} />
              ))}
            </div>
          )}

          {/* Summary */}
          {summary && (
            <Sec title="Summary">
              <p className="text-xs text-gray-400 leading-relaxed">{summary}</p>
            </Sec>
          )}

          {/* Model consensus bars */}
          {models && <ModelConsensus models={models} home={home} away={away} />}
          <MemoryWeights prediction={prediction} models={models} />

          {/* Signals — human readable */}
          {signals.length > 0 && (
            <Sec title="What the data says">
              <div>
                {signals.map((s: any, i: number) => (
                  <SignalRow key={i} signal={s} m={m} />
                ))}
              </div>
            </Sec>
          )}

          {/* Data quality footer */}
          {prediction.data_quality && (
            <div className="flex flex-wrap gap-2 px-1">
              {[
                { key: 'has_sofascore_detail',    label: 'SofaScore' },
                { key: 'has_sportybet_markets',   label: 'Markets' },
                { key: 'has_web_context',         label: 'Web' },
              ].map(({ key, label }) => (
                <span key={key} className={`text-[10px] px-2 py-0.5 rounded-full border ${
                  prediction.data_quality[key]
                    ? 'border-emerald-800 text-emerald-600'
                    : 'border-white/[0.06] text-gray-700'
                }`}>
                  {prediction.data_quality[key] ? '✓' : '✗'} {label}
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TabPredictions;
