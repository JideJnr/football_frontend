import { useIonRouter } from '@ionic/react';
import { useEffect, useState, useCallback } from 'react';
import {
  triggerIngestUpcoming,
  triggerIngestLive,
  triggerEnrichWorker,
  triggerGradeResults,
  getBufferStatus,
  purgeGhostMatches,
  triggerRefreshBufferOdds,
  runSofaPipeline,
  getPipelines,
} from '../../../services/apis/footballApi';

// ── Types ─────────────────────────────────────────────────────────────────────

type Status = 'idle' | 'loading' | 'ok' | 'error';

interface ActivityEvent {
  ts: string;
  job: string;
  status: string;
  message: string;
  match_id?: string;
  match_name?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const eventTone = (status?: string) => {
  if (status === 'error') return 'bg-red-500';
  if (status === 'predicted' || status === 'matched' || status === 'ok') return 'bg-emerald-400';
  if (status === 'running') return 'bg-yellow-400 animate-pulse';
  if (status === 'waiting') return 'bg-orange-400';
  return 'bg-gray-500';
};

const timeLabel = (value?: string) => {
  if (!value) return '';
  const d = new Date(value);
  return isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

// ── Settings page ─────────────────────────────────────────────────────────────

const Settings = () => {
  const router = useIonRouter();

  const [bufferStats, setBufferStats] = useState<any>(null);
  const [activity, setActivity] = useState<{ current?: ActivityEvent; events: ActivityEvent[] }>({ events: [] });
  const [results, setResults] = useState<Record<string, { status: Status; msg: string }>>({});
  // Pipeline summary for the nav button badge
  const [pipelineSummary, setPipelineSummary] = useState<{ enabled: number; total: number } | null>(null);

  const loadBufferStats = useCallback(async () => {
    try {
      const res = await getBufferStatus();
      setBufferStats(res.buffer);
      if (res.activity) setActivity(res.activity);
    } catch {}
  }, []);

  const loadPipelineSummary = useCallback(async () => {
    try {
      const res = await getPipelines();
      const all: any[] = res.pipelines ?? [];
      setPipelineSummary({ enabled: all.filter((p: any) => p.enabled).length, total: all.length });
    } catch {}
  }, []);

  useEffect(() => {
    loadBufferStats();
    loadPipelineSummary();
    const t = window.setInterval(() => {
      loadBufferStats();
      loadPipelineSummary();
    }, 6000);
    return () => window.clearInterval(t);
  }, [loadBufferStats, loadPipelineSummary]);

  const run = async (key: string, fn: () => Promise<any>, fmt: (res: any) => string) => {
    setResults(r => ({ ...r, [key]: { status: 'loading', msg: '' } }));
    try {
      const res = await fn();
      setResults(r => ({ ...r, [key]: { status: 'ok', msg: fmt(res) } }));
      loadBufferStats();
    } catch (e: any) {
      setResults(r => ({ ...r, [key]: { status: 'error', msg: e?.response?.data?.detail || e?.message || 'Failed' } }));
    }
  };

  const openMatch = (matchId?: string) => {
    if (matchId) router.push(`/match/${encodeURIComponent(matchId)}`, 'forward', 'push');
  };

  const bufferItems = [
    { label: 'Upcoming',         val: bufferStats?.upcoming,         tone: 'text-yellow-300' },
    { label: 'Future queued',    val: bufferStats?.future_buffered,  tone: 'text-sky-300' },
    { label: 'Needs enrichment', val: bufferStats?.needs_enrichment, tone: 'text-orange-300' },
    { label: 'No Sofa match',    val: bufferStats?.no_sofa_match,    tone: 'text-rose-300' },
    { label: 'Ready',            val: bufferStats?.ready,            tone: 'text-emerald-300' },
    { label: 'Deferred',         val: bufferStats?.deferred,         tone: 'text-amber-300' },
    { label: 'Stale live',       val: bufferStats?.stale_live,       tone: 'text-red-400' },
  ];

  const manualActions = [
    { key: 'odds',     label: 'Refresh Buffer Odds',     icon: 'OD', desc: 'Update odds, status, time, and movement snapshots.', fn: () => triggerRefreshBufferOdds(), fmt: (r: any) => `${r.fetched ?? 0} fetched` },
    { key: 'upcoming', label: 'Ingest Upcoming',          icon: '📥', desc: 'Fetch upcoming matches from SportyBet.',              fn: () => triggerIngestUpcoming(),    fmt: (r: any) => `${r.ingested ?? 0} new matches buffered` },
    { key: 'live',     label: 'Ingest Live',              icon: '🔴', desc: 'Fetch live matches + patch scores.',                  fn: () => triggerIngestLive(),        fmt: (r: any) => `${r.live_count ?? 0} live · ${r.patched ?? 0} patched` },
    { key: 'enrich',   label: 'Run Enrichment',           icon: '⚡', desc: 'Match buffer entries to SofaScore and predict.',      fn: () => triggerEnrichWorker(),      fmt: (r: any) => `${r.stored ?? 0} enriched · ${r.matched ?? 0} matched` },
    { key: 'sofa_run', label: 'SofaScore Pipeline Run',   icon: '🌐', desc: 'One full SofaScore-only cycle (cloud-safe).',         fn: () => runSofaPipeline(),          fmt: (r: any) => `${r.enrich?.enriched ?? 0} enriched · ${r.enrich?.predicted ?? 0} predicted` },
    { key: 'purge',    label: 'Purge Ghost Matches',      icon: '🧹', desc: 'Remove stale matches that never kicked off.',         fn: () => purgeGhostMatches(),        fmt: (r: any) => `${r.purged_ghosts ?? 0} purged` },
    { key: 'grade',    label: 'Grade Results',            icon: '✅', desc: 'Grade predictions + archive to MongoDB.',             fn: () => triggerGradeResults(48),    fmt: (r: any) => `${r.graded ?? r.predictions_graded ?? 0} graded` },
  ] as const;

  const current = activity.current;

  return (
    <div className="w-full h-full bg-[#0e0e0e] text-white flex flex-col overflow-y-auto">

      {/* ── Buffer stats ───────────────────────────────────────────────────── */}
      <div className="shrink-0 border-b border-white/[0.06] bg-[#111] px-4 py-2">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Match Buffer</span>
          <button onClick={loadBufferStats} className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold">↻</button>
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {bufferItems.map(({ label, val, tone }) => (
            <div key={label} className="shrink-0 rounded-lg bg-white/[0.04] border border-white/[0.07] px-3 py-1.5 text-center min-w-[90px]">
              <div className={`text-sm font-bold ${tone}`}>{val ?? '—'}</div>
              <div className="text-[9px] text-gray-600 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 space-y-6">

        {/* ── Activity log ────────────────────────────────────────────────── */}
        <div>
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">System Activity</div>
          <div className="rounded-xl bg-[#161616] border border-white/[0.07] overflow-hidden">
            <button
              type="button"
              onClick={() => openMatch(current?.match_id)}
              disabled={!current?.match_id}
              className="w-full text-left px-4 py-3 border-b border-white/[0.06] bg-white/[0.02] disabled:cursor-default enabled:hover:bg-white/[0.04] transition-all"
            >
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${eventTone(current?.status)}`} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-gray-100 truncate">{current?.message || 'Waiting for activity…'}</div>
                  <div className="text-[10px] text-gray-600">{current?.job || 'system'}{current?.ts ? ` · ${timeLabel(current.ts)}` : ''}</div>
                </div>
              </div>
            </button>
            <div className="max-h-[180px] overflow-y-auto">
              {(activity.events || []).slice(0, 6).map((ev, idx) => (
                <button
                  type="button"
                  key={`${ev.ts}-${idx}`}
                  onClick={() => openMatch(ev.match_id)}
                  disabled={!ev.match_id}
                  className="w-full text-left px-4 py-2.5 border-b border-white/[0.04] last:border-b-0 disabled:cursor-default enabled:hover:bg-white/[0.04] transition-all"
                >
                  <div className="flex items-start gap-2">
                    <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${eventTone(ev.status)}`} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] text-gray-200 truncate">{ev.message}</div>
                      <div className="text-[10px] text-gray-600">{timeLabel(ev.ts)} · {ev.job}</div>
                    </div>
                  </div>
                </button>
              ))}
              {!activity.events?.length && (
                <div className="px-4 py-4 text-[12px] text-gray-500">No activity recorded yet.</div>
              )}
            </div>
          </div>
        </div>

        {/* ── Manual triggers ──────────────────────────────────────────────── */}
        <div>
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3">Manual Triggers</div>
          <div className="space-y-2">
            {manualActions.map(({ key, label, icon, desc, fn, fmt }) => {
              const r = results[key];
              const loading = r?.status === 'loading';
              return (
                <div key={key} className="rounded-xl bg-[#161616] border border-white/[0.07] px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg shrink-0">{icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-200">{label}</div>
                      <div className="text-[11px] text-gray-600">{desc}</div>
                    </div>
                    <button
                      onClick={() => run(key, fn, fmt)}
                      disabled={loading}
                      className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-40 transition-all"
                    >
                      {loading ? '…' : 'Run'}
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

        {/* ── Navigation ───────────────────────────────────────────────────── */}
        <div>
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3">More</div>
          {[
            {
              path: '/pipelines',
              icon: '⚙',
              label: 'Pipeline Control',
              desc: pipelineSummary
                ? `${pipelineSummary.enabled}/${pipelineSummary.total} pipelines active — toggle live, prematch, SofaScore, and more`
                : 'Toggle live, prematch, SofaScore-only and other pipelines',
              highlight: true,
            },
            { path: '/scheduler',                 icon: 'SC', label: 'Scheduler',             desc: 'Adjust run intervals for active pipeline jobs',          highlight: true },
            { path: '/prediction/picks-hub',      icon: 'AI', label: 'Picks Hub',             desc: 'Browse upcoming predictions and build AI-validated slips', highlight: true },
            { path: '/prediction/dashboard',      icon: 'AI', label: 'Prediction Dashboard',  desc: 'Picks, explanations, model health and learning loop', highlight: false },
            { path: '/prediction/model-explorer', icon: 'M',  label: 'Model Explorer',         desc: 'Filter picks by proven accuracy',                     highlight: false },
            { path: '/analytics',                 icon: '📊', label: 'Analytics',              desc: 'Performance and ROI analysis',                         highlight: false },
            { path: '/analytics/upcoming',        icon: 'AI', label: 'Upcoming Ratings',       desc: 'Enriched and predicted matches ranked by assurance',  highlight: false },
          ].map(({ path, icon, label, desc, highlight }) => (
            <button
              key={path}
              onClick={() => router.push(path, 'forward', 'push')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left mt-2 first:mt-0 ${
                highlight
                  ? 'bg-emerald-500/[0.06] border-emerald-500/25 hover:border-emerald-500/50'
                  : 'bg-[#161616] border-white/[0.07] hover:border-emerald-500/30'
              }`}
            >
              <span className="text-lg shrink-0">{icon}</span>
              <div className="min-w-0 flex-1">
                <span className={`block text-sm font-semibold ${highlight ? 'text-emerald-300' : 'text-gray-200'}`}>{label}</span>
                <span className="block text-[11px] text-gray-500">{desc}</span>
              </div>
              <svg className="w-4 h-4 text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>

      </div>
    </div>
  );
};

export default Settings;
