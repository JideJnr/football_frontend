import { useEffect, useMemo, useState } from 'react';
import { IonContent, IonPage, useIonRouter } from '@ionic/react';
import { ArrowLeft, Bot, Check, ChevronRight, ClipboardCheck, History, LoaderCircle, Sparkles, Ticket, X } from 'lucide-react';
import { bookBetbuilderSmart, buildAutoBetbuilder, getBetbuilderHistory, getPredictionHistory, saveBetbuilder } from '../../../../services/apis/footballApi';

type Mode = 'ai' | 'manual' | 'results';

const confidenceTone = (value: number) => value >= 70 ? 'text-emerald-300' : value >= 58 ? 'text-amber-200' : 'text-rose-300';
const resultTone = (value?: string) => value === 'win' ? 'bg-emerald-300/10 text-emerald-200' : value === 'loss' ? 'bg-rose-300/10 text-rose-200' : 'bg-amber-300/10 text-amber-100';
const pretty = (value?: string) => String(value || '').replace(/_/g, ' ');

const combinedOdds = (picks: any[]) => picks.reduce((total, pick) => total * Number(pick.odds || pick.estimated_odds || 1), 1);

const Builder = () => {
  const router = useIonRouter();
  const [mode, setMode] = useState<Mode>('ai');
  const [predictions, setPredictions] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [aiSlip, setAiSlip] = useState<any>(null);
  const [bookResult, setBookResult] = useState<any>(null);
  const [manualPicks, setManualPicks] = useState<any[]>([]);
  const [targetOdds, setTargetOdds] = useState('3.0');
  const [stake, setStake] = useState('100');
  const [building, setBuilding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [booking, setBooking] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const [predictionResponse, historyResponse] = await Promise.all([getPredictionHistory(150), getBetbuilderHistory(100)]);
      const seen = new Set<string>();
      setPredictions((predictionResponse?.predictions || []).filter((item: any) => {
        const matchId = String(item.match_id || '');
        if (!matchId || seen.has(matchId) || item.best_pick?.type === 'no_bet') return false;
        seen.add(matchId);
        return true;
      }));
      setHistory(historyResponse?.bets || []);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Could not load the betting workspace.');
    }
  };

  useEffect(() => { load(); }, []);

  const learning = useMemo(() => {
    const settled = history.filter(item => item.result === 'win' || item.result === 'loss');
    const wins = settled.filter(item => item.result === 'win').length;
    const losses = settled.filter(item => item.result === 'loss').length;
    return { settled: settled.length, wins, losses, rate: settled.length ? Math.round((wins / settled.length) * 100) : null };
  }, [history]);

  const buildAiSlip = async () => {
    setBuilding(true); setError(''); setNotice('');
    try {
      const target = Math.max(1.5, Number(targetOdds) || 3);
      const result = await buildAutoBetbuilder({
        target_odds: target,
        max_total_odds: Number((target * 1.25).toFixed(2)),
        candidate_limit: 10,
      });
      setAiSlip(result);
      setNotice('I reviewed the strongest current matches and kept the ticket within the odds ceiling.');
    } catch (err: any) {
      setError(err?.response?.data?.detail?.message || err?.response?.data?.detail || 'The AI analyst could not build a ticket right now.');
    } finally { setBuilding(false); }
  };

  const saveSlip = async (selections: any[], source: 'ai' | 'manual') => {
    if (!selections.length) return;
    setSaving(true); setError('');
    try {
      await saveBetbuilder({ selections, request: { builder: source, target_odds: source === 'ai' ? Number(targetOdds) : null } });
      setNotice(source === 'ai' ? 'AI ticket saved. Its legs will be graded as matches finish.' : 'Manual ticket saved. Its legs will be graded as matches finish.');
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Could not save this ticket.');
    } finally { setSaving(false); }
  };

  const bookSlip = async () => {
    const selections = aiSlip?.selections || [];
    if (!selections.length) return;
    setBooking(true); setError(''); setBookResult(null);
    try {
      const result = await bookBetbuilderSmart({ selections, stake: Number(stake) || 0 });
      setBookResult(result);
      setAiSlip((current: any) => ({ ...current, booking: result }));
      const dropped = result?.dropped?.length || 0;
      const replaced = result?.replaced?.length || 0;
      const code = result?.share_code;
      if (code) setNotice(`Booked ✓ Share code: ${code}${dropped ? ` · ${dropped} leg(s) dropped` : ''}${replaced ? ` · ${replaced} replaced by Maya` : ''}`);
      else if (dropped || replaced) setNotice(`Payload ready · ${dropped} leg(s) dropped${replaced ? `, ${replaced} replaced by Maya` : ''}.`);
      else setNotice('The booking payload is ready for SportyBet.');
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : detail?.message || 'SportyBet booking could not be prepared.');
    } finally { setBooking(false); }
  };

  const toggleManual = (prediction: any) => {
    const pick = prediction.best_pick || {};
    const item = {
      match_id: prediction.match_id,
      match: prediction.match_name,
      league: prediction.league_name,
      country: prediction.country_name,
      type: pick.type || pick.pick_type,
      pick_type: pick.type || pick.pick_type,
      selection: pick.selection,
      odds: Number(pick.odds || (pick.confidence ? (1 / (pick.confidence / 100)).toFixed(2) : 1.5)),
      confidence: Number(pick.confidence || 0),
      reason: pick.reason,
      signals: prediction.signals || [],
    };
    setManualPicks(current => current.some(p => p.match_id === item.match_id) ? current.filter(p => p.match_id !== item.match_id) : [...current, item]);
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
            <nav className="mb-4 grid grid-cols-3 gap-1 border-b border-white/[0.08] pb-2">
              {([
                ['ai', 'AI Builder', Bot], ['manual', 'Manual Builder', Ticket], ['results', 'Results', History],
              ] as const).map(([value, label, Icon]) => <button key={value} type="button" onClick={() => setMode(value)} className={`flex items-center justify-center gap-1.5 px-2 py-2 text-[11px] font-bold ${mode === value ? 'border-b-2 border-cyan-300 text-cyan-200' : 'text-slate-500'}`}><Icon size={14} />{label}</button>)}
            </nav>

            {error && <div className="mb-3 border-l-2 border-rose-300 bg-rose-300/[0.07] px-3 py-2 text-xs text-rose-100">{error}</div>}
            {notice && <div className="mb-3 border-l-2 border-emerald-300 bg-emerald-300/[0.07] px-3 py-2 text-xs text-emerald-100">{notice}</div>}

            {mode === 'ai' && <section>
              <div className="border border-cyan-300/20 bg-cyan-300/[0.05] p-4">
                <div className="flex gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-cyan-300 text-slate-950"><Bot size={19} /></div><div><div className="text-xs font-bold text-cyan-100">Maya, AI ticket analyst</div><p className="mt-1 text-xs leading-5 text-slate-300">I compare the engine pick, match-specific AI view, similar finished matches, and what previous ticket legs have taught us. I only suggest a ticket when the evidence has a coherent shape.</p></div></div>
                <div className="mt-4 flex flex-wrap items-end gap-3"><label className="text-[10px] font-semibold uppercase text-slate-500">Target odds<input value={targetOdds} onChange={e => setTargetOdds(e.target.value)} type="number" min="1.5" step="0.1" className="mt-1 block w-24 border border-white/[0.12] bg-black/30 px-2 py-2 text-sm text-white outline-none" /></label><button type="button" onClick={buildAiSlip} disabled={building} className="flex items-center gap-2 bg-cyan-300 px-3 py-2.5 text-xs font-bold text-slate-950 disabled:opacity-50">{building ? <LoaderCircle size={15} className="animate-spin" /> : <Sparkles size={15} />}{building ? 'Maya is reviewing matches' : 'Ask Maya to build a ticket'}</button></div>
              </div>

              {aiSlip && <div className="mt-4">
                <div className="border-b border-white/[0.08] pb-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><div className="text-sm font-bold">Suggested ticket</div><p className="mt-1 text-xs text-slate-400">{aiSlip.synthesis_reasoning || 'This ticket favours the best aligned current analyses.'}</p></div><div className="text-right"><div className="text-lg font-bold text-cyan-200">{Number(aiSlip.combined_odds || combinedOdds(aiSlip.selections || [])).toFixed(2)}</div><div className="text-[9px] uppercase text-slate-500">combined odds</div></div></div></div>
                <div className="divide-y divide-white/[0.07] border-x border-b border-white/[0.08]">
                  {(aiSlip.selections || []).map((pick: any) => <div key={`${pick.match_id}-${pick.selection}`} className="p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="truncate text-xs font-bold">{pick.match || pick.match_name}</div><div className="mt-0.5 text-[10px] text-slate-500">{pick.league || 'Match analysis'}</div></div><div className={`text-sm font-bold ${confidenceTone(Number(pick.confidence || pick.groq_confidence || 0))}`}>{pick.confidence || pick.groq_confidence}%</div></div><div className="mt-2 flex items-center justify-between gap-2"><span className="text-sm font-semibold text-cyan-100">{pick.selection}</span><span className="text-xs text-slate-400">{Number(pick.odds || pick.estimated_odds || 0).toFixed(2)}</span></div><p className="mt-2 text-[11px] leading-4 text-slate-400">{pick.synthesis_reasoning || 'Included for its current AI conviction.'}</p>{pick.learning?.samples > 0 && <div className="mt-2 text-[10px] text-violet-200">Past legs: {Math.round(Number(pick.learning.win_rate || 0) * 100)}% win rate across {pick.learning.samples} comparable selections</div>}</div>)}
                </div>
                <div className="mt-3 flex flex-wrap items-end gap-2"><label className="text-[10px] text-slate-500">Stake<input value={stake} onChange={e => setStake(e.target.value)} type="number" min="1" className="ml-2 w-20 border border-white/[0.12] bg-black/30 px-2 py-2 text-xs text-white outline-none" /></label><button type="button" onClick={() => saveSlip(aiSlip.selections || [], 'ai')} disabled={saving} className="bg-white px-3 py-2 text-xs font-bold text-slate-950 disabled:opacity-50">{saving ? 'Saving...' : 'Save ticket'}</button><button type="button" onClick={bookSlip} disabled={booking} className="bg-emerald-400 px-3 py-2 text-xs font-bold text-slate-950 disabled:opacity-50">{booking ? <span className="flex items-center gap-1.5"><LoaderCircle size={13} className="animate-spin" />Checking markets…</span> : 'Book with SportyBet'}</button></div>
                {bookResult?.dropped?.length > 0 && <div className="mt-3 space-y-1">{bookResult.dropped.map((d: any, i: number) => <div key={i} className="flex items-start gap-2 border-l-2 border-rose-400 bg-rose-400/[0.07] px-2 py-1.5 text-[10px] text-rose-200"><X size={11} className="mt-0.5 shrink-0" /><span><span className="font-bold">{d.match || d.match_id}</span> — {d.selection} removed: market unavailable</span></div>)}</div>}
                {bookResult?.replaced?.length > 0 && <div className="mt-2 space-y-1">{bookResult.replaced.map((r: any, i: number) => <div key={i} className="flex items-start gap-2 border-l-2 border-cyan-400 bg-cyan-400/[0.07] px-2 py-1.5 text-[10px] text-cyan-200"><Bot size={11} className="mt-0.5 shrink-0" /><span><span className="font-bold">{r.original?.match || r.original?.match_id}</span> — Maya replaced <em>{r.original?.selection}</em> → <strong>{r.replacement?.selection}</strong></span></div>)}</div>}
              </div>}
            </section>}

            {mode === 'manual' && <section>
              <div className="mb-3 border-l-2 border-amber-300 bg-amber-300/[0.06] px-3 py-2 text-xs text-slate-300">Your ticket, your decisions. Choose from the current engine predictions and we will still grade every leg after the match.</div>
              <div className="space-y-2">{predictions.map((prediction: any) => { const pick = prediction.best_pick || {}; const selected = manualPicks.some(item => item.match_id === prediction.match_id); return <div key={prediction.id || prediction.match_id} className="border border-white/[0.08] bg-white/[0.025] p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="truncate text-xs font-bold">{prediction.match_name}</div><div className="mt-0.5 text-[10px] text-slate-500">{prediction.league_name || 'Competition unavailable'}</div></div><button type="button" onClick={() => toggleManual(prediction)} className={`grid h-7 w-7 place-items-center border ${selected ? 'border-emerald-300 bg-emerald-300 text-slate-950' : 'border-white/[0.18] text-slate-500'}`}>{selected ? <Check size={15} /> : <ChevronRight size={15} />}</button></div><div className="mt-3 flex items-center justify-between gap-2"><div><div className="text-sm font-semibold text-white">{pick.selection || 'No selection'}</div><div className="mt-1 text-[10px] text-slate-500">{pretty(pick.type || pick.pick_type)}</div></div><div className={`text-sm font-bold ${confidenceTone(Number(pick.confidence || 0))}`}>{pick.confidence || 0}%</div></div>{pick.reason && <p className="mt-2 line-clamp-2 text-[11px] leading-4 text-slate-400">{pick.reason}</p>}</div>})}</div>
              <div className="sticky bottom-0 mt-4 border border-white/[0.1] bg-[#161b22] p-3"><div className="flex items-center justify-between text-xs"><span className="text-slate-400">{manualPicks.length} legs selected</span><span className="font-bold text-white">{combinedOdds(manualPicks).toFixed(2)} odds</span></div><button type="button" onClick={() => saveSlip(manualPicks, 'manual')} disabled={!manualPicks.length || saving} className="mt-3 w-full bg-amber-300 py-2.5 text-xs font-bold text-slate-950 disabled:opacity-50">{saving ? 'Saving...' : 'Save manual ticket'}</button></div>
            </section>}

            {mode === 'results' && <section>
              <div className="grid grid-cols-4 border-y border-white/[0.08] py-3 text-center"><div><div className="text-lg font-bold">{learning.settled}</div><div className="text-[9px] uppercase text-slate-500">Settled</div></div><div><div className="text-lg font-bold text-emerald-300">{learning.wins}</div><div className="text-[9px] uppercase text-slate-500">Won</div></div><div><div className="text-lg font-bold text-rose-300">{learning.losses}</div><div className="text-[9px] uppercase text-slate-500">Lost</div></div><div><div className="text-lg font-bold text-cyan-200">{learning.rate == null ? '--' : `${learning.rate}%`}</div><div className="text-[9px] uppercase text-slate-500">Win rate</div></div></div>
              <div className="mt-4 space-y-2">{history.length === 0 ? <div className="py-12 text-center text-xs text-slate-500">Saved tickets will appear here as their legs are graded.</div> : history.map((ticket: any) => <div key={ticket.id} className="border border-white/[0.08] bg-white/[0.025] p-3"><div className="flex items-center justify-between"><div><div className="text-xs font-bold">Ticket #{ticket.id}</div><div className="mt-1 text-[10px] text-slate-500">{ticket.selections?.length || 0} legs · {Number(ticket.combined_odds || 0).toFixed(2)} odds</div></div><span className={`px-2 py-1 text-[9px] font-bold uppercase ${resultTone(ticket.result)}`}>{ticket.result || 'pending'}</span></div>{ticket.learning?.failure_points?.length > 0 && <div className="mt-2 text-[10px] text-rose-200">What missed: {ticket.learning.failure_points.map((point: any) => point.selection).filter(Boolean).join(', ')}</div>}{ticket.learning?.by_market && <div className="mt-2 text-[10px] text-slate-400">Learning saved by market and league for future AI ranking.</div>}</div>)}</div>
            </section>}
          </main>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Builder;
