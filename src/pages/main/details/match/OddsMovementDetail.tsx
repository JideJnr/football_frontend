import { IonContent, IonPage, useIonRouter } from '@ionic/react';
import { useParams, useLocation } from 'react-router';
import { useEffect, useMemo, useState } from 'react';
import { getMatchDetail as fetchMatchDetail } from '../../../../services/apis/footballApi';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtTime = (iso: string | undefined) => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch { return iso; }
};

const fmtDateTime = (iso: string | undefined) => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
};

const movementColor = (m: string | null | undefined) =>
  m === 'shortened' ? '#10b981' : m === 'drifted' ? '#f87171' : '#6b7280';

const movementLabel = (m: string | null | undefined) =>
  m === 'shortened' ? 'Shortened' : m === 'drifted' ? 'Drifted' : 'Stable';

const movementClass = (m: string | null | undefined) =>
  m === 'shortened' ? 'text-emerald-400' : m === 'drifted' ? 'text-red-400' : 'text-gray-500';

// ─── Multi-line SVG chart ─────────────────────────────────────────────────────

interface Series { label: string; color: string; values: number[] }

const MultiLineChart = ({ series, labels }: { series: Series[]; labels: string[] }) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const allValues = series.flatMap(s => s.values).filter(Number.isFinite);
  if (allValues.length === 0) return null;

  const W = 340, H = 160, PL = 36, PR = 12, PT = 12, PB = 28;
  const innerW = W - PL - PR;
  const innerH = H - PT - PB;

  const rawMin = Math.min(...allValues);
  const rawMax = Math.max(...allValues);
  const pad = (rawMax - rawMin) * 0.15 || 0.1;
  const lo = rawMin - pad;
  const hi = rawMax + pad;
  const span = hi - lo;

  const n = Math.max(...series.map(s => s.values.length));
  const toX = (i: number) => PL + (n > 1 ? (i / (n - 1)) * innerW : innerW / 2);
  const toY = (v: number) => PT + (1 - (v - lo) / span) * innerH;

  // Y-axis ticks
  const yTicks = [hi, (hi + lo) / 2, lo];

  // X-axis labels — show at most 5 evenly spaced
  const xStep = Math.max(1, Math.floor(n / 5));
  const xTicks = Array.from({ length: n }, (_, i) => i).filter(i => i % xStep === 0 || i === n - 1);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full select-none"
      style={{ height: 160 }}
      onMouseLeave={() => setHoverIdx(null)}
    >
      {/* Y grid + labels */}
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={PL} y1={toY(t)} x2={W - PR} y2={toY(t)} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
          <text x={PL - 4} y={toY(t) + 4} textAnchor="end" fontSize="8" fill="rgba(255,255,255,0.3)">{t.toFixed(2)}</text>
        </g>
      ))}

      {/* X-axis labels */}
      {xTicks.map(i => (
        <text key={i} x={toX(i)} y={H - 4} textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.25)">
          {fmtTime(labels[i])}
        </text>
      ))}

      {/* Hover vertical line */}
      {hoverIdx !== null && (
        <line
          x1={toX(hoverIdx)} y1={PT}
          x2={toX(hoverIdx)} y2={H - PB}
          stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3,3"
        />
      )}

      {/* Series */}
      {series.map(s => {
        if (s.values.length < 2) return null;
        const d = s.values.map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ');
        const area = `${d} L${toX(s.values.length - 1).toFixed(1)},${(H - PB).toFixed(1)} L${PL},${(H - PB).toFixed(1)} Z`;
        return (
          <g key={s.label}>
            <defs>
              <linearGradient id={`fill-${s.label}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity="0.12" />
                <stop offset="100%" stopColor={s.color} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={area} fill={`url(#fill-${s.label})`} />
            <path d={d} fill="none" stroke={s.color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
          </g>
        );
      })}

      {/* Hover dots + tooltip */}
      {hoverIdx !== null && series.map(s => {
        const v = s.values[hoverIdx];
        if (!Number.isFinite(v)) return null;
        return (
          <circle key={s.label}
            cx={toX(hoverIdx)} cy={toY(v)} r="4"
            fill={s.color} stroke="#0f0f0f" strokeWidth="1.5"
          />
        );
      })}

      {/* Invisible hover targets */}
      {Array.from({ length: n }, (_, i) => (
        <rect
          key={i}
          x={toX(i) - (innerW / n / 2)}
          y={PT}
          width={innerW / n}
          height={innerH}
          fill="transparent"
          onMouseEnter={() => setHoverIdx(i)}
          style={{ cursor: 'crosshair' }}
        />
      ))}
    </svg>
  );
};

// ─── Legend ───────────────────────────────────────────────────────────────────

const Legend = ({ items }: { items: { label: string; color: string; value?: number | null }[] }) => (
  <div className="flex gap-4 px-4 pb-3 flex-wrap">
    {items.map(({ label, color, value }) => (
      <div key={label} className="flex items-center gap-1.5">
        <span className="w-3 h-0.5 rounded-full inline-block" style={{ backgroundColor: color }} />
        <span className="text-[10px] text-gray-400">{label}</span>
        {value != null && <span className="text-[10px] font-bold tabular-nums" style={{ color }}>{value.toFixed(2)}</span>}
      </div>
    ))}
  </div>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

const OddsMovementDetail = () => {
  const params = useParams<{ matchId: string; index: string }>();
  const location = useLocation();

  // Parse match ID and odds index from the actual current pathname.
  // We parse from pathname directly because React Router v5 decodes %3A → :
  // which can confuse param extraction when the ID contains colons.
  const pathParts = location.pathname.split('/match/')[1]?.split('/odds/');
  const matchId = pathParts?.[0] ? decodeURIComponent(pathParts[0]) : (params.matchId || '');
  const indexParam = pathParts?.[1] ?? params.index ?? '';

  const router = useIonRouter();

  // Use local state — never touch the shared context so the match page behind us stays intact
  const [matchDetail, setMatchDetail] = useState<any | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!matchId) return;
    setMatchDetail(null);
    setLoadError(false);
    fetchMatchDetail(matchId)
      .then(res => setMatchDetail(res))
      .catch(() => setLoadError(true));
  }, [matchId]);

  // Determine mode: '1x2' for the 1X2 overview, or a numeric index for a specific market
  const is1x2 = indexParam === '1x2';
  const mkIndex = is1x2 ? -1 : parseInt(indexParam, 10);

  const movement = matchDetail?.odds_movement;

  // ── 1X2 mode: multi-line chart of home/draw/away over time ────────────────
  const series1x2 = useMemo<{ series: { label: string; color: string; values: number[] }[]; labels: string[] }>(() => {
    const raw: any[] = movement?.series || [];
    if (raw.length === 0) return { series: [], labels: [] };
    return {
      labels: raw.map((r: any) => r.time),
      series: [
        { label: 'Home (1)', color: '#10b981', values: raw.map((r: any) => Number(r.home)).filter(Number.isFinite) },
        { label: 'Draw (X)', color: '#6b7280', values: raw.map((r: any) => Number(r.draw)).filter(Number.isFinite) },
        { label: 'Away (2)', color: '#60a5fa', values: raw.map((r: any) => Number(r.away)).filter(Number.isFinite) },
      ].filter(s => s.values.length > 0),
    };
  }, [movement]);

  // ── Market mode: single-line chart for a specific market ──────────────────
  const mk = useMemo(() => {
    if (is1x2) return null;
    const markets: any[] = movement?.markets || [];
    return markets[mkIndex] ?? null;
  }, [movement, mkIndex, is1x2]);

  const mkSeries = useMemo(() => {
    if (!mk) return { series: [], labels: [] };
    const snaps: any[] = mk.snapshots_data || [];
    if (snaps.length === 0) {
      // fall back to opening/current pair
      const pts = [];
      if (mk.opening?.odds != null) pts.push({ time: mk.opening.time, odds: Number(mk.opening.odds) });
      if (mk.current?.odds != null) pts.push({ time: mk.current.time, odds: Number(mk.current.odds) });
      return {
        labels: pts.map(p => p.time),
        series: [{ label: mk.selection, color: movementColor(mk.movement), values: pts.map(p => p.odds) }],
      };
    }
    return {
      labels: snaps.map((s: any) => s.time),
      series: [{ label: mk.selection, color: movementColor(mk.movement), values: snaps.map((s: any) => Number(s.odds)) }],
    };
  }, [mk]);

  // ── Loading / not found states ────────────────────────────────────────────
  if (loadError) {
    return (
      <IonPage>
        <IonContent>
          <div className="flex flex-col items-center justify-center h-full gap-3 bg-[#0f0f0f]">
            <span className="text-2xl">⚠️</span>
            <span className="text-sm text-gray-500">Could not load match data</span>
            <button onClick={() => router.goBack()} className="text-xs text-emerald-400 underline">Go back</button>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (!matchDetail) {
    return (
      <IonPage>
        <IonContent>
          <div className="flex items-center justify-center h-full text-sm text-gray-500 bg-[#0f0f0f]">Loading…</div>
        </IonContent>
      </IonPage>
    );
  }

  if (!is1x2 && !mk) {
    return (
      <IonPage>
        <IonContent>
          <div className="flex flex-col items-center justify-center h-full gap-3 bg-[#0f0f0f]">
            <span className="text-2xl">📉</span>
            <span className="text-sm text-gray-500">Market not found</span>
            <button onClick={() => router.goBack()} className="text-xs text-emerald-400 underline">Go back</button>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const title = is1x2
    ? '1X2 Odds Movement'
    : `${mk.market}${mk.specifier ? ` · ${mk.specifier}` : ''}`;
  const subtitle = is1x2
    ? `${matchDetail.home_team} vs ${matchDetail.away_team}`
    : mk.selection;

  const activeSeries = is1x2 ? series1x2 : mkSeries;
  const snapshotCount = is1x2 ? (movement?.snapshots ?? 0) : (mk?.snapshots ?? 0);

  // Table rows
  const tableRows: { time: string; cols: { label: string; value: number | null; color: string }[] }[] = is1x2
    ? (movement?.series || []).map((r: any) => ({
        time: r.time,
        cols: [
          { label: '1', value: r.home != null ? Number(r.home) : null, color: '#10b981' },
          { label: 'X', value: r.draw != null ? Number(r.draw) : null, color: '#9ca3af' },
          { label: '2', value: r.away != null ? Number(r.away) : null, color: '#60a5fa' },
        ],
      }))
    : (mk?.snapshots_data?.length
        ? mk.snapshots_data.map((s: any) => ({
            time: s.time,
            cols: [{ label: mk.selection, value: Number(s.odds), color: movementColor(mk.movement) }],
          }))
        : [
            mk?.opening?.odds != null ? { time: mk.opening.time, cols: [{ label: 'Opening', value: Number(mk.opening.odds), color: movementColor(mk.movement) }] } : null,
            mk?.current?.odds != null ? { time: mk.current.time, cols: [{ label: 'Current', value: Number(mk.current.odds), color: movementColor(mk.movement) }] } : null,
          ].filter(Boolean) as any[]
      );

  return (
    <IonPage>
      <IonContent fullscreen className="ion-padding-0">
        <div className="min-h-full bg-[#0f0f0f] text-white pb-10">

          {/* Back bar */}
          <div className="sticky top-0 z-20 bg-[#0f0f0f]/95 border-b border-white/[0.06] px-4 py-3 backdrop-blur flex items-center gap-3">
            <button onClick={() => router.goBack()} className="text-xs font-semibold text-gray-400 hover:text-white shrink-0">
              ← Back
            </button>
            <span className="text-xs text-gray-600 truncate">{title}</span>
          </div>

          {/* Header */}
          <div className="px-4 pt-5 pb-3">
            <div className="text-base font-bold text-white">{title}</div>
            <div className="text-sm text-gray-400 mt-0.5">{subtitle}</div>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {!is1x2 && (
                <span className={`text-xs font-bold ${movementClass(mk.movement)}`}>
                  {movementLabel(mk.movement)}
                </span>
              )}
              {!is1x2 && mk.delta != null && (
                <span className={`text-xs tabular-nums ${mk.delta < 0 ? 'text-emerald-400' : mk.delta > 0 ? 'text-red-400' : 'text-gray-500'}`}>
                  {mk.delta > 0 ? `+${mk.delta}` : mk.delta}
                </span>
              )}
              <span className="text-xs text-gray-600">{snapshotCount} snapshot{snapshotCount !== 1 ? 's' : ''}</span>
              {is1x2 && movement?.sharp_signal && (
                <span className="text-xs font-bold text-yellow-400">{movement.sharp_signal}</span>
              )}
            </div>
          </div>

          {/* Chart card */}
          {activeSeries.series.length > 0 && activeSeries.labels.length >= 2 ? (
            <div className="mx-4 bg-[#161616] border border-white/[0.07] rounded-xl overflow-hidden mb-4">
              <div className="px-4 pt-3 pb-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                Odds Over Time
              </div>
              <div className="px-2 pt-1">
                <MultiLineChart series={activeSeries.series} labels={activeSeries.labels} />
              </div>
              <Legend
                items={activeSeries.series.map(s => ({
                  label: s.label,
                  color: s.color,
                  value: s.values[s.values.length - 1] ?? null,
                }))}
              />

              {/* Opening → Current summary strip */}
              {is1x2 ? (
                <div className="flex border-t border-white/[0.06]">
                  {[
                    { label: 'Home open', value: movement?.opening?.home, color: 'text-emerald-400' },
                    { label: 'Draw open', value: movement?.opening?.draw, color: 'text-gray-400' },
                    { label: 'Away open', value: movement?.opening?.away, color: 'text-blue-400' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex-1 flex flex-col items-center py-2 border-r border-white/[0.06] last:border-0">
                      <span className="text-[9px] text-gray-600">{label}</span>
                      <span className={`text-xs font-bold mt-0.5 tabular-nums ${color}`}>{value ?? '—'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex border-t border-white/[0.06]">
                  {[
                    { label: 'Opening', value: mk.opening?.odds },
                    { label: 'Current', value: mk.current?.odds },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex-1 flex flex-col items-center py-2.5 border-r border-white/[0.06] last:border-0">
                      <span className="text-[10px] text-gray-500">{label}</span>
                      <span className="text-sm font-bold text-white mt-0.5 tabular-nums">{value ?? '—'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="mx-4 bg-[#161616] border border-white/[0.07] rounded-xl px-4 py-6 mb-4 text-center">
              <span className="text-xs text-gray-600">Not enough data points to draw a chart yet</span>
            </div>
          )}

          {/* Snapshot table */}
          {tableRows.length > 0 && (
            <div className="mx-4 bg-[#161616] border border-white/[0.07] rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-white/[0.07] text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                Snapshot History
              </div>
              {/* Table header */}
              <div className="flex items-center px-4 py-1.5 border-b border-white/[0.04]">
                <span className="flex-1 text-[10px] text-gray-600 font-medium">Time</span>
                {tableRows[0]?.cols.map(c => (
                  <span key={c.label} className="w-14 text-right text-[10px] font-bold" style={{ color: c.color }}>{c.label}</span>
                ))}
              </div>
              {/* Rows — newest first */}
              <div className="divide-y divide-white/[0.03] max-h-[400px] overflow-y-auto">
                {[...tableRows].reverse().map((row, i) => (
                  <div key={i} className="flex items-center px-4 py-2">
                    <span className="flex-1 text-[11px] text-gray-500 tabular-nums">{fmtDateTime(row.time)}</span>
                    {row.cols.map(c => (
                      <span key={c.label} className="w-14 text-right text-xs font-semibold tabular-nums" style={{ color: c.value != null ? c.color : undefined }}>
                        {c.value != null ? c.value.toFixed(2) : '—'}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {tableRows.length === 0 && (
            <div className="mx-4 flex flex-col items-center justify-center py-12 gap-2">
              <span className="text-2xl">📉</span>
              <span className="text-xs text-gray-600">No snapshot data yet — check back after the next enrichment cycle</span>
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default OddsMovementDetail;
