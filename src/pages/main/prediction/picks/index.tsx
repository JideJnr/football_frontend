import { IonContent, IonPage, IonRefresher, IonRefresherContent, useIonRouter } from "@ionic/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart2, ChevronDown, ChevronRight, Filter, RefreshCw, Sparkles, Target, Trash2, Zap } from "lucide-react";
import {
  buildAutoBetbuilder,
  getEnrichedAnalysis,
  getPredictionsToday,
  saveBetbuilder,
  synthesizeSurePicks,
} from "../../../../services/apis/footballApi";

interface Pick {
  type: string;
  selection: string;
  confidence: number;
  reason?: string;
  role?: string;
  result?: string;
  odds?: number;
  decimal_odds?: number;
  stake?: { decimal_odds?: number };
}

interface Prediction {
  match_id: string;
  match_name?: string;
  league_name?: string;
  country_name?: string;
  period?: string;
  is_live?: boolean;
  is_finished?: boolean;
  created_at?: string;
  match_date?: string;
  start_time?: number;
  picks?: Pick[];
  best_pick?: Pick;
  result?: string;
  graded_at?: string;
}

interface AiAnalysis {
  status: string;
  match_id: string;
  match_name: string;
  groq_recommendation: string;
  groq_confidence: number;
  value_bet: boolean;
  market_signal?: string;
  reasoning?: any;
  key_factors?: string[];
  prediction_engine_pick: Pick;
  similar_matches?: any[];
  similar_matches_used: number;
  estimated_odds: number;
  confirmed: boolean;
  cached?: boolean;
}

interface SlipPick {
  match_id: string;
  match: string;
  pick_type: string;
  type: string;
  selection: string;
  groq_confidence: number;
  confidence: number;
  odds: number;
  estimated_odds: number;
  source: "groq";
  confirmed?: boolean;
}

type PickTypeFilter = "all" | "match_result" | "double_chance" | "goals" | "live";
type ConfidenceFilter = "all" | "60+" | "65+" | "70+" | "75+";
type StatusFilter = "pending" | "live" | "all";

const getBestPick = (prediction: Prediction): Pick | null => {
  const picks = prediction.picks ?? [];
  return prediction.best_pick ?? picks.find(p => p.role === "primary") ?? picks[0] ?? null;
};

const pickOdds = (pick?: Partial<Pick> | null) => {
  const raw = pick?.stake?.decimal_odds ?? pick?.odds ?? pick?.decimal_odds;
  const parsed = Number(raw);
  if (Number.isFinite(parsed) && parsed > 1) return parsed;
  const confidence = Math.max(1, Math.min(95, Number(pick?.confidence ?? 55))) / 100;
  return Number((1 / confidence).toFixed(2));
};

const pickTypeLabel = (type?: string) => {
  switch (type) {
    case "match_result": return "1X2";
    case "double_chance": return "Double Chance";
    case "goals": return "Goals";
    case "live_goals":
    case "live_next_goal": return "Live";
    default: return type?.replace(/_/g, " ") || "Pick";
  }
};

const pickTypeColor = (type?: string) => {
  switch (type) {
    case "match_result": return "bg-sky-500/10 text-sky-300 border-sky-500/20";
    case "double_chance": return "bg-violet-500/10 text-violet-300 border-violet-500/20";
    case "goals": return "bg-amber-500/10 text-amber-300 border-amber-500/20";
    case "live_goals":
    case "live_next_goal": return "bg-red-500/10 text-red-300 border-red-500/20";
    default: return "bg-white/[0.04] text-gray-400 border-white/[0.06]";
  }
};

const confidenceTone = (value: number) => {
  if (value >= 75) return "text-emerald-300";
  if (value >= 65) return "text-amber-300";
  return "text-gray-300";
};

const combinedOdds = (items: SlipPick[]) =>
  items.reduce((total, item) => total * Number(item.odds || item.estimated_odds || 1), items.length ? 1 : 0);

