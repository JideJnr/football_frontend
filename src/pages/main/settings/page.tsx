import { useIonRouter } from '@ionic/react';
import { useEffect, useState } from 'react';
import { triggerIngestUpcoming, triggerIngestLive, triggerEnrichWorker, triggerGradeResults, getBufferStatus } from '../../../services/apis/footballApi';

type Status = 'idle' | 'loading' | 'ok' | 'error';
interface ActionResult { label: string; status: Status; msg: string; }

const Settings = () => {
  const router = useIonRouter();
  const [results, setResults] = useState<Record<string, ActionResult>>({});
  const [bufferStats, setBufferStats] = useState<any>(null);

  const loadBufferStats = async () => {
    try {
      const res = await getBufferStatus();
      setBufferStats(res.buffer);
    } catch {}
  };

  useEffect(() => { loadBufferStats(); }, []);

  const run = async (key: string, label: string, fn: () => Promise<any>) => {
    setResults(r => ({ ...r, [key]: { label, status: 'loading', msg: '' } }));
    try {
      const res = await fn();
      const msg =
        key === 'upcoming' ? `${res.ingested ?? 0} new matches buffered` :
        key === 'live'     ? `${res.live_count ?? 0} live · ${res.new ?? 0} new · ${res.patched ?? 0} patched` :
        key === 'enrich'   ? `${res.stored ?? 0} enriched · ${res.matched ?? 0} matched` :
        key === 'grade'    ? `${res.predictions_graded ?? 0} graded · ${res.matches_archived ?? 0} archived · ${res.results_fetched ?? 0} fetched` :
        JSON.stringify(res).slice(0, 80);
      setResults(r => ({ ...r, [key]: { label, status: 'ok', msg } }));
      if (key === 'live' || key === 'upcoming') loadBufferStats();
    } catch (e: any) {
      setResults(r => ({ ...r, [key]: { label, status: 'error', msg: e?.response?.data?.detail || e?.message || 'Failed' } }));
    }
  };

  const actions = [
    { key: 'upcoming', label: 'Ingest Upcoming', desc: 'Fetch upcoming matches from SportyBet', icon: '📥', fn: triggerIngestUpcoming },
    { key: 'live',     label: 'Ingest Live',     desc: 'Fetch live matches + patch scores',    icon: '🔴', fn: triggerIngestLive },
    { key: 'enrich',   label: 'Run Enrichment',  desc: 'Match buffer entries to SofaScore',    icon: '⚡', fn: triggerEnrichWorker },
    { key: 'grade',    label: 'Grade Results',   desc: 'Grade predictions + archive to MongoDB', icon: '✅', fn: () => triggerGradeResults(48) },
  ];

  const bufferItems = [
    { label: 'Total',    val: bufferStats?.total_buffered },
    { label: 'Live',     val: bufferStats?.live,               tone: 'text-red-400' },
    { label: 'Upcoming', val: bufferStats?.upcoming,           tone: 'text-yellow-400' },
    { label: 'Enriched', val: bufferStats?.enriched,           tone: 'text-emerald-400' },
    { label: 'Pending',  val: bufferStats?.pending_enrichment, tone: 'text-orange-400' },
  ];

  return (
    <div className="w-full h-full bg-[#0e0e0e] text-white flex flex-col overflow-y-auto">

      {/* ── Buffer filter bar ── */}
      <div className="shrink-0 border-b border-white/[0.06] bg-[#111] px-4 py-2">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Match Buffer</span>
          <button onClick={loadBufferStats} className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold">↻ Refresh</button>
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {bufferItems.map(({ label, val, tone }) => (
            <div key={label} className="shrink-0 rounded-lg bg-white/[0.04] border border-white/[0.07] px-3 py-1.5 text-center min-w-[60px]">
              <div className={`text-sm font-bold ${tone ?? 'text-white'}`}>{val ?? '—'}</div>
              <div className="text-[9px] text-gray-600 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 space-y-6">

        {/* ── Ingest controls ── */}
        <div>
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3">Data Ingest</div>
          <div className="space-y-2">
            {actions.map(({ key, label, desc, icon, fn }) => {
              const r = results[key];
              const loading = r?.status === 'loading';
              return (
                <div key={key} className="rounded-xl bg-[#161616] border border-white/[0.07] px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-200">{label}</div>
                      <div className="text-[11px] text-gray-600">{desc}</div>
                    </div>
                    <button
                      onClick={() => run(key, label, fn)}
                      disabled={loading}
                      className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-40 transition-all"
                    >
                      {loading ? 'Running…' : 'Run'}
                    </button>
                  </div>
                  {r && r.status !== 'loading' && (
                    <div className={`mt-2 text-[11px] px-1 ${r.status === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {r.status === 'ok' ? '✓' : '✗'} {r.msg}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Navigation ── */}
        <div>
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3">More</div>
          <button
            onClick={() => router.push('/analytics', 'forward', 'push')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#161616] border border-white/[0.07] hover:border-emerald-500/30 transition-all text-left"
          >
            <span className="text-lg">📊</span>
            <span className="text-sm font-semibold text-gray-200">Analytics</span>
            <svg className="w-4 h-4 text-gray-600 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

      </div>
    </div>
  );
};

export default Settings;
