import { IonContent, IonPage, IonRefresher, IonRefresherContent, useIonRouter } from "@ionic/react";
import { useCallback, useEffect, useState } from "react";
import api from "../../services/apis/footballApi";

// ── API calls ─────────────────────────────────────────────────────────────────
const fetchPerformance = () => api.get("/agent/analytics/performance").then(r => r.data);
const fetchRoi         = () => api.get("/agent/analytics/roi").then(r => r.data);
const fetchClv         = () => api.get("/analytics/clv?days=30").then(r => r.data);
const fetchLongshots   = () => api.get("/analytics/signal-matches", { params: { signal_name: "consensus_longshot_value", limit: 80 } }).then(r => r.data);
const runGrade         = (h = 24) => api.post(`/results/grade?hours_back=${h}`).then(r => r.data);
const runPurge         = () => api.post("/mongo/purge-junk-predictions").then(r => r.data);
const runComputeClv    = () => api.post("/analytics/clv/compute").then(r => r.data);

const familyForPickType = (pickType: string) => {
  const text = String(pickType || "").toLowerCase();
  if (text.includes("longshot")) return "longshot_value";
  if (text.includes("double")) return "double_chance";
  if (text.includes("goal") || text.includes("btts") || text.includes("over") || text.includes("under")) return "goals";
  if (text.includes("value")) return "value";
  return "all";
};

// ── Sub-components ────────────────────────────────────────────────────────────

const StatCard = ({ label, value, sub, tone = "text-white" }: { label: string; value: any; sub?: string; tone?: string }) => (
  <div className="rounded-xl border border-white/[0.07] bg-[#161616] p-3">
    <div className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</div>
    <div className={`text-2xl font-bold mt-1 ${tone}`}>{value ?? "—"}</div>
    {sub && <div className="text-[10px] text-gray-600 mt-0.5">{sub}</div>}
  </div>
);

