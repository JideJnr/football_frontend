import { IonContent, IonPage, IonRefresher, IonRefresherContent, useIonRouter } from "@ionic/react";
import { Activity, BarChart3, Brain, CheckCircle2, Database, LineChart, RefreshCw, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getPerformanceAnalytics,
  getPredictionsToday,
  getRoiAnalysis,
  getUpcomingEnrichedPredicted,
  refreshPredictions,
  triggerGradeResults,
} from "../../../services/apis/footballApi";
import api from "../../../services/apis/footballApi";

const fetchClv = () => api.get("/analytics/clv?days=30").then(r => r.data);

const pct = (value: any, fallback = "--") => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return fallback;
  return `${Math.round(Number(value))}%`;
};

const toneFor = (value: number) => {
  if (value >= 70) return "text-emerald-400";
  if (value >= 58) return "text-yellow-400";
  return "text-gray-300";
};

const confidenceBand = (confidence: number, pick: any) => {
  const memory = pick?.calibration?.memory_weighting;
  const scopes = memory?.scopes || {};
  const samples =
    (scopes.tournament?.samples || 0) +
    (scopes.country?.samples || 0) +
    (scopes.global?.samples || 0);
  const spread = samples >= 80 ? 4 : samples >= 30 ? 6 : samples >= 10 ? 8 : 12;
  return {
    low: Math.max(1, confidence - spread),
    high: Math.min(99, confidence + spread),
    spread,
    samples,
  };
};

const topReasons = (prediction: any) => {
  return (prediction?.signals || [])
    .filter((s: any) => Math.abs(Number(s.impact || 0)) >= 2)
    .slice(0, 4)
    .map((s: any) => ({
      name: String(s.name || "").replace(/_/g, " "),
      impact: Number(s.impact || 0),
    }));
};

const dataCoverage = (prediction: any) => {
  const signals = prediction?.signals || [];
  const has = (name: string) => signals.some((s: any) => s.name === name);
  return [
    { label: "Models", ok: has("ensemble_model") || has("poisson_model") || has("dixon_coles_model") },
    { label: "Market", ok: has("odds_progression") || has("odds_pattern") },
    { label: "Memory", ok: has("prediction_memory") || has("finished_database_memory") },
    { label: "Web", ok: has("web_context") },
  ];
};

const Stat = ({ label, value, sub, icon: Icon, tone = "text-white" }: any) => (
  <div className="rounded-lg border border-white/[0.07] bg-[#161616] p-3">
    <div className="flex items-center justify-between">
      <div className="text-[10px] uppercase tracking-widest text-gray-500">{label}</div>
      {Icon && <Icon size={15} className="text-gray-600" />}
    </div>
    <div className={`mt-2 text-2xl font-bold ${tone}`}>{value}</div>
    {sub && <div className="mt-1 text-[10px] text-gray-600">{sub}</div>}
  </div>
);

