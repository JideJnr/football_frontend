import { useState } from 'react';
import { IonContent, IonPage, IonRefresher, IonRefresherContent } from '@ionic/react';
import { useIonRouter } from '@ionic/react';
import { usePredictionStore } from '../../../../prediction/usePredictionStore';
import { MatchSignal } from '../../../../prediction/engine';
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

function Rating() {
  const router = useIonRouter();
  const { acceptedPicks, engines, markResult } = usePredictionStore();
  const [filter, setFilter] = useState<'all' | 'pending' | 'settled'>('all');

  const refresh = (e: CustomEvent) => {
    try { e.detail.complete(); } catch {}
  };

  const filtered = acceptedPicks.filter((p) => {
    if (filter === 'pending') return p.status === 'accepted';
    if (filter === 'settled') return p.status === 'won' || p.status === 'lost';
    return true;
  });

  const totalPicks = acceptedPicks.length;
  const settled = acceptedPicks.filter((p) => p.status === 'won' || p.status === 'lost');
  const wins = acceptedPicks.filter((p) => p.status === 'won').length;
  const winRate = settled.length > 0 ? ((wins / settled.length) * 100).toFixed(0) : null;

  // ROI calculation: sum of (odds - 1) for wins, -1 for losses
  const roi = settled.length > 0
    ? settled.reduce((acc, p) => {
        if (p.status === 'won') return acc + (p.odds - 1);
        return acc - 1;
      }, 0) / settled.length
    : null;

  const tabs = [
    { id: 'all' as const, label: 'All', count: totalPicks },
    { id: 'pending' as const, label: '⏳ Pending', count: acceptedPicks.filter((p) => p.status === 'accepted').length },
    { id: 'settled' as const, label: '✅ Settled', count: settled.length },
  ];

  return (
    <IonPage>
      <IonContent style={{ '--background': '#111' } as any} fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={refresh}>
          <IonRefresherContent />
        </IonRefresher>

        <CustomHeader />

        <div className="px-3 pt-3 pb-6">
          {/* Stats summary */}
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

          {/* Engine breakdown */}
          {engines.some((e) => e.stats.total > 0) && (
            <div className="bg-[#161616] border border-[#1e1e1e] rounded-xl p-3 mb-4">
              <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-2">Engine Performance</div>
              {engines.filter((e) => e.stats.total > 0).map((engine) => {
                const rate = engine.stats.total > 0
                  ? ((engine.stats.wins / engine.stats.total) * 100).toFixed(0)
                  : null;
                const barWidth = rate ? `${rate}%` : '0%';
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
                        className={`h-1.5 rounded-full transition-all ${
                          rate && parseInt(rate) >= 50 ? 'bg-emerald-500' : 'bg-red-500'
                        }`}
                        style={{ width: barWidth }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Filter tabs */}
          <div className="flex gap-2 mb-3">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`px-3 py-1.5 rounded-full text-xs border transition ${
                  filter === tab.id
                    ? 'bg-white text-black border-white font-semibold'
                    : 'border-[#333] text-gray-500'
                }`}
              >
                {tab.label} {tab.count > 0 && <span className="opacity-70">({tab.count})</span>}
              </button>
            ))}
          </div>

          {/* Picks list */}
          {filtered.length === 0 ? (
            <div className="text-center text-gray-600 text-xs mt-16">
              <div className="text-2xl mb-2">📋</div>
              {filter === 'pending'
                ? 'No pending picks. Accept signals from the Suggestions tab.'
                : 'No picks here yet.'}
            </div>
          ) : (
            filtered.map((pick) => (
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

                {/* Mark result buttons — only for accepted/pending */}
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
        </div>
      </IonContent>
    </IonPage>
  );
}

export default Rating;
