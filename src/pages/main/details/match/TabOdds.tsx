import { useIonRouter } from '@ionic/react';
import { Sec, Row, Empty, val } from './shared';

const TabOdds = ({ m }: { m: any }) => {
  const router = useIonRouter();
  const odds = m?.odds_1x2 || {};
  const movement = m?.odds_movement;
  const markets: any[] = m?.all_markets || [];
  const hasAny = odds.home || markets.length > 0;
  const matchId = m?.sportybet_id ? String(m.sportybet_id) : '';

  if (!hasAny) return <Empty msg="No odds available" />;

  return (
    <div className="px-4 py-4 space-y-3">
      {/* 1X2 */}
      {(odds.home || odds.draw || odds.away) && (
        <Sec title="1X2">
          <div className="flex gap-2">
            {[{ l: '1', v: odds.home }, { l: 'X', v: odds.draw }, { l: '2', v: odds.away }].map(({ l, v }) => (
              <div key={l} className="flex-1 flex flex-col items-center py-2.5 rounded-xl border border-white/[0.07] bg-white/[0.03]">
                <span className="text-[10px] text-gray-500">{l}</span>
                <span className="text-sm font-bold text-white mt-0.5">{val(v)}</span>
              </div>
            ))}
          </div>
        </Sec>
      )}

      {/* 1X2 movement summary — tappable → full chart */}
      {movement?.snapshots > 0 && (
        <Sec title="Odds Movement">
          <Row label="Snapshots" value={movement.snapshots} />
          {movement.opening && (
            <>
              <div className="text-[10px] text-gray-600 uppercase tracking-wide pt-1">Opening</div>
              <Row label="Home" value={movement.opening.home} />
              <Row label="Draw" value={movement.opening.draw} />
              <Row label="Away" value={movement.opening.away} />
            </>
          )}
          {movement.current && (
            <>
              <div className="text-[10px] text-gray-600 uppercase tracking-wide pt-1">Current</div>
              <Row label="Home" value={movement.current.home} />
              <Row label="Draw" value={movement.current.draw} />
              <Row label="Away" value={movement.current.away} />
            </>
          )}
          {movement.movement && (
            <div className="flex justify-between items-center text-sm pt-2 border-t border-white/[0.06]">
              <span className="text-gray-500">Drift</span>
              <div className="flex gap-3 text-xs">
                {['home', 'draw', 'away'].map(k => {
                  const d = movement.movement[k];
                  return (
                    <span key={k} className={d === 'shortened' ? 'text-emerald-400 font-bold' : d === 'drifted' ? 'text-red-400 font-bold' : 'text-gray-600'}>
                      {d ?? '—'}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
          {movement.sharp_signal && <Row label="Sharp Signal" value={movement.sharp_signal} color="text-yellow-400 font-bold" />}
          {/* View full 1X2 chart */}
          {matchId && (
            <button
              onClick={() => router.push(`/match/${matchId}/odds/1x2`, 'forward', 'push')}
              className="w-full mt-1 py-2 rounded-lg text-xs font-semibold text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/10 transition"
            >
              View 1X2 Chart →
            </button>
          )}
        </Sec>
      )}

      {/* Per-market movement — each row navigates to its chart */}
      {movement?.markets?.length > 0 && (
        <Sec title={`Market Movement (${movement.market_snapshots || 0} snapshots)`}>
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {movement.markets.slice(0, 80).map((mk: any, i: number) => (
              <button
                key={i}
                onClick={() => matchId && router.push(`/match/${matchId}/odds/${i}`, 'forward', 'push')}
                className="w-full flex items-center justify-between gap-3 rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2.5 text-left hover:border-white/20 hover:bg-white/[0.05] transition active:scale-[0.99]"
              >
                <div className="min-w-0">
                  <div className="text-xs text-gray-300 truncate">{mk.market}{mk.specifier ? ` · ${mk.specifier}` : ''}</div>
                  <div className="text-[10px] text-gray-600 truncate">{mk.selection} · {mk.snapshots} snapshots</div>
                </div>
                <div className="text-right shrink-0 flex items-center gap-2">
                  <div>
                    <div className="text-xs font-semibold text-white tabular-nums">{mk.opening?.odds} → {mk.current?.odds}</div>
                    <div className={mk.movement === 'shortened' ? 'text-[10px] text-emerald-400' : mk.movement === 'drifted' ? 'text-[10px] text-red-400' : 'text-[10px] text-gray-500'}>
                      {mk.movement || 'stable'} {mk.delta != null ? `(${mk.delta > 0 ? '+' : ''}${mk.delta})` : ''}
                    </div>
                  </div>
                  <svg className="w-3.5 h-3.5 text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </Sec>
      )}

      {/* All markets (static, no navigation) */}
      {markets.filter((mk: any) => mk?.selections?.length > 0 && mk?.status !== 3).length > 0 && (
        <Sec title="All Markets">
          <div className="space-y-4">
            {markets
              .filter((mk: any) => mk?.selections?.length > 0 && mk?.status !== 3)
              .slice(0, 25)
              .map((mk: any, i: number) => (
                <div key={i}>
                  <div className="text-[10px] text-gray-600 uppercase tracking-wide mb-1.5">
                    {mk.name}{mk.specifier ? ` · ${mk.specifier}` : ''}
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {(mk.selections || []).map((sel: any, j: number) => (
                      <div key={j} className="flex flex-col items-center px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] min-w-[52px]">
                        <span className="text-[10px] text-gray-500">{sel.name}</span>
                        <span className="text-xs font-semibold text-white mt-0.5">{sel.odds}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </Sec>
      )}
    </div>
  );
};

export default TabOdds;
