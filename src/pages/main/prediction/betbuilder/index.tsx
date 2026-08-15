import { useEffect, useMemo, useState } from 'react';
import { IonContent, IonPage, useIonRouter } from '@ionic/react';
import { ArrowLeft, Bot, History, LoaderCircle, Sparkles, Ticket, X, Zap } from 'lucide-react';
import { bookBetbuilderSmart, buildLlmBet, buildManualBet, getBetbuilderHistory, saveBetbuilder } from '../../../../services/apis/footballApi';

type Tab = 'builder' | 'results';

const resultTone = (value?: string) => value === 'win' ? 'bg-emerald-300/10 text-emerald-200' : value === 'loss' ? 'bg-rose-300/10 text-rose-200' : 'bg-amber-300/10 text-amber-100';
const confidenceTone = (value: number) => value >= 70 ? 'text-emerald-300' : value >= 58 ? 'text-amber-200' : 'text-rose-300';
const combinedOdds = (picks: any[]) => picks.reduce((acc, p) => acc * Number(p.odds || p.estimated_odds || 1), 1);

type SlipState = { slip: any; bookResult: any; booking: boolean; saving: boolean };
const initSlip = (): SlipState => ({ slip: null, bookResult: null, booking: false, saving: false });

const SlipView = ({
  slip, bookResult, booking, saving, stake, onStakeChange, onSave, onBook,
}: SlipState & { stake: string; onStakeChange: (v: string) => void; onSave: () => void; onBook: () => void }) => (
  <div className="mt-4">
    <div className="border-b border-white/[0.08] pb-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-bold">Suggested ticket</div>
          <p className="mt-1 text-xs text-slate-400">{slip.synthesis_reasoning || 'This ticket favours the best aligned current analyses.'}</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-cyan-200">{Number(slip.combined_odds || combinedOdds(slip.selections || [])).toFixed(2)}</div>
          <div className="text-[9px] uppercase text-slate-500">combined odds</div>
        </div>
      </div>
    </div>
    <div className="divide-y divide-white/[0.07] border-x border-b border-white/[0.08]">
      {(slip.selections || []).map((pick: any) => (
        <div key={`${pick.match_id}-${pick.selection}`} className="p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-xs font-bold">{pick.match || pick.match_name}</div>
              <div className="mt-0.5 text-[10px] text-slate-500">{pick.league || 'Match analysis'}</div>
            </div>
            <div className={`text-sm font-bold ${confidenceTone(Number(pick.confidence || pick.groq_confidence || 0))}`}>{pick.confidence || pick.groq_confidence}%</div>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-cyan-100">{pick.selection}</span>
            <span className="text-xs text-slate-400">{Number(pick.odds || pick.estimated_odds || 0).toFixed(2)}</span>
          </div>
          <p className="mt-2 text-[11px] leading-4 text-slate-400">{pick.synthesis_reasoning || 'Included for its current conviction.'}</p>
          {pick.learning?.samples > 0 && <div className="mt-2 text-[10px] text-violet-200">Past legs: {Math.round(Number(pick.learning.win_rate || 0) * 100)}% win rate across {pick.learning.samples} comparable selections</div>}
        </div>
      ))}
    </div>
    <div className="mt-3 flex flex-wrap items-end gap-2">
      <label className="text-[10px] text-slate-500">Stake
        <input value={stake} onChange={e => onStakeChange(e.target.value)} type="number" min="1" className="ml-2 w-20 border border-white/[0.12] bg-black/30 px-2 py-2 text-xs text-white outline-none" />
      </label>
      <button type="button" onClick={onSave} disabled={saving} className="bg-white px-3 py-2 text-xs font-bold text-slate-950 disabled:opacity-50">{saving ? 'Saving...' : 'Save ticket'}</button>
      <button type="button" onClick={onBook} disabled={booking} className="bg-emerald-400 px-3 py-2 text-xs font-bold text-slate-950 disabled:opacity-50">
        {booking ? <span className="flex items-center gap-1.5"><LoaderCircle size={13} className="animate-spin" />Checking markets…</span> : 'Book with SportyBet'}
      </button>
    </div>
    {bookResult?.dropped?.length > 0 && <div className="mt-3 space-y-1">{bookResult.dropped.map((d: any, i: number) => <div key={i} className="flex items-start gap-2 border-l-2 border-rose-400 bg-rose-400/[0.07] px-2 py-1.5 text-[10px] text-rose-200"><X size={11} className="mt-0.5 shrink-0" /><span><span className="font-bold">{d.match || d.match_id}</span> — {d.selection} removed: market unavailable</span></div>)}</div>}
    {bookResult?.replaced?.length > 0 && <div className="mt-2 space-y-1">{bookResult.replaced.map((r: any, i: number) => <div key={i} className="flex items-start gap-2 border-l-2 border-cyan-400 bg-cyan-400/[0.07] px-2 py-1.5 text-[10px] text-cyan-200"><Bot size={11} className="mt-0.5 shrink-0" /><span><span className="font-bold">{r.original?.match || r.original?.match_id}</span> — Maya replaced <em>{r.original?.selection}</em> → <strong>{r.replacement?.selection}</strong></span></div>)}</div>}
  </div>
);

