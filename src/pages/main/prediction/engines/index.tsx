import { useState } from 'react';
import { IonContent, IonPage, IonRefresher, IonRefresherContent, useIonRouter } from '@ionic/react';
import { usePredictionStore } from '../../../../prediction/usePredictionStore';
import { PredictionEngine, EngineRule } from '../../../../prediction/engine';
import { learningStore, getEngineLearningData } from '../../../../prediction/engineLearning';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const marketLabels: Record<string, string> = {
  '1x2': '1X2', 'over_under': 'Over/Under', 'gg_ng': 'GG/NG',
  'double_chance': 'Double Chance', 'ht_1x2': 'HT 1X2', 'corners': 'Corners',
  'clean_sheet': 'Clean Sheet', 'draw_no_bet': 'Draw No Bet',
  'btts_over': 'BTTS + Over', 'form': 'Form Signal',
};

const categoryMeta: Record<string, { label: string; color: string; border: string }> = {
  value:   { label: 'Value',   color: 'text-yellow-400',  border: 'border-yellow-800' },
  goals:   { label: 'Goals',   color: 'text-emerald-400', border: 'border-emerald-800' },
  result:  { label: 'Result',  color: 'text-blue-400',    border: 'border-blue-800' },
  special: { label: 'Special', color: 'text-purple-400',  border: 'border-purple-800' },
  sharp:   { label: 'Sharp',   color: 'text-red-400',     border: 'border-red-800' },
};

const winRate = (e: PredictionEngine) => {
  const learning = e.learning;
  if (learning && learning.totalPredictions > 0) {
    return (learning.winRate * 100).toFixed(0);
  }
  return e.stats.total === 0 ? null : ((e.stats.wins / e.stats.total) * 100).toFixed(0);
};

const winRateColor = (rate: string | null) => {
  if (!rate) return 'text-gray-600';
  const n = parseInt(rate);
  return n >= 60 ? 'text-emerald-400' : n >= 45 ? 'text-yellow-400' : 'text-red-400';
};

// ─── Rule editor row ──────────────────────────────────────────────────────────