const ResultBadge = ({ result }: { result: string }) => {
  const map: Record<string, string> = {
    win:  "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    loss: "bg-red-500/20 text-red-400 border-red-500/30",
    void: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  };
  return (
    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${map[result] ?? map.void}`}>
      {result}
    </span>
  );
};

// ── CLV mini spark-line ───────────────────────────────────────────────────────
const ClvSparkline = ({ data }: { data: { day: string; avg_clv: number }[] }) => {
  if (!data || data.length < 2) return null;
  const vals = data.map(d => d.avg_clv);
  const mn = Math.min(...vals);
  const mx = Math.max(...vals);
  const span = mx - mn || 0.1;
  const W = 280, H = 48, PL = 4, PR = 4, PT = 4, PB = 4;
  const iW = W - PL - PR;
  const iH = H - PT - PB;
  const toX = (i: number) => PL + (vals.length > 1 ? (i / (vals.length - 1)) * iW : iW / 2);
  const toY = (v: number) => PT + (1 - (v - mn) / span) * iH;
  const d = vals.map((v, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");
  const zeroY = toY(0);
  const positive = (vals[vals.length - 1] ?? 0) >= 0;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 48 }}>
      {/* Zero line */}
      {mn < 0 && mx > 0 && (
        <line x1={PL} y1={zeroY} x2={W - PR} y2={zeroY}
          stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="3,3" />
      )}
      <path d={d} fill="none"
        stroke={positive ? "#10b981" : "#f87171"}
        strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      {/* Last point dot */}
      <circle cx={toX(vals.length - 1)} cy={toY(vals[vals.length - 1])} r="3"
        fill={positive ? "#10b981" : "#f87171"} />
    </svg>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────

const Analytics = () => {
  const router = useIonRouter();
  const [perf, setPerf]       = useState<any>(null);
  const [roi, setRoi]         = useState<any>(null);
  const [clv, setClv]         = useState<any>(null);
  const [longshots, setLongshots] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [grading, setGrading] = useState(false);
  const [purging, setPurging] = useState(false);
  const [gradeMsg, setGradeMsg] = useState("");
  const [error, setError]     = useState("");

  const handleGrade = async () => {
    setGrading(true);
    setGradeMsg("");
    try {
      const res = await runGrade(48);
      await runComputeClv();
      setGradeMsg(`${res.predictions_graded ?? 0} graded · ${res.matches_archived ?? 0} archived · ${res.results_fetched ?? 0} results fetched`);
      await load();
    } catch (e: any) {
      setGradeMsg(e?.response?.data?.detail || e?.message || "Grade failed");
    } finally {
      setGrading(false);
    }
  };

  const handlePurge = async () => {
    if (!window.confirm("Delete all no_bet, low-confidence and stale pending predictions?")) return;
    setPurging(true);
    setGradeMsg("");
    try {
      const res = await runPurge();
      setGradeMsg(`Purged ${res.total_deleted} junk predictions (no_bet: ${res.deleted_no_bet}, low conf: ${res.deleted_low_confidence}, stale: ${res.deleted_stale_pending})`);
      await load();
    } catch (e: any) {
      setGradeMsg(e?.response?.data?.detail || e?.message || "Purge failed");
    } finally {
      setPurging(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [p, r, c, l] = await Promise.all([fetchPerformance(), fetchRoi(), fetchClv().catch(() => null), fetchLongshots().catch(() => null)]);
      setPerf(p);
      setRoi(r);
      setClv(c);
      setLongshots(l);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const graded    = perf?.graded ?? 0;
  const wins      = perf?.wins ?? 0;
  const losses    = perf?.losses ?? 0;
  const pending   = perf?.pending ?? 0;
  const winPct    = perf?.win_percent;
  const roiPct    = roi?.odds_roi_percent ?? roi?.even_money_roi_percent ?? roi?.roi_percent ?? 0;
  const roiBasis  = roi?.roi_basis === "entry_odds" ? "entry odds" : "break-even proxy";
  const byType    = perf?.by_type ?? [];
  const recent    = perf?.recent ?? [];
  const byConf    = roi?.by_confidence ?? {};

  // CLV derived values
  const avgClv        = clv?.avg_clv_percent ?? null;
  const posClvRate    = clv?.positive_clv_rate ?? null;
  const clvEntries    = clv?.total_entries ?? 0;
  const edgeQuality   = clv?.edge_quality ?? null;
  const clvByBand     = clv?.by_confidence_band ?? [];
  const clvByType     = clv?.by_pick_type ?? [];
  const clvDaily      = clv?.daily_trend ?? [];
  const clvRecent     = clv?.recent ?? [];
  const longshotItems = longshots?.items ?? [];

  const edgeColor = (q: string | null) => {
    if (q === "strong_edge")   return "text-emerald-400";
    if (q === "positive_edge") return "text-emerald-300";
    if (q === "skill_present") return "text-yellow-400";
    if (q === "marginal")      return "text-gray-400";
    return "text-red-400";
  };
  const edgeLabel = (q: string | null) => {
    if (q === "strong_edge")   return "Strong Edge";
    if (q === "positive_edge") return "Positive Edge";
    if (q === "skill_present") return "Skill Present";
    if (q === "marginal")      return "Marginal";
    if (q === "no_edge")       return "No Edge";
    return "—";
  };

  const openMarketExplorer = (pickType: string) => {
    const params = new URLSearchParams({
      preset: familyForPickType(pickType),
      model: "all",
      pick_type: pickType || "",
    });
    router.push(`/prediction/model-explorer?${params.toString()}`, "forward", "push");
  };

  return (
    <IonPage>
      <IonContent fullscreen style={{ "--background": "#0f0f0f" } as any}>
        <IonRefresher slot="fixed" onIonRefresh={async e => { await load(); e.detail.complete(); }}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="min-h-full bg-[#0f0f0f] text-white pb-10">

          {/* Header */}
          <div className="sticky top-0 z-20 bg-[#0f0f0f]/95 border-b border-white/[0.06] px-4 py-3 backdrop-blur flex items-center justify-between">
            <button onClick={() => router.goBack()} className="text-xs font-semibold text-gray-400 hover:text-white">
              ← Back
            </button>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Analytics</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePurge}
                disabled={purging}
                className="text-xs font-semibold px-3 py-1 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 disabled:opacity-40 transition-all"
              >
                {purging ? "Purging…" : "Purge"}
              </button>
              <button
                onClick={handleGrade}
                disabled={grading}
                className="text-xs font-semibold px-3 py-1 rounded-lg border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-40 transition-all"
              >
                {grading ? "Grading…" : "Grade"}
              </button>
            </div>
          </div>

          <div className="px-4 py-4 space-y-5">

            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-300">{error}</div>
            )}
            {gradeMsg && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-300">✓ {gradeMsg}</div>
            )}
            {loading && !perf && (
              <div className="flex items-center justify-center py-16">
                <div className="w-7 h-7 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
              </div>
            )}

            {/* ── Overview stats ── */}
            {perf && (
              <div className="grid grid-cols-2 gap-2">
                <StatCard
                  label="Win Rate"
                  value={winPct != null ? `${winPct}%` : "—"}
                  sub={`${wins}W / ${losses}L`}
                  tone={winPct != null ? (winPct >= 50 ? "text-emerald-400" : "text-red-400") : "text-gray-400"}
                />
                <StatCard
                  label="ROI"
                  value={`${roiPct}%`}
                  sub={`${roi?.settled_predictions ?? roi?.total_predictions ?? 0} settled · ${roiBasis}`}
                  tone={roiPct >= 0 ? "text-emerald-400" : "text-red-400"}
                />
                <StatCard label="Graded" value={graded} sub="predictions resolved" />
                <StatCard label="Awaiting Result" value={pending} sub="not due or still live" tone="text-yellow-400" />
              </div>
            )}

            {/* ── ROI by confidence band ── */}
            {Object.keys(byConf).length > 0 && (
              <section className="rounded-xl border border-white/[0.07] bg-[#161616] overflow-hidden">
                <div className="px-4 py-2.5 border-b border-white/[0.07] text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  Win Rate by Confidence
                </div>
                <div className="p-3 grid grid-cols-4 gap-2">
                  {Object.entries(byConf).map(([band, data]: any) => (
                    <div key={band} className="rounded-lg bg-white/[0.04] px-2 py-2.5 text-center">
                      <div className="text-[10px] text-gray-500 mb-1">{band}%</div>
                      <div className={`text-sm font-bold ${data.win_rate >= 50 ? "text-emerald-400" : "text-red-400"}`}>
                        {data.win_rate}%
                      </div>
                      <div className="text-[10px] text-gray-600 mt-0.5">{data.count} picks</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="rounded-xl border border-white/[0.07] bg-[#161616] overflow-hidden">
              <button
                onClick={() => router.push('/prediction/model-explorer?preset=longshot_value&model=longshot&pick_type=consensus_longshot_value&min_samples=1', 'forward', 'push')}
                className="w-full px-4 py-3 border-b border-white/[0.07] flex items-center justify-between text-left"
              >
                <div>
                  <div className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest">Consensus Longshot Value</div>
                  <div className="text-[11px] text-gray-500 mt-0.5">All models agree, market still prices the side at 3.00+</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-white">{longshots?.count ?? 0}</div>
                  <div className="text-[10px] text-gray-600">
                    {longshots?.accuracy != null ? `${longshots.accuracy}%` : 'building'}
                  </div>
                </div>
              </button>
              <div className="divide-y divide-white/[0.04] max-h-72 overflow-y-auto">
                {longshotItems.length ? longshotItems.slice(0, 12).map((item: any) => (
                  <button
                    key={`${item.id}-${item.match_id}`}
                    onClick={() => item.match_id && router.push(`/match/${encodeURIComponent(item.match_id)}`, 'forward', 'push')}
                    className="w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-white/[0.03]"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-white truncate">{item.match_name || item.match_id}</div>
                      <div className="text-[10px] text-gray-600 truncate">
                        {item.selection} @ {item.signal?.decimal_odds ?? '-'} · edge {item.signal?.edge_percent ?? '-'}% · {item.league_name || item.country_name || 'Competition'}
                      </div>
                    </div>
                    <div className={`text-xs font-bold ${item.result === 'win' ? 'text-emerald-400' : item.result === 'loss' ? 'text-red-400' : 'text-gray-500'}`}>
                      {item.result || 'open'}
                    </div>
                  </button>
                )) : (
                  <div className="px-4 py-5 text-xs text-gray-600">No matches have triggered this signal yet. It will populate as new predictions are recorded.</div>
                )}
              </div>
            </section>

            {/* ── CLV Section ── */}
            {clvEntries > 0 && (
              <section className="rounded-xl border border-white/[0.07] bg-[#161616] overflow-hidden">
                <div className="px-4 py-2.5 border-b border-white/[0.07] flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Closing Line Value</span>
                  <span className="text-[10px] text-gray-600">{clvEntries} entries · 30d</span>
                </div>

                {/* Top CLV stats */}
                <div className="grid grid-cols-3 divide-x divide-white/[0.06] border-b border-white/[0.06]">
                  <div className="flex flex-col items-center py-3 px-2">
                    <span className="text-[10px] text-gray-500 mb-1">Avg CLV</span>
                    <span className={`text-lg font-bold tabular-nums ${(avgClv ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {avgClv != null ? `${avgClv > 0 ? "+" : ""}${avgClv.toFixed(1)}%` : "—"}
                    </span>
                  </div>
                  <div className="flex flex-col items-center py-3 px-2">
                    <span className="text-[10px] text-gray-500 mb-1">Beat Market</span>
                    <span className={`text-lg font-bold tabular-nums ${(posClvRate ?? 0) >= 50 ? "text-emerald-400" : "text-red-400"}`}>
                      {posClvRate != null ? `${posClvRate}%` : "—"}
                    </span>
                  </div>
                  <div className="flex flex-col items-center py-3 px-2">
                    <span className="text-[10px] text-gray-500 mb-1">Edge Quality</span>
                    <span className={`text-xs font-bold ${edgeColor(edgeQuality)}`}>
                      {edgeLabel(edgeQuality)}
                    </span>
                  </div>
                </div>

                {/* Sparkline trend */}
                {clvDaily.length >= 2 && (
                  <div className="px-3 pt-3 pb-1">
                    <div className="text-[10px] text-gray-600 mb-1">Daily CLV trend</div>
                    <ClvSparkline data={clvDaily} />
                    <div className="flex justify-between text-[9px] text-gray-700 mt-0.5">
                      <span>{clvDaily[0]?.day?.slice(5)}</span>
                      <span>{clvDaily[clvDaily.length - 1]?.day?.slice(5)}</span>
                    </div>
                  </div>
                )}

                {/* CLV by confidence band */}
                {clvByBand.length > 0 && (
                  <div className="border-t border-white/[0.06] px-4 py-3">
                    <div className="text-[10px] text-gray-600 uppercase tracking-wide mb-2">CLV by Confidence Band</div>
                    <div className="space-y-2">
                      {clvByBand.map((row: any) => (
                        <div key={row.band} className="flex items-center gap-3">
                          <span className="text-[10px] text-gray-500 w-16 shrink-0">{row.band}</span>
                          <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                            <div
                              className={`h-full rounded-full ${(row.avg_clv ?? 0) >= 0 ? "bg-emerald-500" : "bg-red-500"}`}
                              style={{ width: `${Math.min(100, Math.abs(row.avg_clv ?? 0) * 10)}%` }}
                            />
                          </div>
                          <span className={`text-[10px] font-bold tabular-nums w-12 text-right ${(row.avg_clv ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {row.avg_clv != null ? `${row.avg_clv > 0 ? "+" : ""}${row.avg_clv.toFixed(1)}%` : "—"}
                          </span>
                          <span className="text-[10px] text-gray-600 w-10 text-right">{row.samples}x</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* CLV by pick type */}
                {clvByType.length > 0 && (
                  <div className="border-t border-white/[0.06] px-4 py-3">
                    <div className="text-[10px] text-gray-600 uppercase tracking-wide mb-2">CLV by Market</div>
                    <div className="space-y-2">
                      {clvByType.map((row: any) => (
                        <button
                          key={row.pick_type}
                          onClick={() => openMarketExplorer(row.pick_type)}
                          className="flex w-full items-center justify-between gap-2 rounded-md px-1 py-1 text-left hover:bg-white/[0.03]"
                        >
                          <span className="text-xs text-gray-400 capitalize flex-1 truncate">
                            {(row.pick_type || "").replace(/_/g, " ")}
                          </span>
                          <span className={`text-xs font-bold tabular-nums ${(row.avg_clv ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {row.avg_clv != null ? `${row.avg_clv > 0 ? "+" : ""}${row.avg_clv.toFixed(1)}%` : "—"}
                          </span>
                          <span className="text-[10px] text-gray-600 w-8 text-right">{row.samples}x</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent CLV entries */}
                {clvRecent.length > 0 && (
                  <div className="border-t border-white/[0.06]">
                    <div className="px-4 py-2 text-[10px] text-gray-600 uppercase tracking-wide">Recent Entries</div>
                    <div className="divide-y divide-white/[0.04] max-h-64 overflow-y-auto">
                      {clvRecent.map((row: any, i: number) => (
                        <div key={i} className="px-4 py-2.5 flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-white truncate">{row.match}</div>
                            <div className="text-[10px] text-gray-600">
                              {row.selection} · {row.entry_odds} → {row.closing_odds ?? "open"}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className={`text-xs font-bold tabular-nums ${(row.clv_percent ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                              {row.clv_percent != null ? `${row.clv_percent > 0 ? "+" : ""}${row.clv_percent.toFixed(1)}%` : "—"}
                            </div>
                            {row.result && <ResultBadge result={row.result} />}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* ── By market type ── */}
            <section className="rounded-xl border border-white/[0.07] bg-[#161616] overflow-hidden">
              <div className="px-4 py-2.5 border-b border-white/[0.07] text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                By Market
              </div>
              {byType.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-600">No graded markets yet</div>
              ) : (
                <div className="divide-y divide-white/[0.05]">
                  {byType.map((row: any) => {
                    const wr = row.win_rate != null ? Math.round(row.win_rate * 100) : null;
                    return (
                      <button
                        key={row.pick_type}
                        onClick={() => openMarketExplorer(row.pick_type)}
                        className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-white/[0.03]"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-white capitalize">{row.pick_type?.replace(/_/g, " ")}</div>
                          <div className="text-[11px] text-gray-600">{row.wins}W · {row.losses}L · {row.total} total</div>
                        </div>
                        {/* Win rate bar */}
                        <div className="w-20 shrink-0">
                          <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                            <span>{wr != null ? `${wr}%` : "—"}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                            <div
                              className={`h-full rounded-full ${(wr ?? 0) >= 50 ? "bg-emerald-500" : "bg-red-500"}`}
                              style={{ width: `${wr ?? 0}%` }}
                            />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ── Recent results ── */}
            <section className="rounded-xl border border-white/[0.07] bg-[#161616] overflow-hidden">
              <div className="px-4 py-2.5 border-b border-white/[0.07] text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                Recent Results
              </div>
              {recent.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-600">No graded predictions yet</div>
              ) : (
                <div className="divide-y divide-white/[0.05]">
                  {recent.map((row: any, i: number) => (
                    <div key={i} className="px-4 py-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-white truncate">{row.match}</div>
                        <div className="text-[11px] text-gray-500 truncate">
                          {row.selection} · {row.confidence}% confidence
                        </div>
                      </div>
                      <ResultBadge result={row.result} />
                    </div>
                  ))}
                </div>
              )}
            </section>

          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Analytics;
