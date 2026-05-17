import { IonContent, IonPage, useIonRouter } from '@ionic/react';
import { useParams } from 'react-router';
import { useEffect, useMemo } from 'react';
import { useFootballContext } from '../../../../contexts/useFootballContext';

// ─── Tiny SVG line chart ──────────────────────────────────────────────────────

const LineChart = ({ points, color = '#10b981' }: { points: number[]; color?: string }) => {
  if (points.length < 2) return null;

  const W = 320, H = 120, PAD = 16;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 0.01;

  // Add a small buffer so the line doesn't touch the edges
  const buf = range * 0.15;
  const lo = min - buf;
  const hi = max + buf;
  const span = hi - lo;

  const toX = (i: number) => PAD + (i / (points.length - 1)) * (W - PAD * 2);
  const toY = (v: number) => PAD + (1 - (v - lo) / span) * (H - PAD * 2);

  const d = points
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`)
    .join(' ');

  // Filled area under the line
  const area = `${d} L${toX(points.length - 1).toFixed(1)},${(H - PAD).toFixed(1)} L${PAD},${(H - PAD).toFixed(1)} Z`;

  // Y-axis labels (3 ticks)
  const ticks = [hi, (hi + lo) / 2, lo];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 120 }}>
      <defs>
        <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {ticks.map((t, i) => (
        <line
          key={i}
          x1={PAD} y1={toY(t).toFixed(1)}
          x2={W - PAD} y2={toY(t).toFixed(1)}
          stroke="rgba(255,255,255,0.05)" strokeWidth="1"
        />
      ))}

      {/* Y-axis tick labels */}
      {ticks.map((t, i) => (
        <text
          key={i}
          x={PAD - 4} y={Number(toY(t).toFixed(1)) + 4}
          textAnchor="end" fontSize="8" fill="rgba(255,255,255,0.3)"
        >
          {t.toFixed(2)}
        </text>
      ))}

      {/* Area fill */}
      <path d={area} fill="url(#chartFill)" />

      {/* Line */}
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

      {/* Dots */}
      {points.map((v, i) => (
        <circle key={i} cx={toX(i).toFixed(1)} cy={toY(v).toFixed(1)} r="3"
          fill={color} stroke="#0f0f0f" strokeWidth="1.5" />
      ))}
    </svg>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const OddsMovementDetail = () => {
  const params = useParams<{ id: string; index: string }>();
  const pathParts = window.location.pathname.split('/match/')[1]?.split('/odds/');
  const matchId = decodeURIComponent(pathParts?.[0] || params.id || '');
  const mkIndex = parseInt(pathParts?.[1] ?? params.index ?? '0', 10);

  const router = useIonRouter();
  const { getMatchDetail, matchDetail } = useFootballContext();

  useEffect(() => {
    if (matchId && !matchDetail) getMatchDetail(matchId);
  }, [matchId]);

  const mk = useMemo(() => {
    const markets: any[] = matchDetail?.odds_movement?.markets || [];
    return markets[mkIndex] ?? null;
  }, [matchDetail, mkIndex]);

  if (!matchDetail) {
    return (
      <IonPage>
        <IonContent>
          <div className="flex items-center justify-center h-full text-sm text-gray-500 bg-[#0f0f0f]">Loading…</div>
        </IonContent>
      </IonPage>
    );
  }

  if (!mk) {
    return (
      <IonPage>
        <IonContent>
          <div className="flex items-center justify-center h-full text-sm text-gray-500 bg-[#0f0f0f]">Market not found</div>
        </IonContent>
      </IonPage>
    );
  }

  // Build time-series from snapshots array or fall back to opening/current pair
  const snapshots: { time?: string; odds: number }[] = (() => {
    if (Array.isArray(mk.snapshots_data) && mk.snapshots_data.length > 0) {
      return mk.snapshots_data.map((s: any) => ({ time: s.time ?? s.timestamp, odds: Number(s.odds ?? s.value) }));
    }
    const pts: { time?: string; odds: number }[] = [];
    if (mk.opening?.odds != null) pts.push({ time: 'Opening', odds: Number(mk.opening.odds) });
    if (mk.current?.odds != null) pts.push({ time: 'Current', odds: Number(mk.current.odds) });
    return pts;
  })();

  const oddValues = snapshots.map(s => s.odds).filter(v => Number.isFinite(v));

  const drift = mk.movement === 'shortened'
    ? { label: 'Shortened', color: 'text-emerald-400' }
    : mk.movement === 'drifted'
    ? { label: 'Drifted', color: 'text-red-400' }
    : { label: 'Stable', color: 'text-gray-400' };

  const chartColor = mk.movement === 'shortened' ? '#10b981' : mk.movement === 'drifted' ? '#f87171' : '#6b7280';

  return (
    <IonPage>
      <IonContent fullscreen className="ion-padding-0">
        <div className="min-h-full bg-[#0f0f0f] text-white pb-10">

          {/* Back bar */}
          <div className="sticky top-0 z-20 bg-[#0f0f0f]/95 border-b border-white/[0.06] px-4 py-3 backdrop-blur flex items-center gap-3">
            <button onClick={() => router.goBack()} className="text-xs font-semibold text-gray-400 hover:text-white">
              ← Back
            </button>
            <span className="text-xs text-gray-600 truncate">{mk.market}{mk.specifier ? ` · ${mk.specifier}` : ''} — {mk.selection}</span>
          </div>

          {/* Header */}
          <div className="px-4 pt-5 pb-3">
            <div className="text-base font-bold text-white">{mk.market}{mk.specifier ? ` · ${mk.specifier}` : ''}</div>
            <div className="text-sm text-gray-400 mt-0.5">{mk.selection}</div>
            <div className="flex items-center gap-3 mt-2">
              <span className={`text-xs font-bold ${drift.color}`}>{drift.label}</span>
              {mk.delta != null && (
                <span className={`text-xs ${mk.delta > 0 ? 'text-red-400' : mk.delta < 0 ? 'text-emerald-400' : 'text-gray-500'}`}>
                  {mk.delta > 0 ? `+${mk.delta}` : mk.delta}
                </span>
              )}
              <span className="text-xs text-gray-600">{mk.snapshots} snapshot{mk.snapshots !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Chart */}
          {oddValues.length >= 2 && (
            <div className="mx-4 bg-[#161616] border border-white/[0.07] rounded-xl overflow-hidden mb-4">
              <div className="px-4 pt-3 pb-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Odds Movement</div>
              <div className="px-2 pb-3">
                <LineChart points={oddValues} color={chartColor} />
              </div>
              {/* Opening → Current summary */}
              <div className="flex border-t border-white/[0.06]">
                {[
                  { label: 'Opening', value: mk.opening?.odds },
                  { label: 'Current', value: mk.current?.odds },
                ].map(({ label, value }) => (
                  <div key={label} className="flex-1 flex flex-col items-center py-2.5 border-r border-white/[0.06] last:border-0">
                    <span className="text-[10px] text-gray-500">{label}</span>
                    <span className="text-sm font-bold text-white mt-0.5">{value ?? '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Snapshot table */}
          {snapshots.length > 0 && (
            <div className="mx-4 bg-[#161616] border border-white/[0.07] rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-white/[0.07] text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                Snapshots
              </div>
              <div className="divide-y divide-white/[0.04]">
                {snapshots.map((s, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-xs text-gray-500">{s.time ?? `#${i + 1}`}</span>
                    <span className="text-sm font-semibold text-white tabular-nums">{s.odds?.toFixed(2) ?? '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {snapshots.length === 0 && (
            <div className="mx-4 flex flex-col items-center justify-center py-12 gap-2">
              <span className="text-2xl">📉</span>
              <span className="text-xs text-gray-600">No snapshot data available</span>
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default OddsMovementDetail;