const PredictionCard = ({ prediction, onOpen }: { prediction: any; onOpen: () => void }) => {
  const pick = prediction.best_pick || (prediction.picks || [])[0] || {};
  const confidence = Number(pick.confidence || 0);
  const band = confidenceBand(confidence, pick);
  const reasons = topReasons(prediction);
  const coverage = dataCoverage(prediction);

  return (
    <button
      onClick={onOpen}
      className="w-full rounded-lg border border-white/[0.07] bg-[#161616] p-4 text-left transition hover:border-emerald-500/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-white">{prediction.match_name || "Match"}</div>
          <div className="mt-1 truncate text-[11px] text-gray-600">{prediction.league_name || "Tournament"}</div>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold ${toneFor(confidence)}`}>{confidence || "--"}%</div>
          <div className="text-[10px] text-gray-600">{band.low}-{band.high}% band</div>
        </div>
      </div>

      <div className="mt-3 rounded bg-white/[0.03] px-3 py-2">
        <div className="text-[10px] uppercase tracking-widest text-gray-600">{pick.type || "Pick"}</div>
        <div className="text-sm font-semibold text-gray-200">{pick.selection || "--"}</div>
        {pick.reason && <div className="mt-1 text-[11px] leading-relaxed text-gray-500">{pick.reason}</div>}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {coverage.map(item => (
          <span key={item.label} className={`rounded px-2 py-1 text-[10px] ${item.ok ? "bg-emerald-500/10 text-emerald-400" : "bg-white/[0.04] text-gray-600"}`}>
            {item.ok ? "OK" : "Missing"} {item.label}
          </span>
        ))}
      </div>

      {reasons.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-1.5">
          {reasons.map((reason: any) => (
            <div key={reason.name} className="rounded bg-black/20 px-2 py-1.5">
              <div className="truncate text-[10px] text-gray-500">{reason.name}</div>
              <div className={reason.impact >= 0 ? "text-xs font-bold text-emerald-400" : "text-xs font-bold text-red-400"}>
                {reason.impact >= 0 ? "+" : ""}{reason.impact}
              </div>
            </div>
          ))}
        </div>
      )}
    </button>
  );
};

const Dashboard = () => {
  const router = useIonRouter();
  const [predictions, setPredictions] = useState<any[]>([]);
  const [upcoming, setUpcoming] = useState<any>(null);
  const [perf, setPerf] = useState<any>(null);
  const [roi, setRoi] = useState<any>(null);
  const [clv, setClv] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [p, u, perfRes, roiRes, clvRes] = await Promise.all([
        getPredictionsToday(),
        getUpcomingEnrichedPredicted(),
        getPerformanceAnalytics(),
        getRoiAnalysis(),
        fetchClv().catch(() => null),
      ]);
      setPredictions(p?.predictions || []);
      setUpcoming(u);
      setPerf(perfRes);
      setRoi(roiRes);
      setClv(clvRes);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Dashboard failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const ranked = useMemo(() => {
    return [...predictions].sort((a, b) =>
      Number(b.best_pick?.confidence || 0) - Number(a.best_pick?.confidence || 0)
    );
  }, [predictions]);

  const runAction = async (key: string, fn: () => Promise<any>) => {
    setRunning(key);
    setError("");
    try {
      await fn();
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Action failed");
    } finally {
      setRunning("");
    }
  };

  const graded = perf?.graded ?? 0;
  const pending = perf?.pending ?? Math.max(0, (perf?.total_predictions || 0) - graded);
  const clvQuality = clv?.edge_quality ? String(clv.edge_quality).replace(/_/g, " ") : "learning";

  return (
    <IonPage>
      <IonContent fullscreen style={{ "--background": "#0f0f0f" } as any}>
        <IonRefresher slot="fixed" onIonRefresh={async event => { await load(); event.detail.complete(); }}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="min-h-full bg-[#0f0f0f] pb-8 text-white">
          <div className="sticky top-0 z-20 flex items-center justify-between border-b border-white/[0.06] bg-[#0f0f0f]/95 px-4 py-3 backdrop-blur">
            <button onClick={() => router.goBack()} className="text-xs font-semibold text-gray-400 hover:text-white">Back</button>
            <div className="text-xs font-bold uppercase tracking-widest text-emerald-400">Prediction Dashboard</div>
            <button onClick={load} className="text-gray-500 hover:text-emerald-400">
              <RefreshCw size={16} />
            </button>
          </div>

          <div className="space-y-5 px-4 py-4">
            {error && <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>}

            <div className="grid grid-cols-2 gap-2">
              <Stat label="Win Rate" value={pct(perf?.win_percent)} sub={`${perf?.wins ?? 0}W / ${perf?.losses ?? 0}L`} icon={CheckCircle2} tone={Number(perf?.win_percent || 0) >= 50 ? "text-emerald-400" : "text-gray-300"} />
              <Stat label="ROI" value={pct(roi?.roi_percent)} sub={`${roi?.total_predictions ?? 0} flat stakes`} icon={LineChart} tone={Number(roi?.roi_percent || 0) >= 0 ? "text-emerald-400" : "text-red-400"} />
              <Stat label="CLV Quality" value={clvQuality} sub={`${clv?.positive_clv_rate ?? "--"}% positive CLV`} icon={BarChart3} tone="text-yellow-400" />
              <Stat label="Learning Loop" value={`${graded}/${graded + pending}`} sub="graded predictions" icon={Activity} tone="text-blue-300" />
            </div>

            <div className="rounded-lg border border-white/[0.07] bg-[#161616] p-4">
              <div className="mb-3 flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-400" />
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Data Trust</div>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  ["Upcoming", upcoming?.summary?.upcoming],
                  ["Enriched", upcoming?.summary?.enriched],
                  ["Predicted", upcoming?.summary?.predicted],
                  ["Matched", upcoming?.summary?.matched_sofascore],
                ].map(([label, value]) => (
                  <div key={label} className="rounded bg-black/20 px-2 py-2">
                    <div className="text-lg font-bold text-white">{value ?? 0}</div>
                    <div className="text-[9px] text-gray-600">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => runAction("refresh", refreshPredictions)}
                disabled={!!running}
                className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-400 disabled:opacity-40"
              >
                {running === "refresh" ? "Running..." : "Refresh Predictions"}
              </button>
              <button
                onClick={() => runAction("grade", () => triggerGradeResults(48))}
                disabled={!!running}
                className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-300 disabled:opacity-40"
              >
                {running === "grade" ? "Grading..." : "Grade Results"}
              </button>
            </div>

            <div className="rounded-lg border border-white/[0.07] bg-[#161616] p-4">
              <div className="mb-3 flex items-center gap-2">
                <Database size={16} className="text-blue-300" />
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Model Stack</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {["Tournament memory", "Country memory", "Whole database", "Opponent form", "ELO", "Dixon-Coles", "Odds movement", "CLV"].map(item => (
                  <div key={item} className="rounded bg-black/20 px-2 py-2 text-[11px] text-gray-300">{item}</div>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center gap-2 px-1">
                <Brain size={16} className="text-emerald-400" />
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Decision Board</div>
                <div className="ml-auto text-[10px] text-gray-600">{ranked.length} picks</div>
              </div>

              {loading && ranked.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-500">Loading decision board...</div>
              ) : ranked.length === 0 ? (
                <div className="rounded-lg border border-white/[0.07] bg-[#161616] px-4 py-10 text-center text-sm text-gray-500">
                  No predictions yet. The background worker will fill this as matches are enriched.
                </div>
              ) : (
                <div className="space-y-3">
                  {ranked.map(prediction => (
                    <PredictionCard
                      key={`${prediction.match_id}-${prediction.id}`}
                      prediction={prediction}
                      onOpen={() => router.push(`/match/${prediction.match_id}`, "forward", "push")}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Dashboard;