function RuleRow({ rule, index, engineId }: { rule: EngineRule; index: number; engineId: string }) {
  const { updateEngineRule } = usePredictionStore();
  const [expanded, setExpanded] = useState(false);
  const update = (patch: Partial<EngineRule>) => updateEngineRule(engineId, index, patch);

  return (
    <div className="border border-white/[0.06] rounded-lg overflow-hidden mb-2">
      <div className="flex items-center justify-between px-3 py-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-300 font-semibold">{marketLabels[rule.market] || rule.market}</span>
          {rule.ouLine !== undefined && <span className="text-[10px] text-gray-500">{rule.ouSide} {rule.ouLine}</span>}
          {rule.side && rule.market === '1x2' && (
            <span className="text-[10px] text-gray-500">{rule.side === '1' ? 'Home' : rule.side === '2' ? 'Away' : 'Draw'}</span>
          )}
          {rule.dcSide && <span className="text-[10px] text-gray-500">{rule.dcSide}</span>}
          {rule.csSide && <span className="text-[10px] text-gray-500">{rule.csSide}</span>}
          {rule.formSide && <span className="text-[10px] text-gray-500">{rule.formSide === '1' ? 'Home' : 'Away'} ≥{rule.minFormStreak}W</span>}
          {rule.requireValue && <span className="text-[10px] text-yellow-500 border border-yellow-800 px-1 rounded">VALUE</span>}
        </div>
        <div className="flex items-center gap-3 text-[10px] text-gray-500">
          <span>prob ≥ {(rule.minProbability * 100).toFixed(0)}%</span>
          <span>odds ≥ {rule.minOdds}</span>
          <span>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/[0.06] px-3 py-3 space-y-3 bg-black/30">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-[10px] text-gray-400">Min Probability</span>
              <span className="text-[10px] text-white font-mono">{(rule.minProbability * 100).toFixed(0)}%</span>
            </div>
            <input type="range" min="30" max="90" step="5" value={rule.minProbability * 100}
              onChange={e => update({ minProbability: parseInt(e.target.value) / 100 })}
              className="w-full accent-emerald-500" />
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-[10px] text-gray-400">Min Odds</span>
              <span className="text-[10px] text-white font-mono">{rule.minOdds.toFixed(2)}</span>
            </div>
            <input type="range" min="100" max="600" step="10" value={rule.minOdds * 100}
              onChange={e => update({ minOdds: parseInt(e.target.value) / 100 })}
              className="w-full accent-emerald-500" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] text-gray-400">Require Value Edge</div>
              <div className="text-[10px] text-gray-600">Only fire when model beats bookmaker</div>
            </div>
            <button onClick={() => update({ requireValue: !rule.requireValue })}
              className={`w-10 h-5 rounded-full transition-colors relative ${rule.requireValue ? 'bg-yellow-500' : 'bg-[#333]'}`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${rule.requireValue ? 'left-5' : 'left-0.5'}`} />
            </button>
          </div>
          {rule.requireValue && (
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[10px] text-gray-400">Edge Threshold</span>
                <span className="text-[10px] text-white font-mono">{(rule.edgeThreshold * 100).toFixed(0)}%</span>
              </div>
              <input type="range" min="0" max="20" step="1" value={rule.edgeThreshold * 100}
                onChange={e => update({ edgeThreshold: parseInt(e.target.value) / 100 })}
                className="w-full accent-yellow-500" />
            </div>
          )}
          {rule.market === 'over_under' && (
            <div className="flex gap-2 flex-wrap">
              {[0.5, 1.5, 2.5, 3.5, 4.5].map(line => (
                <button key={line} onClick={() => update({ ouLine: line })}
                  className={`px-2 py-1 rounded text-xs border transition ${rule.ouLine === line ? 'bg-white text-black border-white' : 'border-[#333] text-gray-500'}`}>
                  {line}
                </button>
              ))}
              <button onClick={() => update({ ouSide: rule.ouSide === 'over' ? 'under' : 'over' })}
                className="px-2 py-1 rounded text-xs border border-[#333] text-gray-400">
                {rule.ouSide === 'over' ? '⬆ Over' : '⬇ Under'}
              </button>
            </div>
          )}
          {rule.market === 'form' && (
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[10px] text-gray-400">Min Win Streak</span>
                <span className="text-[10px] text-white font-mono">{rule.minFormStreak ?? 3}</span>
              </div>
              <input type="range" min="2" max="8" step="1" value={rule.minFormStreak ?? 3}
                onChange={e => update({ minFormStreak: parseInt(e.target.value) })}
                className="w-full accent-purple-500" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Engine card ──────────────────────────────────────────────────────────────

function EngineCard({ engine }: { engine: PredictionEngine }) {
  const { signals } = usePredictionStore();
  const router = useIonRouter();
  const [rulesOpen, setRulesOpen] = useState(false);

  const rate = winRate(engine);
  const cat = categoryMeta[engine.category] || categoryMeta.value;
  const engineSignals = signals.filter(s => s.engineId === engine.id && s.status !== 'rejected');

  // Get learning data
  const learningData = getEngineLearningData(engine.id);
  const topRule = learningData?.rulePerformance
    .filter(r => r.totalFires >= 3)
    .sort((a, b) => b.winRate - a.winRate)[0];

  return (
    <div className={`border rounded-xl overflow-hidden mb-3 transition-all ${
      engine.alwaysOn ? cat.border : 'border-white/[0.05]'
    } bg-[#161616]`}>
      {/* Header row */}
      <div className="p-3">
        <div className="flex items-start gap-3">
          {/* Icon + always-on indicator */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            <span className="text-2xl">{engine.icon}</span>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Always On" />
              <span className="text-[8px] text-emerald-500 font-bold uppercase">ON</span>
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-white">{engine.name}</span>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${cat.color} ${cat.border} bg-transparent`}>
                {cat.label}
              </span>
              {rate && <span className={`text-xs font-mono ${winRateColor(rate)}`}>{rate}% win</span>}
              {learningData && learningData.totalPredictions > 0 && (
                <span className="text-[10px] text-gray-500">
                  {learningData.totalPredictions} predictions
                </span>
              )}
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">{engine.description}</div>

            {/* AI Learning indicator */}
            {topRule && (
              <div className="mt-1.5 flex items-center gap-2">
                <span className="text-[9px] text-emerald-400 font-semibold uppercase tracking-wide">AI Learning</span>
                <span className="text-[10px] text-gray-500">
                  Top rule: {(topRule.winRate * 100).toFixed(0)}% win rate ({topRule.totalFires} fires)
                </span>
              </div>
            )}

            {/* Stats row */}
            <div className="flex gap-3 mt-1.5 text-[10px] text-gray-600 flex-wrap">
              <span>{engine.rules.length} rule{engine.rules.length !== 1 ? 's' : ''}</span>
              {engine.stats.total > 0 && (
                <>
                  <span className="text-emerald-600">{engine.stats.wins}W</span>
                  <span className="text-red-600">{engine.stats.losses}L</span>
                  <span>{engine.stats.pending} pending</span>
                </>
              )}
              {engineSignals.length > 0 && (
                <span className={`${cat.color} font-semibold`}>{engineSignals.length} signal{engineSignals.length !== 1 ? 's' : ''} today</span>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setRulesOpen(!rulesOpen)}
            className="flex-1 py-1.5 rounded-lg text-[10px] font-semibold border border-white/[0.08] text-gray-500 hover:text-gray-300 transition"
          >
            {rulesOpen ? '▲ Hide Rules' : '▼ Edit Rules'}
          </button>
          <button
            onClick={() => router.push(`/engine/${engine.id}`, 'forward', 'push')}
            className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold border transition ${
              engine.alwaysOn
                ? `${cat.border} ${cat.color} hover:bg-white/5`
                : 'border-white/[0.06] text-gray-600'
            }`}
          >
            View Signals {engineSignals.length > 0 ? `(${engineSignals.length})` : '→'}
          </button>
        </div>
      </div>

      {/* Rules editor */}
      {rulesOpen && (
        <div className="border-t border-white/[0.06] px-3 py-3">
          <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-2">Rules</div>
          {engine.rules.map((rule, i) => (
            <RuleRow key={i} rule={rule} index={i} engineId={engine.id} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type CategoryFilter = 'all' | 'value' | 'goals' | 'result' | 'special' | 'sharp';

function Engines() {
  const { engines, signals, refreshEngineLearning } = usePredictionStore();
  const [catFilter, setCatFilter] = useState<CategoryFilter>('all');

  // Refresh learning data on mount
  useState(() => {
    refreshEngineLearning();
  });

  const totalWins = engines.reduce((a, e) => a + e.stats.wins, 0);
  const totalTotal = engines.reduce((a, e) => a + e.stats.total, 0);
  const overallRate = totalTotal > 0 ? ((totalWins / totalTotal) * 100).toFixed(0) : null;
  const activeCount = engines.filter(e => e.alwaysOn).length;
  const totalSignals = signals.filter(s => s.status !== 'rejected').length;

  const categories: { id: CategoryFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'value', label: '💰 Value' },
    { id: 'goals', label: '⚽ Goals' },
    { id: 'result', label: '🏆 Result' },
    { id: 'special', label: '✨ Special' },
    { id: 'sharp', label: '🔪 Sharp' },
  ];

  const filtered = catFilter === 'all' ? engines : engines.filter(e => e.category === catFilter);

  return (
    <IonPage>
      <IonContent style={{ '--background': '#0f0f0f' } as any} fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={e => { try { e.detail.complete(); } catch {} }}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="px-3 pt-4 pb-8">
          {/* Header */}
          <div className="mb-4">
            <div className="text-lg font-bold text-white">Prediction Engines</div>
            <div className="text-xs text-gray-500 mt-0.5">Tap an engine to see its signals for today</div>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-[#161616] border border-white/[0.07] rounded-xl p-3 text-center">
              <div className={`font-bold text-xl ${overallRate ? winRateColor(overallRate) : 'text-gray-600'}`}>
                {overallRate ? `${overallRate}%` : '—'}
              </div>
              <div className="text-[10px] text-gray-500">Win Rate</div>
            </div>
            <div className="bg-[#161616] border border-white/[0.07] rounded-xl p-3 text-center">
              <div className="text-white font-bold text-xl">{activeCount}</div>
              <div className="text-[10px] text-gray-500">Active</div>
            </div>
            <div className="bg-[#161616] border border-white/[0.07] rounded-xl p-3 text-center">
              <div className="text-emerald-400 font-bold text-xl">{totalSignals}</div>
              <div className="text-[10px] text-gray-500">Signals</div>
            </div>
          </div>

          {/* Category filter */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 mb-4 scrollbar-hide">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCatFilter(cat.id)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs border transition ${
                  catFilter === cat.id
                    ? 'bg-white text-black border-white font-semibold'
                    : 'border-white/[0.1] text-gray-500 hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Engine cards */}
          {filtered.map(engine => (
            <EngineCard key={engine.id} engine={engine} />
          ))}

          {/* How it works */}
          <div className="mt-2 bg-[#0d0d0d] border border-white/[0.06] rounded-xl p-3 text-xs text-gray-600">
            <div className="font-semibold text-gray-400 mb-1">🤖 AI-Powered Prediction Engines</div>
            <p>All engines are <span className="text-emerald-400 font-semibold">always on</span> — they continuously scan matches and learn from results. Each engine has strict rules and a dedicated page. When a match is graded, engines that satisfied their rules are automatically assigned and learn from the outcome. Value hunters use all engine context to provide the best predictions.</p>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}

export default Engines;
