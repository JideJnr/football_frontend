import { useState } from 'react';
import { IonContent, IonPage, IonRefresher, IonRefresherContent } from '@ionic/react';
import { usePredictionStore } from '../../../../prediction/usePredictionStore';
import { PredictionEngine, EngineRule } from '../../../../prediction/engine';
import CustomHeader from '../../../../components/templates/header/header';

const marketLabels: Record<string, string> = {
  '1x2': '1X2',
  'over_under': 'Over/Under',
  'gg_ng': 'GG/NG',
  'double_chance': 'Double Chance',
  'ht_1x2': 'HT 1X2',
  'corners': 'Corners',
};

const winRate = (e: PredictionEngine) => {
  if (e.stats.total === 0) return null;
  return ((e.stats.wins / e.stats.total) * 100).toFixed(0);
};

const winRateColor = (rate: string | null) => {
  if (!rate) return 'text-gray-600';
  const n = parseInt(rate);
  if (n >= 60) return 'text-emerald-400';
  if (n >= 45) return 'text-yellow-400';
  return 'text-red-400';
};

function RuleRow({ rule, index, engineId }: { rule: EngineRule; index: number; engineId: string }) {
  const { updateEngineRule } = usePredictionStore();
  const [expanded, setExpanded] = useState(false);

  const update = (patch: Partial<EngineRule>) => updateEngineRule(engineId, index, patch);

  return (
    <div className="border border-[#2a2a2a] rounded-lg overflow-hidden mb-2">
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-300 font-semibold">{marketLabels[rule.market] || rule.market}</span>
          {rule.ouLine !== undefined && (
            <span className="text-[10px] text-gray-500">{rule.ouSide} {rule.ouLine}</span>
          )}
          {rule.side && rule.market === '1x2' && (
            <span className="text-[10px] text-gray-500">
              {rule.side === '1' ? 'Home' : rule.side === '2' ? 'Away' : 'Draw'}
            </span>
          )}
          {rule.requireValue && (
            <span className="text-[10px] text-yellow-500 border border-yellow-800 px-1 rounded">VALUE</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-[10px] text-gray-500">
          <span>prob ≥ {(rule.minProbability * 100).toFixed(0)}%</span>
          <span>odds ≥ {rule.minOdds}</span>
          <span>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[#2a2a2a] px-3 py-3 space-y-3 bg-[#0d0d0d]">
          {/* Min Probability */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-[10px] text-gray-400">Min Probability</span>
              <span className="text-[10px] text-white font-mono">{(rule.minProbability * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range" min="30" max="90" step="5"
              value={rule.minProbability * 100}
              onChange={(e) => update({ minProbability: parseInt(e.target.value) / 100 })}
              className="w-full accent-emerald-500"
            />
          </div>

          {/* Min Odds */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-[10px] text-gray-400">Min Odds</span>
              <span className="text-[10px] text-white font-mono">{rule.minOdds.toFixed(2)}</span>
            </div>
            <input
              type="range" min="100" max="500" step="10"
              value={rule.minOdds * 100}
              onChange={(e) => update({ minOdds: parseInt(e.target.value) / 100 })}
              className="w-full accent-emerald-500"
            />
          </div>

          {/* Require Value toggle */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] text-gray-400">Require Value Edge</div>
              <div className="text-[10px] text-gray-600">Only fire when model beats bookmaker</div>
            </div>
            <button
              onClick={() => update({ requireValue: !rule.requireValue })}
              className={`w-10 h-5 rounded-full transition-colors relative ${
                rule.requireValue ? 'bg-yellow-500' : 'bg-[#333]'
              }`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                rule.requireValue ? 'left-5' : 'left-0.5'
              }`} />
            </button>
          </div>

          {/* Edge threshold (only when requireValue) */}
          {rule.requireValue && (
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[10px] text-gray-400">Edge Threshold</span>
                <span className="text-[10px] text-white font-mono">{(rule.edgeThreshold * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range" min="0" max="20" step="1"
                value={rule.edgeThreshold * 100}
                onChange={(e) => update({ edgeThreshold: parseInt(e.target.value) / 100 })}
                className="w-full accent-yellow-500"
              />
              <div className="text-[10px] text-gray-600 mt-1">
                Model must beat implied prob by at least {(rule.edgeThreshold * 100).toFixed(0)}%
              </div>
            </div>
          )}

          {/* O/U line selector */}
          {rule.market === 'over_under' && (
            <div className="flex gap-2 flex-wrap">
              {[0.5, 1.5, 2.5, 3.5, 4.5].map((line) => (
                <button
                  key={line}
                  onClick={() => update({ ouLine: line })}
                  className={`px-2 py-1 rounded text-xs border transition ${
                    rule.ouLine === line
                      ? 'bg-white text-black border-white'
                      : 'border-[#333] text-gray-500'
                  }`}
                >
                  {line}
                </button>
              ))}
              <button
                onClick={() => update({ ouSide: rule.ouSide === 'over' ? 'under' : 'over' })}
                className="px-2 py-1 rounded text-xs border border-[#333] text-gray-400"
              >
                {rule.ouSide === 'over' ? '⬆ Over' : '⬇ Under'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EngineCard({ engine }: { engine: PredictionEngine }) {
  const { toggleEngine } = usePredictionStore();
  const [expanded, setExpanded] = useState(false);
  const rate = winRate(engine);

  return (
    <div className={`border rounded-xl overflow-hidden mb-3 transition-all ${
      engine.enabled ? 'border-emerald-800' : 'border-[#1e1e1e]'
    } bg-[#161616]`}>
      {/* Engine header */}
      <div className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded(!expanded)}>
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`text-sm font-bold ${engine.enabled ? 'text-white' : 'text-gray-500'}`}>
                {engine.name}
              </span>
              {rate && (
                <span className={`text-xs font-mono ${winRateColor(rate)}`}>{rate}% win</span>
              )}
            </div>
            <div className="text-[11px] text-gray-500">{engine.description}</div>
            <div className="flex gap-3 mt-2 text-[10px] text-gray-600">
              <span>{engine.rules.length} rule{engine.rules.length !== 1 ? 's' : ''}</span>
              {engine.stats.total > 0 && (
                <>
                  <span className="text-emerald-600">{engine.stats.wins}W</span>
                  <span className="text-red-600">{engine.stats.losses}L</span>
                  <span className="text-gray-600">{engine.stats.pending} pending</span>
                </>
              )}
            </div>
          </div>

          {/* Toggle */}
          <button
            onClick={() => toggleEngine(engine.id)}
            className={`ml-3 w-12 h-6 rounded-full transition-colors relative shrink-0 ${
              engine.enabled ? 'bg-emerald-600' : 'bg-[#333]'
            }`}
          >
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
              engine.enabled ? 'left-7' : 'left-1'
            }`} />
          </button>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-[10px] text-gray-600 hover:text-gray-400 transition"
        >
          {expanded ? '▲ Hide rules' : '▼ Edit rules'}
        </button>
      </div>

      {/* Rules */}
      {expanded && (
        <div className="border-t border-[#1e1e1e] px-3 py-3">
          <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-2">Rules</div>
          {engine.rules.map((rule, i) => (
            <RuleRow key={i} rule={rule} index={i} engineId={engine.id} />
          ))}
        </div>
      )}
    </div>
  );
}

function Engines() {
  const { engines } = usePredictionStore();

  const refresh = (e: CustomEvent) => {
    try { e.detail.complete(); } catch {}
  };

  const totalWins = engines.reduce((a, e) => a + e.stats.wins, 0);
  const totalTotal = engines.reduce((a, e) => a + e.stats.total, 0);
  const overallRate = totalTotal > 0 ? ((totalWins / totalTotal) * 100).toFixed(0) : null;

  return (
    <IonPage>
      <IonContent style={{ '--background': '#111' } as any} fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={refresh}>
          <IonRefresherContent />
        </IonRefresher>

        <CustomHeader />

        <div className="px-3 pt-3 pb-6">
          {/* Overall stats */}
          {overallRate && (
            <div className="bg-[#161616] border border-[#1e1e1e] rounded-xl p-3 mb-4 flex justify-around text-center">
              <div>
                <div className="text-emerald-400 font-bold text-xl">{overallRate}%</div>
                <div className="text-[10px] text-gray-500">Overall Win Rate</div>
              </div>
              <div>
                <div className="text-white font-bold text-xl">{totalTotal}</div>
                <div className="text-[10px] text-gray-500">Total Picks</div>
              </div>
              <div>
                <div className="text-white font-bold text-xl">{engines.filter((e) => e.enabled).length}</div>
                <div className="text-[10px] text-gray-500">Active Engines</div>
              </div>
            </div>
          )}

          <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-3 px-1">
            Your Prediction Engines — toggle on/off, tune rules
          </div>

          {engines.map((engine) => (
            <EngineCard key={engine.id} engine={engine} />
          ))}

          <div className="mt-4 bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl p-3 text-xs text-gray-600">
            <div className="font-semibold text-gray-400 mb-1">💡 How engines work</div>
            <p>Each engine scans all today's matches and fires when a match meets its rules. Value edge = (model probability × odds) − 1. Positive edge means the bookmaker is underpricing the outcome.</p>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}

export default Engines;