const avgConfidence = (items: SlipPick[]) =>
  items.length ? Math.round(items.reduce((total, item) => total + Number(item.groq_confidence || item.confidence || 0), 0) / items.length) : 0;

const verdictText = (analysis?: AiAnalysis) => {
  if (!analysis) return "";
  if (typeof analysis.reasoning === "string") return analysis.reasoning;
  if (analysis.reasoning?.verdict) return analysis.reasoning.verdict;
  if (analysis.reasoning?.summary) return analysis.reasoning.summary;
  return analysis.key_factors?.[0] || "AI analysis completed for this pick.";
};

const FilterChip = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold transition-all ${
      active ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300" : "bg-white/[0.04] border-white/[0.08] text-gray-400"
    }`}
  >
    {children}
  </button>
);

const DistributionBar = ({ predictions }: { predictions: Prediction[] }) => {
  const stats = useMemo(() => {
    const counts: Record<string, number> = { "75+": 0, "70-74": 0, "65-69": 0, "60-64": 0, "<60": 0 };
    const byType: Record<string, number> = {};
    let total = 0;
    let confidence = 0;
    predictions.forEach(item => {
      const pick = getBestPick(item);
      if (!pick) return;
      const c = Number(pick.confidence || 0);
      total += 1;
      confidence += c;
      if (c >= 75) counts["75+"] += 1;
      else if (c >= 70) counts["70-74"] += 1;
      else if (c >= 65) counts["65-69"] += 1;
      else if (c >= 60) counts["60-64"] += 1;
      else counts["<60"] += 1;
      byType[pick.type || "other"] = (byType[pick.type || "other"] ?? 0) + 1;
    });
    return { counts, byType, total, average: total ? Math.round(confidence / total) : 0 };
  }, [predictions]);
  const bands = [
    ["75+", "bg-emerald-500"],
    ["70-74", "bg-lime-500"],
    ["65-69", "bg-amber-500"],
    ["60-64", "bg-slate-500"],
    ["<60", "bg-zinc-700"],
  ] as const;

  return (
    <div className="rounded-lg border border-white/[0.07] bg-[#161616] p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 flex items-center gap-1.5">
          <BarChart2 size={12} /> Confidence
        </span>
        <span className="text-xs font-bold text-emerald-300">{stats.total} picks, avg {stats.average}%</span>
      </div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-white/[0.04]">
        {bands.map(([label, color]) => {
          const width = stats.total ? (stats.counts[label] / stats.total) * 100 : 0;
          return width ? <div key={label} className={`${color} h-full`} style={{ width: `${width}%` }} /> : null;
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        {bands.map(([label, color]) => (
          <span key={label} className="text-[10px] text-gray-500 flex items-center gap-1">
            <span className={`h-2 w-2 rounded-sm ${color}`} /> {label}: <b className="text-gray-300">{stats.counts[label]}</b>
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5 border-t border-white/[0.05] pt-2">
        {Object.entries(stats.byType).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
          <span key={type} className={`rounded border px-2 py-0.5 text-[10px] ${pickTypeColor(type)}`}>
            {pickTypeLabel(type)}: {count}
          </span>
        ))}
      </div>
    </div>
  );
};

const PicksPage = () => {
  const router = useIonRouter();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [analyses, setAnalyses] = useState<Record<string, AiAnalysis>>({});
  const [analysisLoading, setAnalysisLoading] = useState<Record<string, boolean>>({});
  const [slip, setSlip] = useState<SlipPick[]>([]);
  const [notice, setNotice] = useState("");
  const [targetOdds, setTargetOdds] = useState("5.00");
  const [maxOdds, setMaxOdds] = useState("8.00");
  const [builderLoading, setBuilderLoading] = useState(false);
  const [builderProgress, setBuilderProgress] = useState("");

  const [pickType, setPickType] = useState<PickTypeFilter>("all");
  const [minConf, setMinConf] = useState<ConfidenceFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"confidence" | "time">("confidence");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getPredictionsToday();
      setPredictions((data?.predictions ?? []).filter((item: Prediction) => !item.is_finished && item.result !== "cancelled"));
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? e?.message ?? "Failed to load picks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let list = [...predictions];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(p =>
        (p.match_name ?? "").toLowerCase().includes(q) ||
        (p.league_name ?? "").toLowerCase().includes(q) ||
        (p.country_name ?? "").toLowerCase().includes(q)
      );
    }
    if (statusFilter === "pending") list = list.filter(p => !p.is_live && !p.is_finished && !p.result && !p.graded_at);
    if (statusFilter === "live") list = list.filter(p => !!p.is_live);
    if (pickType !== "all") {
      list = list.filter(p => {
        const pick = getBestPick(p);
        if (!pick) return false;
        if (pickType === "live") return pick.type.startsWith("live");
        return pick.type === pickType;
      });
    }
    if (minConf !== "all") {
      const threshold = parseInt(minConf, 10);
      list = list.filter(p => Number(getBestPick(p)?.confidence ?? 0) >= threshold);
    }
    list.sort((a, b) => {
      if (sortBy === "confidence") return Number(getBestPick(b)?.confidence ?? 0) - Number(getBestPick(a)?.confidence ?? 0);
      return Number(a.start_time ?? 0) - Number(b.start_time ?? 0);
    });
    return list;
  }, [predictions, search, statusFilter, pickType, minConf, sortBy]);

  const runAnalysis = async (prediction: Prediction, forceRefresh = false) => {
    const id = prediction.match_id;
    if (!forceRefresh && analyses[id]) return;
    setAnalysisLoading(s => ({ ...s, [id]: true }));
    setNotice("");
    try {
      const result = await getEnrichedAnalysis(id, forceRefresh);
      setAnalyses(s => ({ ...s, [id]: result }));
      setExpandedId(id);
    } catch (e: any) {
      setNotice(e?.response?.data?.detail?.message || e?.response?.data?.detail || e?.message || "AI analysis failed");
    } finally {
      setAnalysisLoading(s => ({ ...s, [id]: false }));
    }
  };

  const addToSlip = (analysis: AiAnalysis) => {
    const enginePick: Partial<Pick> = analysis.prediction_engine_pick || {};
    const pick: SlipPick = {
      match_id: analysis.match_id,
      match: analysis.match_name,
      pick_type: enginePick.type || "ai_pick",
      type: enginePick.type || "ai_pick",
      selection: analysis.groq_recommendation,
      groq_confidence: Number(analysis.groq_confidence || 0),
      confidence: Number(analysis.groq_confidence || 0),
      odds: Number(analysis.estimated_odds || pickOdds(enginePick)),
      estimated_odds: Number(analysis.estimated_odds || pickOdds(enginePick)),
      source: "groq",
      confirmed: analysis.confirmed,
    };
    setSlip(current => {
      const replaced = current.some(item => item.match_id === pick.match_id);
      setNotice(replaced ? "Existing pick replaced in slip" : "AI pick added to slip");
      return [...current.filter(item => item.match_id !== pick.match_id), pick];
    });
  };

  const buildAiSlip = async () => {
    setBuilderLoading(true);
    setBuilderProgress("Analysing matches... 0 / 50 complete");
    setNotice("");
    try {
      const timer = window.setInterval(() => {
        setBuilderProgress(prev => {
          const current = Number((prev.match(/(\d+) \/ 50/) || [])[1] || 0);
          return `Analysing matches... ${Math.min(49, current + 1)} / 50 complete`;
        });
      }, 1400);
      const result = await buildAutoBetbuilder({
        target_odds: Number(targetOdds),
        max_total_odds: Number(maxOdds),
      });
      window.clearInterval(timer);
      setBuilderProgress(`Analysing matches... ${result.analyses_succeeded ?? 0} / ${result.analyses_run ?? 0} complete`);
      const picks = (result.picks || result.selections || []) as SlipPick[];
      setSlip(picks.map(item => ({ ...item, source: "groq" as const, odds: Number(item.odds || item.estimated_odds || 1) })));
      const map: Record<string, AiAnalysis> = {};
      (result.analyses || []).forEach((item: AiAnalysis) => { if (item.match_id) map[item.match_id] = item; });
      setAnalyses(s => ({ ...s, ...map }));
      setNotice(result.target_not_met ? "AI slip built, but target odds were not fully met" : "AI slip built");
    } catch (e: any) {
      setNotice(e?.response?.data?.detail?.message || e?.response?.data?.detail || e?.message || "AI slip build failed");
    } finally {
      setBuilderLoading(false);
    }
  };

  const runSurePicks = async () => {
    const completed = Object.values(analyses);
    if (completed.length < 2) return;
    setBuilderLoading(true);
    try {
      const result = await synthesizeSurePicks({ analyses: completed, target_odds: Number(targetOdds), max_total_odds: Number(maxOdds) });
      setSlip((result.ranked_picks || []).map((item: SlipPick) => ({ ...item, source: "groq" as const, odds: Number(item.odds || item.estimated_odds || 1) })));
      setNotice(result.no_consensus ? "No confirmed consensus, best AI picks loaded" : "Sure picks loaded into slip");
    } catch (e: any) {
      setNotice(e?.response?.data?.detail || e?.message || "Sure picks failed");
    } finally {
      setBuilderLoading(false);
    }
  };

  const saveSlip = async () => {
    if (!slip.length) return;
    try {
      await saveBetbuilder({ selections: slip, request: { source: "picks_hub", groq_powered: true, target_odds: targetOdds, max_total_odds: maxOdds } });
      setNotice("Slip saved");
    } catch (e: any) {
      setNotice(e?.response?.data?.detail || e?.message || "Save failed");
    }
  };

  return (
    <IonPage>
      <IonContent fullscreen style={{ "--background": "#0f0f0f" } as any}>
        <IonRefresher slot="fixed" onIonRefresh={async event => { await load(); event.detail.complete(); }}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="min-h-full bg-[#0f0f0f] pb-32 text-white">
          <div className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#0f0f0f]/95 backdrop-blur px-4 py-3">
            <div className="mb-2 flex items-center justify-between">
              <button onClick={() => router.goBack()} className="text-xs font-semibold text-gray-400 hover:text-white">Back</button>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-emerald-300">
                <Zap size={12} /> Picks Hub
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setShowFilters(v => !v)} className={`rounded-lg p-1.5 ${showFilters ? "bg-emerald-500/20 text-emerald-300" : "text-gray-500"}`}>
                  <Filter size={14} />
                </button>
                <button type="button" onClick={load} className="p-1.5 text-gray-500 hover:text-emerald-300">
                  <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                </button>
              </div>
            </div>
            <div className="flex gap-3 text-[11px]">
              <span className="text-gray-400">{predictions.length} active</span>
              <span className="text-emerald-300">{filtered.length} shown</span>
              <span className="ml-auto text-gray-600">{Object.keys(analyses).length} AI analysed</span>
            </div>
          </div>

          <div className="space-y-3 px-3 py-3">
            {showFilters && (
              <div className="space-y-3 rounded-lg border border-white/[0.07] bg-[#161616] p-3">
                <input
                  type="text"
                  placeholder="Search team, league, country..."
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.05] px-3 py-2 text-sm text-white outline-none placeholder-gray-600 focus:border-emerald-500/40"
                />
                <div>
                  <div className="mb-1.5 text-[10px] uppercase tracking-widest text-gray-600">Status</div>
                  <div className="flex gap-1.5 overflow-x-auto">
                    {(["pending", "live", "all"] as StatusFilter[]).map(v => <FilterChip key={v} active={statusFilter === v} onClick={() => setStatusFilter(v)}>{v}</FilterChip>)}
                  </div>
                </div>
                <div>
                  <div className="mb-1.5 text-[10px] uppercase tracking-widest text-gray-600">Pick Type</div>
                  <div className="flex gap-1.5 overflow-x-auto">
                    {(["all", "match_result", "double_chance", "goals", "live"] as PickTypeFilter[]).map(v => <FilterChip key={v} active={pickType === v} onClick={() => setPickType(v)}>{v === "all" ? "All" : pickTypeLabel(v)}</FilterChip>)}
                  </div>
                </div>
                <div>
                  <div className="mb-1.5 text-[10px] uppercase tracking-widest text-gray-600">Min Confidence</div>
                  <div className="flex gap-1.5 overflow-x-auto">
                    {(["all", "60+", "65+", "70+", "75+"] as ConfidenceFilter[]).map(v => <FilterChip key={v} active={minConf === v} onClick={() => setMinConf(v)}>{v === "all" ? "Any" : `>=${v}`}</FilterChip>)}
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <FilterChip active={sortBy === "confidence"} onClick={() => setSortBy("confidence")}>Confidence</FilterChip>
                  <FilterChip active={sortBy === "time"} onClick={() => setSortBy("time")}>Kick-off time</FilterChip>
                </div>
              </div>
            )}

            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] p-3">
              <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-300">
                <Sparkles size={14} /> Auto Bet Builder
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[10px] uppercase tracking-widest text-gray-500">
                  Target odds
                  <input value={targetOdds} onChange={event => setTargetOdds(event.target.value)} type="number" step="0.1" className="mt-1 w-full rounded-lg border border-white/[0.08] bg-black/20 px-3 py-2 text-sm text-white outline-none" />
                </label>
                <label className="text-[10px] uppercase tracking-widest text-gray-500">
                  Max odds ceiling
                  <input value={maxOdds} onChange={event => setMaxOdds(event.target.value)} type="number" step="0.1" className="mt-1 w-full rounded-lg border border-white/[0.08] bg-black/20 px-3 py-2 text-sm text-white outline-none" />
                </label>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button disabled={builderLoading} onClick={buildAiSlip} className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-bold text-black disabled:opacity-50">
                  Build AI Slip
                </button>
                <button disabled={builderLoading || Object.keys(analyses).length < 2} onClick={runSurePicks} className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-xs font-bold text-gray-200 disabled:opacity-40">
                  Sure Picks
                </button>
              </div>
              {builderProgress && <div className="mt-2 text-[11px] text-emerald-200">{builderProgress}</div>}
            </div>

            {notice && <div className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs text-gray-200">{notice}</div>}
            {error && <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>}
            {filtered.length > 0 && <DistributionBar predictions={filtered} />}

            {loading && !predictions.length ? (
              <div className="py-16 text-center text-sm text-gray-600">Loading picks...</div>
            ) : filtered.length === 0 ? (
              <div className="rounded-lg border border-white/[0.07] bg-[#161616] px-4 py-12 text-center">
                <Target size={32} className="mx-auto mb-3 text-gray-700" />
                <div className="mb-1 text-sm font-semibold text-gray-400">No picks match these filters</div>
                <div className="text-[11px] text-gray-600">Adjust the confidence, status, type, or search filter.</div>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map(prediction => {
                  const pick = getBestPick(prediction);
                  if (!pick) return null;
                  const id = prediction.match_id;
                  const expanded = expandedId === id;
                  const analysis = analyses[id];
                  const loadingAnalysis = analysisLoading[id];
                  return (
                    <div key={`${id}-${prediction.created_at}`} className="rounded-lg border border-white/[0.07] bg-[#161616]">
                      <button type="button" onClick={() => setExpandedId(expanded ? null : id)} className="w-full p-3 text-left">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-white">{prediction.match_name || "Match"}</div>
                            <div className="mt-0.5 truncate text-[10px] text-gray-500">{prediction.league_name || prediction.country_name || ""}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={`text-xl font-bold ${confidenceTone(Number(pick.confidence || 0))}`}>{pick.confidence}%</div>
                            {expanded ? <ChevronDown size={16} className="text-gray-600" /> : <ChevronRight size={16} className="text-gray-600" />}
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${pickTypeColor(pick.type)}`}>{pickTypeLabel(pick.type)}</span>
                          <span className="min-w-0 flex-1 truncate text-sm font-bold text-gray-100">{pick.selection}</span>
                          <span className="text-xs font-semibold text-gray-500">@ {pickOdds(pick).toFixed(2)}</span>
                        </div>
                      </button>

                      {expanded && (
                        <div className="space-y-3 border-t border-white/[0.06] p-3">
                          <div className="rounded-lg bg-black/20 p-3">
                            <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-600">Prediction Engine</div>
                            <div className="text-sm text-gray-200">{pick.selection} at {pick.confidence}%</div>
                            {pick.reason && <p className="mt-1 text-[11px] leading-relaxed text-gray-500">{pick.reason}</p>}
                          </div>

                          {!analysis ? (
                            <button disabled={loadingAnalysis} onClick={() => runAnalysis(prediction)} className="w-full rounded-lg bg-emerald-500 px-3 py-2 text-xs font-bold text-black disabled:opacity-50">
                              {loadingAnalysis ? "Analysing..." : "Get AI Analysis"}
                            </button>
                          ) : (
                            <div className="space-y-3">
                              <div className={`rounded-lg border p-3 ${analysis.confirmed ? "border-emerald-500/30 bg-emerald-500/10" : "border-white/[0.08] bg-white/[0.04]"}`}>
                                <div className="mb-2 flex items-center gap-2">
                                  <span className="text-xs font-bold text-emerald-300">{analysis.groq_recommendation}</span>
                                  <span className="text-xs text-gray-400">{analysis.groq_confidence}%</span>
                                  {analysis.confirmed && <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">Confirmed</span>}
                                  {analysis.value_bet && <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">Value</span>}
                                </div>
                                <div className="text-[11px] leading-relaxed text-gray-400">{verdictText(analysis)}</div>
                                <div className="mt-2 text-[10px] text-gray-600">Market: {analysis.market_signal || "neutral"} | Similar matches: {analysis.similar_matches_used}</div>
                              </div>

                              <details className="rounded-lg border border-white/[0.07] bg-black/20 p-3">
                                <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-widest text-gray-500">Similar Matches</summary>
                                <div className="mt-2 space-y-2">
                                  {(analysis.similar_matches || []).length === 0 ? (
                                    <div className="text-[11px] text-gray-600">No strongly similar historical matches found</div>
                                  ) : analysis.similar_matches?.map((item, index) => (
                                    <div key={`${item.match_id}-${index}`} className="rounded border border-white/[0.05] bg-white/[0.03] p-2">
                                      <div className="text-xs font-semibold text-gray-200">{item.match_name}</div>
                                      <div className="mt-0.5 text-[10px] text-gray-500">
                                        {item.final_score} | {item.prediction_made?.selection || "pick"} | {item.prediction_made?.result || "ungraded"} | {item.similarity_dimension}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </details>

                              <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => addToSlip(analysis)} className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-bold text-black">Add to Slip</button>
                                <button onClick={() => runAnalysis(prediction, true)} className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-xs font-bold text-gray-200">Refresh AI</button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.08] bg-[#101010]/95 px-3 py-3 backdrop-blur">
            <div className="mb-2 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-white">{slip.length} picks | Odds {combinedOdds(slip).toFixed(2)} | Avg {avgConfidence(slip)}%</div>
                <div className="truncate text-[10px] text-gray-500">{slip.length ? slip.map(item => item.selection).join(", ") : "Add AI-validated picks to build a slip"}</div>
              </div>
              <button disabled={!slip.length} onClick={saveSlip} className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-bold text-black disabled:opacity-40">Save Slip</button>
            </div>
            {slip.length > 0 && (
              <div className="flex gap-2 overflow-x-auto">
                {slip.map(item => (
                  <button key={item.match_id} onClick={() => setSlip(current => current.filter(p => p.match_id !== item.match_id))} className="flex shrink-0 items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-[10px] text-gray-300">
                    {item.match}: {item.selection} <Trash2 size={11} className="text-gray-500" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default PicksPage;