const Builder = () => {
  const router = useIonRouter();
  const [tab, setTab] = useState<Tab>('builder');
  const [history, setHistory] = useState<any[]>([]);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const [manualTargetOdds, setManualTargetOdds] = useState('1.80');
  const [manualStake, setManualStake] = useState('100');
  const [manualBuilding, setManualBuilding] = useState(false);
  const [manualSlipState, setManualSlipState] = useState<SlipState>(initSlip());

  const [llmTargetOdds, setLlmTargetOdds] = useState('3.00');
  const [llmStake, setLlmStake] = useState('100');
  const [llmBuilding, setLlmBuilding] = useState(false);
  const [llmSlipState, setLlmSlipState] = useState<SlipState>(initSlip());

  const loadHistory = async () => {
    try {
      const res = await getBetbuilderHistory(100);
      setHistory(res?.bets || []);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Could not load history.');
    }
  };

  useEffect(() => { loadHistory(); }, []);

  const learning = useMemo(() => {
    const settled = history.filter(i => i.result === 'win' || i.result === 'loss');
    const wins = settled.filter(i => i.result === 'win').length;
    return { settled: settled.length, wins, losses: settled.length - wins, rate: settled.length ? Math.round((wins / settled.length) * 100) : null };
  }, [history]);

  const buildManual = async () => {
    setManualBuilding(true); setError(''); setNotice('');
    try {
      const target = Math.max(1.1, Number(manualTargetOdds) || 1.8);
      const result = await buildManualBet({ target_odds: target, max_total_odds: Number((target * 1.25).toFixed(2)), stake: Number(manualStake) || 100 });
      setManualSlipState(s => ({ ...s, slip: result }));
      setNotice(result.message || 'Fast ticket built — no LLM calls, pure conviction scoring.');
    } catch (err: any) {
      const d = err?.response?.data?.detail;
      setError(typeof d === 'string' ? d : d?.message || 'Could not build a manual ticket right now.');
    } finally { setManualBuilding(false); }
  };

  const buildLlm = async () => {
    setLlmBuilding(true); setError(''); setNotice('');
    try {
      const target = Math.max(1.5, Number(llmTargetOdds) || 3);
      const result = await buildLlmBet({ target_odds: target, max_total_odds: Number((target * 1.25).toFixed(2)), stake: Number(llmStake) || 100 });
      setLlmSlipState(s => ({ ...s, slip: result }));
      setNotice(result.message || 'Maya reviewed each match with live LLM reasoning.');
    } catch (err: any) {
      const d = err?.response?.data?.detail;
      setError(typeof d === 'string' ? d : d?.message || 'Maya could not build a ticket right now.');
    } finally { setLlmBuilding(false); }
  };

  const saveSlip = async (selections: any[], source: 'ai' | 'manual', targetOdds: string, setter: (fn: (s: SlipState) => SlipState) => void) => {
    if (!selections.length) return;
    setter(s => ({ ...s, saving: true }));
    setError('');
    try {
      await saveBetbuilder({ selections, request: { builder: source, target_odds: Number(targetOdds) } });
      setNotice('Ticket saved. Legs will be graded as matches finish.');
      await loadHistory();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Could not save this ticket.');
    } finally { setter(s => ({ ...s, saving: false })); }
  };

  const bookSlip = async (selections: any[], stake: string, setter: (fn: (s: SlipState) => SlipState) => void) => {
    if (!selections.length) return;
    setter(s => ({ ...s, booking: true, bookResult: null }));
    setError('');
    try {
      const result = await bookBetbuilderSmart({ selections, stake: Number(stake) || 0 });
      setter(s => ({ ...s, bookResult: result, slip: s.slip ? { ...s.slip, booking: result } : s.slip }));
      const code = result?.share_code;
      const dropped = result?.dropped?.length || 0;
      const replaced = result?.replaced?.length || 0;
      setNotice(code ? `Booked ✓ Share code: ${code}${dropped ? ` · ${dropped} leg(s) dropped` : ''}${replaced ? ` · ${replaced} replaced` : ''}` : 'The booking payload is ready for SportyBet.');
    } catch (err: any) {
      const d = err?.response?.data?.detail;
      setError(typeof d === 'string' ? d : d?.message || 'SportyBet booking could not be prepared.');
    } finally { setter(s => ({ ...s, booking: false })); }
  };

  return (
    <IonPage>
      <IonContent fullscreen style={{ '--background': '#101318' } as any}>
        <div className="min-h-full bg-[#101318] pb-10 text-white">
          <header className="sticky top-0 z-20 border-b border-white/[0.08] bg-[#101318]/95 px-4 py-3 backdrop-blur">
            <div className="mx-auto flex max-w-4xl items-center gap-3">
              <button type="button" onClick={() => router.goBack()} aria-label="Back" className="grid h-8 w-8 place-items-center rounded-md text-slate-400 hover:bg-white/[0.06] hover:text-white"><ArrowLeft size={17} /></button>
              <div className="min-w-0 flex-1"><div className="text-sm font-bold">Bet Builder</div><div className="text-[10px] text-slate-500">Build, book, and learn from every ticket</div></div>
              <Ticket size={19} className="text-cyan-300" />
            </div>
          </header>

          <main className="mx-auto max-w-4xl px-3 pt-4">
            <nav className="mb-4 grid grid-cols-2 gap-1 border-b border-white/[0.08] pb-2">
              {([['builder', 'Builder', Ticket], ['results', 'Results', History]] as const).map(([value, label, Icon]) =>
                <button key={value} type="button" onClick={() => setTab(value)} className={`flex items-center justify-center gap-1.5 px-2 py-2 text-[11px] font-bold ${tab === value ? 'border-b-2 border-cyan-300 text-cyan-200' : 'text-slate-500'}`}><Icon size={14} />{label}</button>
              )}
            </nav>

            {error && <div className="mb-3 border-l-2 border-rose-300 bg-rose-300/[0.07] px-3 py-2 text-xs text-rose-100">{error}</div>}
            {notice && <div className="mb-3 border-l-2 border-emerald-300 bg-emerald-300/[0.07] px-3 py-2 text-xs text-emerald-100">{notice}</div>}

            {tab === 'builder' && <div className="space-y-8">

              {/* Manual (fast) */}
              <section>
                <div className="mb-3 flex items-center gap-2 border-b border-white/[0.08] pb-2">
                  <Zap size={14} className="text-amber-300" />
                  <span className="text-xs font-bold text-amber-200">Maya — Fast Builder</span>
                  <span className="ml-auto text-[10px] text-slate-500">No LLM · pure conviction scoring</span>
                </div>
                <div className="border border-amber-300/20 bg-amber-300/[0.04] p-4">
                  <div className="flex flex-wrap items-end gap-3">
                    <label className="text-[10px] font-semibold uppercase text-slate-500">Target odds
                      <input value={manualTargetOdds} onChange={e => setManualTargetOdds(e.target.value)} type="number" min="1.1" step="0.1" className="mt-1 block w-24 border border-white/[0.12] bg-black/30 px-2 py-2 text-sm text-white outline-none" />
                    </label>
                    <button type="button" onClick={buildManual} disabled={manualBuilding} className="flex items-center gap-2 bg-amber-300 px-3 py-2.5 text-xs font-bold text-slate-950 disabled:opacity-50">
                      {manualBuilding ? <LoaderCircle size={15} className="animate-spin" /> : <Zap size={15} />}
                      {manualBuilding ? 'Building…' : 'Build fast ticket'}
                    </button>
                  </div>
                </div>
                {manualSlipState.slip && (
                  <SlipView
                    {...manualSlipState}
                    stake={manualStake}
                    onStakeChange={setManualStake}
                    onSave={() => saveSlip(manualSlipState.slip.selections || [], 'manual', manualTargetOdds, setManualSlipState)}
                    onBook={() => bookSlip(manualSlipState.slip.selections || [], manualStake, setManualSlipState)}
                  />
                )}
              </section>

              {/* LLM */}
              <section>
                <div className="mb-3 flex items-center gap-2 border-b border-white/[0.08] pb-2">
                  <Bot size={14} className="text-cyan-300" />
                  <span className="text-xs font-bold text-cyan-200">Maya — LLM Builder</span>
                  <span className="ml-auto text-[10px] text-slate-500">Live LLM reasoning per match</span>
                </div>
                <div className="border border-cyan-300/20 bg-cyan-300/[0.05] p-4">
                  <div className="flex flex-wrap items-end gap-3">
                    <label className="text-[10px] font-semibold uppercase text-slate-500">Target odds
                      <input value={llmTargetOdds} onChange={e => setLlmTargetOdds(e.target.value)} type="number" min="1.5" step="0.1" className="mt-1 block w-24 border border-white/[0.12] bg-black/30 px-2 py-2 text-sm text-white outline-none" />
                    </label>
                    <button type="button" onClick={buildLlm} disabled={llmBuilding} className="flex items-center gap-2 bg-cyan-300 px-3 py-2.5 text-xs font-bold text-slate-950 disabled:opacity-50">
                      {llmBuilding ? <LoaderCircle size={15} className="animate-spin" /> : <Sparkles size={15} />}
                      {llmBuilding ? 'Maya is reasoning…' : 'Ask Maya to build a ticket'}
                    </button>
                  </div>
                </div>
                {llmSlipState.slip && (
                  <SlipView
                    {...llmSlipState}
                    stake={llmStake}
                    onStakeChange={setLlmStake}
                    onSave={() => saveSlip(llmSlipState.slip.selections || [], 'ai', llmTargetOdds, setLlmSlipState)}
                    onBook={() => bookSlip(llmSlipState.slip.selections || [], llmStake, setLlmSlipState)}
                  />
                )}
              </section>
            </div>}

            {tab === 'results' && <section>
              <div className="grid grid-cols-4 border-y border-white/[0.08] py-3 text-center">
                <div><div className="text-lg font-bold">{learning.settled}</div><div className="text-[9px] uppercase text-slate-500">Settled</div></div>
                <div><div className="text-lg font-bold text-emerald-300">{learning.wins}</div><div className="text-[9px] uppercase text-slate-500">Won</div></div>
                <div><div className="text-lg font-bold text-rose-300">{learning.losses}</div><div className="text-[9px] uppercase text-slate-500">Lost</div></div>
                <div><div className="text-lg font-bold text-cyan-200">{learning.rate == null ? '--' : `${learning.rate}%`}</div><div className="text-[9px] uppercase text-slate-500">Win rate</div></div>
              </div>
              <div className="mt-4 space-y-2">
                {history.length === 0
                  ? <div className="py-12 text-center text-xs text-slate-500">Saved tickets will appear here as their legs are graded.</div>
                  : history.map((ticket: any) => (
                    <div key={ticket.id} className="border border-white/[0.08] bg-white/[0.025] p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold">Ticket #{ticket.id}</div>
                          <div className="mt-1 text-[10px] text-slate-500">{ticket.selections?.length || 0} legs · {Number(ticket.combined_odds || 0).toFixed(2)} odds</div>
                        </div>
                        <span className={`px-2 py-1 text-[9px] font-bold uppercase ${resultTone(ticket.result)}`}>{ticket.result || 'pending'}</span>
                      </div>
                      {ticket.learning?.failure_points?.length > 0 && <div className="mt-2 text-[10px] text-rose-200">What missed: {ticket.learning.failure_points.map((p: any) => p.selection).filter(Boolean).join(', ')}</div>}
                      {ticket.learning?.by_market && <div className="mt-2 text-[10px] text-slate-400">Learning saved by market and league for future AI ranking.</div>}
                    </div>
                  ))
                }
              </div>
            </section>}
          </main>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Builder;
