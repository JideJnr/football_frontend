import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Ticket, Trash2, AlertCircle, CheckCircle2, LoaderCircle } from 'lucide-react';
import { useBetSlipStore, BetSlipSelection } from '../../stores/betSlipStore/useBetSlipStore';
import { bookBetbuilderSmart } from '../../services/apis/footballApi';

const BetSlipWidget = () => {
  const [expanded, setExpanded] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [booking, setBooking] = useState(false);
  const [bookingResult, setBookingResult] = useState<any>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: window.innerWidth - 64, y: window.innerHeight - 80 });
  const didDrag = useRef(false);
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const onDragStart = useCallback((clientX: number, clientY: number) => {
    dragging.current = true;
    didDrag.current = false;
    dragOffset.current = { x: clientX - pos.x, y: clientY - pos.y };
  }, [pos]);

  const onDragMove = useCallback((clientX: number, clientY: number) => {
    if (!dragging.current) return;
    const el = widgetRef.current;
    const w = el?.offsetWidth ?? 72;
    const h = el?.offsetHeight ?? 72;
    didDrag.current = true;
    setPos({
      x: Math.min(Math.max(0, clientX - dragOffset.current.x), window.innerWidth - w),
      y: Math.min(Math.max(0, clientY - dragOffset.current.y), window.innerHeight - h),
    });
  }, []);

  const onDragEnd = useCallback(() => { dragging.current = false; }, []);

  useEffect(() => {
    const mm = (e: MouseEvent) => onDragMove(e.clientX, e.clientY);
    const tm = (e: TouchEvent) => onDragMove(e.touches[0].clientX, e.touches[0].clientY);
    const up = () => onDragEnd();
    window.addEventListener('mousemove', mm);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', tm);
    window.addEventListener('touchend', up);
    return () => {
      window.removeEventListener('mousemove', mm);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', tm);
      window.removeEventListener('touchend', up);
    };
  }, [onDragMove, onDragEnd]);

  const {
    selections,
    lastError,
    lastSuccess,
    removeSelection,
    clearSelections,
    getCombinedOdds,
    getSelectionCount,
    setError,
    setSuccess,
  } = useBetSlipStore();

  const count = getSelectionCount();
  const combinedOdds = getCombinedOdds();

  // Close on escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && expanded) {
        handleCloseAttempt();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [expanded, selections]);

  const handleCloseAttempt = () => {
    if (selections.length > 0 && !bookingResult) {
      setShowCloseConfirm(true);
    } else {
      setExpanded(false);
      setShowCloseConfirm(false);
      setBookingResult(null);
    }
  };

  const handleBook = async () => {
    if (!selections.length) return;
    setBooking(true);
    setBookingResult(null);
    setError(null);

    try {
      const result = await bookBetbuilderSmart({
        selections: selections.map(s => ({
          match_id: s.match_id,
          match: s.match,
          league: s.league,
          selection: s.selection,
          pick_type: s.pick_type,
          odds: s.odds,
          confidence: s.confidence,
        })),
        stake: 100,
      });

      setBookingResult(result);
      const code = result?.share_code;
      if (code) {
        setSuccess(`Booked! Share code: ${code}`);
      } else {
        setSuccess('Booking payload ready for SportyBet');
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const message = typeof detail === 'string' ? detail : detail?.message || 'Booking failed. Please try again.';
      setError(message);
    } finally {
      setBooking(false);
    }
  };

  const handleClearAll = () => {
    clearSelections();
    setBookingResult(null);
    setShowCloseConfirm(false);
  };

  // Minimized widget
  if (!expanded) {
    return (
      <div
        ref={widgetRef}
        className="fixed z-50"
        style={{ left: pos.x, top: pos.y }}
      >
        <button
          onMouseDown={(e) => { e.preventDefault(); onDragStart(e.clientX, e.clientY); }}
          onTouchStart={(e) => onDragStart(e.touches[0].clientX, e.touches[0].clientY)}
          onClick={() => { if (!didDrag.current) setExpanded(true); }}
          className="relative flex h-12 w-12 items-center justify-center rounded-full bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-400/30 transition-all hover:scale-105 active:scale-95 cursor-grab active:cursor-grabbing"
          aria-label="Open bet slip"
        >
          <Ticket size={22} strokeWidth={2.5} />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
              {count > 99 ? '99+' : count}
            </span>
          )}
        </button>

        {/* Success toast */}
        {lastSuccess && (
          <div className="absolute bottom-16 right-0 w-56 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300 shadow-xl">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} />
              <span className="truncate">{lastSuccess}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Expanded widget — draggable panel
  const isMobile = window.innerWidth < 640;
  const expandedStyle = isMobile
    ? { bottom: 0, left: 0, right: 0, top: 'auto', maxHeight: '85vh' }
    : { left: Math.min(pos.x, window.innerWidth - 320), top: Math.min(pos.y, window.innerHeight - 100), maxHeight: '80vh' };

  return (
    <div
      ref={widgetRef}
      className={`fixed z-50 bg-[#111318] shadow-2xl flex flex-col border border-white/[0.08] ${
        isMobile ? 'w-full rounded-t-2xl' : 'w-80 rounded-2xl'
      }`}
      style={expandedStyle}
    >
        {/* Header — drag handle */}
        <div
          className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3 cursor-grab active:cursor-grabbing select-none"
          onMouseDown={(e) => { e.preventDefault(); onDragStart(e.clientX, e.clientY); }}
          onTouchStart={(e) => onDragStart(e.touches[0].clientX, e.touches[0].clientY)}
        >
          <div className="flex items-center gap-2">
            <Ticket size={16} className="text-cyan-300" />
            <div>
              <div className="text-xs font-bold text-white">Bet Slip</div>
              <div className="text-[10px] text-slate-500">
                {count} selection{count !== 1 ? 's' : ''} · {combinedOdds.toFixed(2)} odds
              </div>
            </div>
          </div>
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={handleCloseAttempt}
            className="rounded-lg border border-white/10 p-1.5 text-slate-400 hover:text-white transition-colors"
            aria-label="Close bet slip"
          >
            <X size={14} />
          </button>
        </div>

        {/* Messages */}
        {lastError && (
          <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
            <AlertCircle size={14} />
            {lastError}
          </div>
        )}
        {lastSuccess && (
          <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
            <CheckCircle2 size={14} />
            {lastSuccess}
          </div>
        )}

        {/* Booking result */}
        {bookingResult && (
          <div className="mx-4 mt-3 space-y-2">
            {bookingResult?.dropped?.length > 0 && (
              <div className="space-y-1">
                {bookingResult.dropped.map((d: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-[10px] text-rose-300">
                    <X size={12} className="mt-0.5 shrink-0" />
                    <span>{d.match || d.match_id} — {d.selection}: market unavailable</span>
                  </div>
                ))}
              </div>
            )}
            {bookingResult?.replaced?.length > 0 && (
              <div className="space-y-1">
                {bookingResult.replaced.map((r: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-3 py-2 text-[10px] text-cyan-300">
                    <span className="mt-0.5 shrink-0 text-[10px]">🔄</span>
                    <span>{r.original?.match || r.original?.match_id} — {r.original?.selection} → {r.replacement?.selection}</span>
                  </div>
                ))}
              </div>
            )}
            {bookingResult?.share_code && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                Share code: <span className="font-mono font-bold">{bookingResult.share_code}</span>
              </div>
            )}
          </div>
        )}

        {/* Selections list */}
        <div className="overflow-y-auto px-4 py-3" style={{ maxHeight: '35vh' }}>
          {selections.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              <Ticket size={32} className="mx-auto mb-2 opacity-30" />
              Your bet slip is empty.<br />
              Add predictions from match pages.
            </div>
          ) : (
            <div className="space-y-2">
              {selections.map((selection) => (
                <div
                  key={selection.id}
                  className="group flex items-start gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 transition-colors hover:border-white/[0.12]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-xs font-bold text-white">{selection.match}</div>
                      <div className="text-sm font-bold text-cyan-300">{selection.odds.toFixed(2)}</div>
                    </div>
                    <div className="mt-0.5 text-[10px] text-slate-500">{selection.league}</div>
                    <div className="mt-1 text-xs text-slate-300">{selection.selection}</div>
                    {selection.confidence != null && (
                      <div className="mt-1 text-[10px] text-slate-500">{selection.confidence}% confidence</div>
                    )}
                  </div>
                  <button
                    onClick={() => removeSelection(selection.id)}
                    className="shrink-0 rounded-lg border border-white/10 p-1.5 text-slate-500 opacity-0 transition-all group-hover:opacity-100 hover:border-rose-500/40 hover:text-rose-400"
                    aria-label={`Remove ${selection.selection}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer actions */}
        {selections.length > 0 && (
          <div className="border-t border-white/[0.06] px-4 py-2.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">{count} leg{count !== 1 ? 's' : ''}</span>
              <span className="font-bold text-white">{combinedOdds.toFixed(2)} combined odds</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleClearAll}
                className="flex-1 rounded-lg border border-white/10 py-2 text-xs font-semibold text-slate-400 hover:border-rose-500/40 hover:text-rose-300 transition-colors"
              >
                Clear All
              </button>
              <button
                onClick={handleBook}
                disabled={booking || selections.length === 0}
                className="flex-[2] flex items-center justify-center gap-2 rounded-lg bg-emerald-400 py-2 text-xs font-bold text-slate-950 disabled:opacity-50 transition-colors hover:bg-emerald-300"
              >
                {booking ? (
                  <>
                    <LoaderCircle size={13} className="animate-spin" />
                    Booking...
                  </>
                ) : (
                  <>Book with Sporty</>
                )}
              </button>
            </div>
          </div>
        )}

      {/* Close confirmation modal */}
      {showCloseConfirm && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-black/60 backdrop-blur-sm">
          <div className="mx-4 rounded-xl border border-white/[0.08] bg-[#1a1d24] p-4 shadow-2xl">
            <div className="text-xs font-bold text-white">Unbooked selections</div>
            <p className="mt-1.5 text-[10px] text-slate-400">
              You have {count} selection{count !== 1 ? 's' : ''} not yet booked. Closing will keep them saved.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setShowCloseConfirm(false)}
                className="flex-1 rounded-lg border border-white/10 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/[0.04] transition-colors"
              >
                Keep Open
              </button>
              <button
                onClick={() => {
                  setShowCloseConfirm(false);
                  setExpanded(false);
                  setBookingResult(null);
                }}
                className="flex-1 rounded-lg border border-rose-500/30 bg-rose-500/10 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition-colors"
              >
                Close Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BetSlipWidget;
