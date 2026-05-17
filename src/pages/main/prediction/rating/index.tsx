import { useEffect, useMemo, useState } from 'react';
import { IonContent, IonPage, IonRefresher, IonRefresherContent, useIonRouter } from '@ionic/react';
import { usePredictionStore } from '../../../../prediction/usePredictionStore';
import { MatchSignal } from '../../../../prediction/engine';
import { getPredictionsToday } from '../../../../services/apis/footballApi';
import CustomHeader from '../../../../components/templates/header/header';

const formatTime = (ms: number) =>
  new Date(ms).toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

const statusStyle = (status: MatchSignal['status']) => {
  if (status === 'won') return 'text-emerald-400 border-emerald-700 bg-emerald-900/30';
  if (status === 'lost') return 'text-red-400 border-red-800 bg-red-900/20';
  if (status === 'accepted') return 'text-yellow-400 border-yellow-800 bg-yellow-900/20';
  return 'text-gray-500 border-[#333]';
};

const statusLabel = (status: MatchSignal['status']) => {
  if (status === 'won') return '✅ Won';
  if (status === 'lost') return '❌ Lost';
  if (status === 'accepted') return '⏳ Pending';
  return 'Skipped';
};

const confBadge = (conf: number) => {
  if (conf >= 65) return { color: 'text-emerald-400 border-emerald-700 bg-emerald-900/20', icon: '🔥', label: 'HIGH' };
  if (conf >= 50) return { color: 'text-yellow-400 border-yellow-800 bg-yellow-900/20', icon: '⚡', label: 'MEDIUM' };
  return { color: 'text-gray-500 border-[#333]', icon: '📉', label: 'LOW' };
};

const barColor = (conf: number) =>
  conf >= 65 ? 'bg-emerald-500' : conf >= 50 ? 'bg-yellow-500' : 'bg-gray-600';

type MainTab = 'predictions' | 'picks';
type PickFilter = 'all' | 'pending' | 'settled';
type ConfFilter = 'all' | 'high' | 'medium' | 'low';

