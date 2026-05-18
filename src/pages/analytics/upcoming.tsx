import { IonContent, IonPage, IonRefresher, IonRefresherContent, useIonRouter } from "@ionic/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getUpcomingEnrichedPredicted,
  refreshPredictions,
  triggerEnrichWorker,
  triggerIngestUpcoming,
  triggerMatchAndEnrich,
} from "../../services/apis/footballApi";

const fmtTime = (value: any) => {
  if (!value) return "--:--";
  const date = typeof value === "string" ? new Date(value) : new Date(value < 1e10 ? value * 1000 : value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};

const confidenceTone = (confidence: number) => {
  if (confidence >= 75) return "text-emerald-400";
  if (confidence >= 65) return "text-yellow-400";
  if (confidence > 0) return "text-gray-300";
  return "text-gray-600";
};

const memoryLine = (prediction: any) => {
  const signals = prediction?.signals || [];
  const pickMemory = signals.find((s: any) => s.name === "prediction_memory")?.value;
  const dbMemory = signals.find((s: any) => s.name === "finished_database_memory")?.value;
  const parts = [];
  if (pickMemory?.scopes) {
    parts.push(`graded T${pickMemory.scopes.tournament?.samples ?? 0}/C${pickMemory.scopes.country?.samples ?? 0}/DB${pickMemory.scopes.global?.samples ?? 0}`);
  }
  if (dbMemory?.scopes) {
    parts.push(`finished T${dbMemory.scopes.tournament?.samples ?? 0}/C${dbMemory.scopes.country?.samples ?? 0}/DB${dbMemory.scopes.global?.samples ?? 0}`);
  }
  return parts.join(" · ");
};

const UpcomingAnalytics = () => {
  const router = useIonRouter();
  const [matches, setMatches] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState("");
  const [error, setError] = useState("");
  const [lastRun, setLastRun] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getUpcomingEnrichedPredicted();
      setMatches(res?.matches || []);
      setSummary(res?.summary || {});
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Could not load upcoming analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const runAction = async (key: string, fn: () => Promise<any>) => {
    setRunning(key);
    setError("");
    try {
      const result = await fn();
      setLastRun(result);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Action failed");
    } finally {
      setRunning("");
    }
  };

  const ranked = useMemo(() => {
    return [...matches].sort((a, b) => {
      const ac = Number(a.best_pick?.confidence || 0);
      const bc = Number(b.best_pick?.confidence || 0);
      return bc - ac;
    });
  }, [matches]);

  return (
    <IonPage>
      <IonContent fullscreen style={{ "--background": "#0f0f0f" } as any}>
        <IonRefresher slot="fixed" onIonRefresh={async event => {
          await load();
          event.detail.complete();
        }}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="min-h-full bg-[#0f0f0f] text-white pb-8">
          <div className="sticky top-0 z-20 bg-[#0f0f0f]/95 border-b border-white/[0.06] px-4 py-3 backdrop-blur flex items-center justify-between">
            <button onClick={() => router.goBack()} className="text-xs font-semibold text-gray-400 hover:text-white">
              Back
            </button>
            <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Upcoming Ratings</div>
            <div className="w-9" />
          </div>

          <div className="px-4 py-4 space-y-4">
            <div className="grid grid-cols-4 gap-2">
              {[
                ["Upcoming", summary.upcoming],
                ["Enriched", summary.enriched],
                ["Predicted", summary.predicted],
                ["Matched", summary.matched_sofascore],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-white/[0.07] bg-white/[0.03] p-2 text-center">
                  <div className="text-sm font-bold text-white">{value ?? 0}</div>
                  <div className="text-[9px] text-gray-600 mt-0.5">{label}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => runAction("match-enrich", () => triggerMatchAndEnrich(12))}
                disabled={!!running}
                className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-400 disabled:opacity-40"
              >
                {running === "match-enrich" ? "Matching..." : "Sporty + Sofa Match"}
              </button>
              <button
                onClick={() => runAction("ingest", triggerIngestUpcoming)}
                disabled={!!running}
                className="rounded-lg border border-white/[0.08] bg-[#161616] px-3 py-2 text-xs font-semibold text-gray-300 disabled:opacity-40"
              >
                {running === "ingest" ? "Running..." : "Ingest"}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => runAction("enrich", triggerEnrichWorker)}
                disabled={!!running}
                className="rounded-lg border border-white/[0.08] bg-[#161616] px-3 py-2 text-xs font-semibold text-gray-300 disabled:opacity-40"
              >
                {running === "enrich" ? "Running..." : "Enrich"}
              </button>
              <button
                onClick={() => runAction("predict", refreshPredictions)}
                disabled={!!running}
                className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-400 disabled:opacity-40"
              >
                {running === "predict" ? "Running..." : "Predict"}
              </button>
            </div>

            {error && <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>}
            {lastRun?.enrich && (
              <div className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-[11px] text-gray-400">
                <div className="font-semibold text-gray-300">Last run: {lastRun.enrich.processed_count ?? 0} checked, {lastRun.enrich.matched ?? 0} matched, {lastRun.enrich.predicted ?? 0} predicted.</div>
                <div className="mt-1 truncate">SofaScore dates: {(lastRun.enrich.dates_scanned || []).join(", ") || "none"}</div>
              </div>
            )}

            {loading ? (
              <div className="py-14 text-center text-sm text-gray-500">Loading upcoming ratings...</div>
            ) : ranked.length === 0 ? (
              <div className="rounded-lg border border-white/[0.07] bg-[#161616] px-4 py-10 text-center text-sm text-gray-500">
                No upcoming buffered matches found.
              </div>
            ) : (
              <div className="space-y-3">
                {ranked.map(match => {
                  const confidence = Number(match.best_pick?.confidence || 0);
                  const lifecycle = match.lifecycle?.current || (match.predicted ? "predicted" : match.enriched ? "enriched" : "discovered");
                  const memory = memoryLine(match.prediction);
                  return (
                    <button
                      key={match.sportybet_id}
                      onClick={() => router.push(`/match/${match.sportybet_id}`, "forward", "push")}
                      className="w-full text-left rounded-lg border border-white/[0.07] bg-[#161616] px-4 py-3 hover:border-emerald-500/40"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-white truncate">{match.home_team} vs {match.away_team}</div>
                          <div className="text-[11px] text-gray-600 truncate">{match.tournament || "Tournament"} - {fmtTime(match.start_time)}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className={`text-lg font-bold ${confidenceTone(confidence)}`}>{confidence || "--"}%</div>
                          <div className="text-[10px] text-gray-600">assurance</div>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <span className={`rounded px-2 py-1 text-[10px] ${match.enriched ? "bg-emerald-500/10 text-emerald-400" : "bg-white/[0.04] text-gray-500"}`}>
                          {match.enriched ? "Enriched" : "Not enriched"}
                        </span>
                        <span className={`rounded px-2 py-1 text-[10px] ${match.predicted ? "bg-blue-500/10 text-blue-400" : "bg-white/[0.04] text-gray-500"}`}>
                          {match.predicted ? "Predicted" : "No prediction"}
                        </span>
                        <span className={`rounded px-2 py-1 text-[10px] ${match.sofascore_id ? "bg-purple-500/10 text-purple-300" : "bg-white/[0.04] text-gray-500"}`}>
                          {match.sofascore_id ? "Sofa matched" : "Unmatched"}
                        </span>
                        <span className="rounded bg-white/[0.04] px-2 py-1 text-[10px] text-gray-400">
                          {lifecycle}
                        </span>
                      </div>

                      {match.best_pick?.selection && (
                        <div className="mt-3 rounded bg-white/[0.03] px-3 py-2">
                          <div className="text-[10px] text-gray-600 uppercase">{match.best_pick.type || "Pick"}</div>
                          <div className="text-xs font-semibold text-gray-200">{match.best_pick.selection}</div>
                          {match.best_pick.reason && <div className="text-[11px] text-gray-600 mt-0.5">{match.best_pick.reason}</div>}
                          {memory && <div className="text-[10px] text-emerald-500/80 mt-1">{memory}</div>}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default UpcomingAnalytics;
