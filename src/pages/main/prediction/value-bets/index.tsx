import { IonContent, IonPage, IonRefresher, IonRefresherContent, useIonRouter } from "@ionic/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getValueBets, triggerBufferCleanup } from "../../../../services/apis/footballApi";
import AddToBetSlipButton from "../../../../components/betslip/AddToBetSlipButton";

const todayISO = () => new Date().toISOString().slice(0, 10);

const ValueBets = () => {
  const router = useIonRouter();
  const [date, setDate] = useState(todayISO());
  const [minEdge, setMinEdge] = useState(3);
  const [bets, setBets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    // Fire cleanup in background — do NOT await it, it was blocking the page load
    triggerBufferCleanup().catch(() => {});
    try {
      const res = await getValueBets(date, minEdge);
      setBets(res?.value_bets || []);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Value scan failed");
    } finally {
      setLoading(false);
    }
  }, [date, minEdge]);

  useEffect(() => {
    load();
  }, [load]);

  const topEdge = useMemo(() => bets[0]?.edge ?? 0, [bets]);

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
            <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Value Bets</div>
            <div className="w-9" />
          </div>

          <div className="px-4 py-4 space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-white/[0.07] bg-white/[0.03] p-3">
                <div className="text-[10px] text-gray-500 uppercase">Found</div>
                <div className="text-xl font-bold text-white">{bets.length}</div>
              </div>
              <div className="rounded-lg border border-white/[0.07] bg-white/[0.03] p-3">
                <div className="text-[10px] text-gray-500 uppercase">Top Edge</div>
                <div className="text-xl font-bold text-emerald-400">{topEdge}%</div>
              </div>
              <div className="rounded-lg border border-white/[0.07] bg-white/[0.03] p-3">
                <div className="text-[10px] text-gray-500 uppercase">Min Edge</div>
                <div className="text-xl font-bold text-white">{minEdge}%</div>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="date"
                value={date}
                onChange={event => setDate(event.target.value)}
                className="flex-1 bg-[#161616] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white"
              />
              <select
                value={minEdge}
                onChange={event => setMinEdge(Number(event.target.value))}
                className="bg-[#161616] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white"
              >
                <option value={1}>1%</option>
                <option value={3}>3%</option>
                <option value={5}>5%</option>
                <option value={8}>8%</option>
              </select>
            </div>

            {error && <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>}

            {loading ? (
              <div className="flex justify-center py-14 text-sm text-gray-500">Scanning prices...</div>
            ) : bets.length === 0 ? (
              <div className="rounded-lg border border-white/[0.07] bg-[#161616] px-4 py-10 text-center text-sm text-gray-500">
                No value bets found for this edge threshold.
              </div>
            ) : (
              <div className="space-y-3">
                {bets.map((bet, index) => (
                  <div
                    key={`${bet.sportybet_id}-${bet.selection}-${index}`}
                    className="rounded-lg border border-white/[0.07] bg-[#161616] hover:border-emerald-500/40 transition-colors"
                  >
                    <button
                      onClick={() => bet.sportybet_id && router.push(`/match/${bet.sportybet_id}`, "forward", "push")}
                      className="w-full text-left px-4 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-white truncate">{bet.match}</div>
                          <div className="text-[11px] text-gray-600 truncate">{bet.tournament || "Tournament"} - {bet.selection}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-bold text-emerald-400">+{bet.edge}%</div>
                          <div className="text-[10px] text-gray-600">@ {bet.decimal_odds}</div>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                        <div className="rounded bg-white/[0.04] py-2">
                          <div className="text-[10px] text-gray-600">Model</div>
                          <div className="text-xs font-bold text-white">{bet.model_probability}%</div>
                        </div>
                        <div className="rounded bg-white/[0.04] py-2">
                          <div className="text-[10px] text-gray-600">Implied</div>
                          <div className="text-xs font-bold text-white">{bet.implied_probability}%</div>
                        </div>
                        <div className="rounded bg-white/[0.04] py-2">
                          <div className="text-[10px] text-gray-600">Stake / 100</div>
                          <div className="text-xs font-bold text-white">{bet.kelly?.stake_per_100 ?? 0}</div>
                        </div>
                      </div>
                    </button>
                    <div className="px-4 pb-3">
                      <AddToBetSlipButton
                        prediction={{
                          match_id: bet.sportybet_id || bet.match_id || String(index),
                          match_name: bet.match,
                          league_name: bet.tournament || 'Unknown league',
                          country_name: bet.country || 'Unknown',
                          best_pick: {
                            type: 'value_bet',
                            pick_type: 'value_bet',
                            selection: bet.selection,
                            odds: bet.decimal_odds,
                            confidence: bet.model_probability,
                          },
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default ValueBets;