function Rating() {
  const router = useIonRouter();
  const { acceptedPicks, engines, markResult } = usePredictionStore();

  const [mainTab, setMainTab] = useState<MainTab>('predictions');
  const [pickFilter, setPickFilter] = useState<PickFilter>('all');
  const [confFilter, setConfFilter] = useState<ConfFilter>('all');
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loadingPreds, setLoadingPreds] = useState(false);

  const fetchPredictions = async () => {
    setLoadingPreds(true);
    try {
      const res = await getPredictionsToday();
      setPredictions(res.predictions || []);
    } catch {
      setPredictions([]);
    } finally {
      setLoadingPreds(false);
    }
  };

  useEffect(() => { fetchPredictions(); }, []);

  const refresh = async (e: CustomEvent) => {
    try { await fetchPredictions(); } finally { try { e.detail.complete(); } catch {} }
  };

  // ── Filter predictions by confidence ─────────────────────────────────────
  const filteredPredictions = useMemo(() => {
    if (confFilter === 'all') return predictions;
    return predictions.filter(p => {
      const conf = parseInt(p.best_pick?.confidence || 0);
      if (confFilter === 'high') return conf >= 65;
      if (confFilter === 'medium') return conf >= 50 && conf < 65;
      return conf < 50;
    });
  }, [predictions, confFilter]);

  // ── Picks ─────────────────────────────────────────────────────────────────
  const filteredPicks = useMemo(() => {
    if (pickFilter === 'pending') return acceptedPicks.filter(p => p.status === 'accepted');
    if (pickFilter === 'settled') return acceptedPicks.filter(p => p.status === 'won' || p.status === 'lost');
    return acceptedPicks;
  }, [acceptedPicks, pickFilter]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalPicks = acceptedPicks.length;
  const settled = acceptedPicks.filter(p => p.status === 'won' || p.status === 'lost');
  const wins = acceptedPicks.filter(p => p.status === 'won').length;
  const winRate = settled.length > 0 ? ((wins / settled.length) * 100).toFixed(0) : null;
  const roi = settled.length > 0
    ? settled.reduce((acc, p) => p.status === 'won' ? acc + (p.odds - 1) : acc - 1, 0) / settled.length
    : null;

  const highCount = predictions.filter(p => parseInt(p.best_pick?.confidence || 0) >= 65).length;
  const medCount = predictions.filter(p => { const c = parseInt(p.best_pick?.confidence || 0); return c >= 50 && c < 65; }).length;

  return (
    <IonPage>
      <IonContent style={{ '--background': '#111' } as any} fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={refresh}>
          <IonRefresherContent />
        </IonRefresher>

        <CustomHeader />

        <div className="px-3 pt-3 pb-6">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="bg-[#161616] border border-[#1e1e1e] rounded-lg p-2 text-center">
              <div className="text-white font-bold text-lg">{totalPicks}</div>
              <div className="text-[10px] text-gray-500">Picks</div>
            </div>
            <div className="bg-[#161616] border border-[#1e1e1e] rounded-lg p-2 text-center">
              <div className={`font-bold text-lg ${winRate ? (parseInt(winRate) >= 50 ? 'text-emerald-400' : 'text-red-400') : 'text-gray-600'}`}>
                {winRate ? `${winRate}%` : '-'}
              </div>
              <div className="text-[10px] text-gray-500">Win Rate</div>
            </div>
            <div className="bg-[#161616] border border-[#1e1e1e] rounded-lg p-2 text-center">
              <div className="text-emerald-400 font-bold text-lg">{wins}</div>
              <div className="text-[10px] text-gray-500">Wins</div>
            </div>
            <div className="bg-[#161616] border border-[#1e1e1e] rounded-lg p-2 text-center">
              <div className={`font-bold text-lg ${roi !== null ? (roi >= 0 ? 'text-emerald-400' : 'text-red-400') : 'text-gray-600'}`}>
                {roi !== null ? `${roi >= 0 ? '+' : ''}${(roi * 100).toFixed(0)}%` : '-'}
              </div>
              <div className="text-[10px] text-gray-500">ROI</div>
            </div>
          </div>

          {/* Main tabs */}
          <div className="flex gap-2 mb-4">
            {([
              { id: 'predictions' as const, label: '📊 Predictions', count: predictions.length },
              { id: 'picks' as const, label: '🎯 My Picks', count: totalPicks },
            ]).map(tab => (
              <button
                key={tab.id}
                onClick={() => setMainTab(tab.id)}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition ${
                  mainTab === tab.id ? 'bg-white text-black border-white' : 'border-[#333] text-gray-500'
                }`}
              >
                {tab.label} {tab.count > 0 && <span className="opacity-60">({tab.count})</span>}
              </button>
            ))}
          </div>

          {/* ── PREDICTIONS TAB ── */}
          {mainTab === 'predictions' && (
            <>
              {/* Confidence filter */}
              <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
                {([
                  { id: 'all' as const, label: 'All' },
                  { id: 'high' as const, label: `🔥 High (${highCount})` },
                  { id: 'medium' as const, label: `⚡ Medium (${medCount})` },
                  { id: 'low' as const, label: '📉 Low' },
                ]).map(f => (
                  <button
                    key={f.id}
                    onClick={() => setConfFilter(f.id)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs border transition ${
                      confFilter === f.id ? 'bg-white text-black border-white font-semibold' : 'border-[#333] text-gray-500'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {loadingPreds ? (
                <div className="text-center text-gray-500 text-xs mt-16">
                  <div className="text-2xl mb-2">⚙️</div>
                  Loading predictions...
                </div>
              ) : filteredPredictions.length === 0 ? (
                <div className="text-center text-gray-600 text-xs mt-16">
                  <div className="text-2xl mb-2">📭</div>
                  No predictions yet. Enrichment runs automatically in the background.
                </div>
              ) : (
                filteredPredictions.map((pred, idx) => {
                  const conf = parseInt(pred.best_pick?.confidence || 0);
                  const badge = confBadge(conf);
                  const picks: any[] = pred.picks || [];
                  return (
                    <div
                      key={pred.match_id || idx}
                      className="border border-[#1e1e1e] bg-[#161616] rounded-xl p-3 mb-2 cursor-pointer hover:border-[#2a2a2a] transition"
                      onClick={() => router.push(`/match/${pred.match_id}`, 'forward', 'push')}
                    >
                      {/* Rank + badge */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-600 font-mono">#{idx + 1}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${badge.color}`}>
                            {badge.icon} {badge.label}
                          </span>
                          {pred.league_name && (
                            <span className="text-[10px] text-gray-600 truncate max-w-[100px]">{pred.league_name}</span>
                          )}
                        </div>
                        <span className="text-white font-bold text-base">{conf}%</span>
                      </div>

                      {/* Match name */}
                      <div className="text-white text-sm font-semibold truncate mb-1">{pred.match_name}</div>

                      {/* Best pick */}
                      <div className="text-xs text-gray-400 mb-2">
                        {pred.best_pick?.type} → <span className="text-white font-semibold">{pred.best_pick?.selection}</span>
                      </div>

                      {/* Assurance bar */}
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="flex-1 bg-[#222] rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full ${barColor(conf)}`} style={{ width: `${conf}%` }} />
                        </div>
                        <span className="text-xs font-bold text-white shrink-0">{conf}%</span>
                      </div>

                      {/* All picks */}
                      {picks.length > 1 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {picks.slice(0, 4).map((pick, i) => (
                            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-[#222] text-gray-400">
                              {pick.selection} <span className="text-gray-600">({pick.confidence}%)</span>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Reason */}
                      {pred.best_pick?.reason && (
                        <div className="text-[10px] text-gray-600 mt-1.5 truncate">{pred.best_pick.reason}</div>
                      )}
                    </div>
                  );
                })
              )}
            </>
          )}

          {/* ── PICKS TAB ── */}
          {mainTab === 'picks' && (
            <>
              {/* Engine breakdown */}
              {engines.some(e => e.stats.total > 0) && (
                <div className="bg-[#161616] border border-[#1e1e1e] rounded-xl p-3 mb-4">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-2">Engine Performance</div>
                  {engines.filter(e => e.stats.total > 0).map(engine => {
                    const rate = engine.stats.total > 0
                      ? ((engine.stats.wins / engine.stats.total) * 100).toFixed(0)
                      : null;
                    return (
                      <div key={engine.id} className="mb-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-300">{engine.name}</span>
                          <span className={rate && parseInt(rate) >= 50 ? 'text-emerald-400' : 'text-red-400'}>
                            {rate ? `${rate}%` : '-'} ({engine.stats.wins}W / {engine.stats.losses}L)
                          </span>
                        </div>
                        <div className="w-full bg-[#222] rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${rate && parseInt(rate) >= 50 ? 'bg-emerald-500' : 'bg-red-500'}`}
                            style={{ width: rate ? `${rate}%` : '0%' }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Filter tabs */}
              <div className="flex gap-2 mb-3">
                {([
                  { id: 'all' as const, label: 'All', count: totalPicks },
                  { id: 'pending' as const, label: '⏳ Pending', count: acceptedPicks.filter(p => p.status === 'accepted').length },
                  { id: 'settled' as const, label: '✅ Settled', count: settled.length },
                ]).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setPickFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-full text-xs border transition ${
                      pickFilter === tab.id ? 'bg-white text-black border-white font-semibold' : 'border-[#333] text-gray-500'
                    }`}
                  >
                    {tab.label} {tab.count > 0 && <span className="opacity-70">({tab.count})</span>}
                  </button>
                ))}
              </div>

              {filteredPicks.length === 0 ? (
                <div className="text-center text-gray-600 text-xs mt-16">
                  <div className="text-2xl mb-2">📋</div>
                  {pickFilter === 'pending'
                    ? 'No pending picks. Accept signals from the Suggestions tab.'
                    : 'No picks here yet.'}
                </div>
              ) : (
                filteredPicks.map(pick => (
                  <div
                    key={`${pick.matchId}-${pick.engineId}-${pick.market}`}
                    className={`border rounded-xl p-3 mb-2 ${statusStyle(pick.status)}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-sm font-semibold truncate">{pick.matchName}</div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {pick.market} → <span className="text-white font-semibold">{pick.pick}</span>
                        </div>
                        <div className="text-[10px] text-gray-600 mt-1">{formatTime(pick.startTime)}</div>
                        <div className="text-[10px] text-gray-600">{pick.engineName}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-white font-bold text-lg">{pick.odds.toFixed(2)}</div>
                        <div className={`text-[10px] px-1.5 py-0.5 rounded border mt-1 ${statusStyle(pick.status)}`}>
                          {statusLabel(pick.status)}
                        </div>
                      </div>
                    </div>

                    {pick.status === 'accepted' && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => markResult(pick.matchId, pick.engineId, pick.market, 'won')}
                          className="flex-1 py-1.5 rounded border border-emerald-700 text-emerald-400 text-xs font-semibold hover:bg-emerald-900 transition"
                        >
                          ✅ Mark Won
                        </button>
                        <button
                          onClick={() => router.push(`/match/${pick.matchId}`, 'forward', 'push')}
                          className="px-3 py-1.5 rounded border border-[#333] text-gray-500 text-xs hover:bg-[#1a1a1a] transition"
                        >
                          👁
                        </button>
                        <button
                          onClick={() => markResult(pick.matchId, pick.engineId, pick.market, 'lost')}
                          className="flex-1 py-1.5 rounded border border-red-800 text-red-400 text-xs font-semibold hover:bg-red-900 transition"
                        >
                          ❌ Mark Lost
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}

export default Rating;
