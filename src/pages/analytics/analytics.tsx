import { IonContent, IonPage, IonRefresher, IonRefresherContent, useIonRouter } from "@ionic/react";
import { useCallback, useEffect, useState } from "react";
import { getPerformanceAnalytics, getRoiAnalysis } from "../../services/apis/footballApi";

const StatCard = ({ label, value, tone = "text-white" }: { label: string; value: any; tone?: string }) => (
  <div className="rounded-lg border border-white/[0.07] bg-white/[0.03] p-3">
    <div className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</div>
    <div className={`text-xl font-bold mt-1 ${tone}`}>{value ?? "-"}</div>
  </div>
);

const Analytics = () => {
  const router = useIonRouter();
  const [performance, setPerformance] = useState<any>(null);
  const [roi, setRoi] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [perf, roiData] = await Promise.all([getPerformanceAnalytics(), getRoiAnalysis()]);
      setPerformance(perf);
      setRoi(roiData);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Analytics failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const byType = performance?.by_type || [];
  const recent = performance?.recent || [];
  const bands = roi?.by_confidence || {};

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
            <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Analytics</div>
            <div className="w-9" />
          </div>

          <div className="px-4 py-4 space-y-4">
            {error && <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>}

            <div className="grid grid-cols-2 gap-2">
              <StatCard label="Win Rate" value={performance?.win_percent != null ? `${performance.win_percent}%` : "-"} tone="text-emerald-400" />
              <StatCard label="ROI" value={`${roi?.roi_percent ?? 0}%`} tone={(roi?.roi_percent ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"} />
              <StatCard label="Graded" value={performance?.graded ?? 0} />
              <StatCard label="Pending" value={performance?.pending ?? 0} />
            </div>

            <section className="rounded-lg border border-white/[0.07] bg-[#161616] overflow-hidden">
              <div className="px-4 py-2.5 border-b border-white/[0.07] text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                ROI by Confidence
              </div>
              <div className="p-3 grid grid-cols-4 gap-2">
                {Object.entries(bands).map(([band, data]: any) => (
                  <div key={band} className="rounded bg-white/[0.04] px-2 py-2 text-center">
                    <div className="text-[10px] text-gray-600">{band}</div>
                    <div className="text-sm font-bold text-white">{data.win_rate}%</div>
                    <div className="text-[10px] text-gray-600">{data.count} picks</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-white/[0.07] bg-[#161616] overflow-hidden">
              <div className="px-4 py-2.5 border-b border-white/[0.07] text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                Markets
              </div>
              <div className="divide-y divide-white/[0.05]">
                {byType.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-gray-500">No graded markets yet.</div>
                ) : byType.map((row: any) => (
                  <div key={row.pick_type} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-white">{row.pick_type}</div>
                      <div className="text-[11px] text-gray-600">{row.wins} wins / {row.losses} losses</div>
                    </div>
                    <div className="text-sm font-bold text-emerald-400">{Math.round((row.win_rate || 0) * 100)}%</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-white/[0.07] bg-[#161616] overflow-hidden">
              <div className="px-4 py-2.5 border-b border-white/[0.07] text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                Recent Results
              </div>
              <div className="divide-y divide-white/[0.05]">
                {loading && !performance ? (
                  <div className="px-4 py-8 text-center text-sm text-gray-500">Loading analytics...</div>
                ) : recent.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-gray-500">No graded predictions yet.</div>
                ) : recent.map((row: any, index: number) => (
                  <div key={`${row.match || row.match_name}-${index}`} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{row.match || row.match_name}</div>
                      <div className="text-[11px] text-gray-600 truncate">{row.selection} - {row.confidence}%</div>
                    </div>
                    <div className={`text-xs font-bold uppercase ${row.result === "win" ? "text-emerald-400" : row.result === "void" ? "text-gray-400" : "text-red-400"}`}>
                      {row.result}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Analytics;
