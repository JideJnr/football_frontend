import { useIonRouter } from '@ionic/react';
import { useEffect, useState } from 'react';
import { triggerIngestUpcoming, triggerIngestLive, triggerEnrichWorker, triggerGradeResults, getBufferStatus, purgeGhostMatches, getLivePriorityMode, setLivePriorityMode, triggerRefreshBufferOdds } from '../../../services/apis/footballApi';

type Status = 'idle' | 'loading' | 'ok' | 'error';
interface ActionResult { label: string; status: Status; msg: string; }
interface ActivityEvent {
  ts: string;
  job: string;
  status: string;
  message: string;
  match_id?: string;
  match_name?: string;
  details?: Record<string, any>;
}

const Settings = () => {
  const router = useIonRouter();
  const [results, setResults] = useState<Record<string, ActionResult>>({});
  const [bufferStats, setBufferStats] = useState<any>(null);
  const [activity, setActivity] = useState<{ current?: ActivityEvent; events: ActivityEvent[] }>({ events: [] });
  const [livePriority, setLivePriority] = useState<{ enabled: boolean; loading: boolean; msg: string }>({ enabled: false, loading: true, msg: '' });

  const loadBufferStats = async () => {
    try {
      const res = await getBufferStatus();
      setBufferStats(res.buffer);
      if (res.activity) setActivity(res.activity);
    } catch {}
  };

  useEffect(() => {
    loadBufferStats();
    loadLivePriorityMode();
    const timer = window.setInterval(loadBufferStats, 5000);
    return () => window.clearInterval(timer);
  }, []);

  const loadLivePriorityMode = async () => {
    try {
      const res = await getLivePriorityMode();
      setLivePriority({
        enabled: !!res.enabled,
        loading: false,
        msg: res.enabled ? 'Continuous live lane is active' : 'Normal scheduler priority',
      });
    } catch (e: any) {
      setLivePriority(s => ({
        ...s,
        loading: false,
        msg: e?.response?.data?.detail || e?.message || 'Could not load live priority mode',
      }));
    }
  };

  const toggleLivePriority = async () => {
    const next = !livePriority.enabled;
    setLivePriority(s => ({
      ...s,
      enabled: next,
      loading: true,
      msg: next ? 'Enabling continuous live lane...' : 'Disabling continuous live lane...',
    }));
    try {
      const res = await setLivePriorityMode(next);
      setLivePriority({
        enabled: !!res.enabled,
        loading: false,
        msg: res.enabled ? `Running every ${res.interval_seconds ?? 20}s` : 'Normal scheduler priority',
      });
      loadBufferStats();
    } catch (e: any) {
      setLivePriority(s => ({
        ...s,
        enabled: !next,
        loading: false,
        msg: e?.response?.data?.detail || e?.message || 'Failed to update live priority',
      }));
    }
  };

  const run = async (key: string, label: string, fn: () => Promise<any>) => {
    setResults(r => ({ ...r, [key]: { label, status: 'loading', msg: '' } }));
    try {
      const res = await fn();
      const msg =
        key === 'upcoming' ? `${res.ingested ?? 0} new matches buffered` :
        key === 'live'     ? `${res.live_count ?? 0} live · ${res.new ?? 0} new · ${res.patched ?? 0} patched` :
        key === 'enrich'   ? `${res.stored ?? 0} enriched · ${res.matched ?? 0} matched` :
        key === 'grade'    ? `${res.predictions_graded ?? 0} graded · ${res.matches_archived ?? 0} archived · ${res.results_fetched ?? 0} fetched` :
        key === 'purge'    ? `${res.purged_ghosts ?? 0} ghosts · ${res.deleted_finished ?? 0} finished · ${res.deleted_90_plus ?? 0} 90+ removed` :
        JSON.stringify(res).slice(0, 80);
      setResults(r => ({ ...r, [key]: { label, status: 'ok', msg } }));
      if (key === 'live' || key === 'upcoming' || key === 'odds' || key === 'purge') loadBufferStats();
    } catch (e: any) {
      setResults(r => ({ ...r, [key]: { label, status: 'error', msg: e?.response?.data?.detail || e?.message || 'Failed' } }));
    }
  };

  const actions = [
    { key: 'upcoming', label: 'Ingest Upcoming',    desc: 'Fetch upcoming matches from SportyBet',          icon: '📥', fn: triggerIngestUpcoming },
    { key: 'live',     label: 'Ingest Live',         desc: 'Fetch live matches + patch scores',              icon: '🔴', fn: triggerIngestLive },
    { key: 'enrich',   label: 'Run Enrichment',      desc: 'Match buffer entries to SofaScore',              icon: '⚡', fn: triggerEnrichWorker },
    { key: 'purge',    label: 'Purge Ghost Matches', desc: 'Remove stale/old matches that never kicked off', icon: '🧹', fn: purgeGhostMatches },
    { key: 'grade',    label: 'Grade Results',       desc: 'Grade predictions + archive to MongoDB',         icon: '✅', fn: () => triggerGradeResults(48) },
  ];

  const bufferItems = [
    { label: 'Upcoming',        val: bufferStats?.queue_labels?.upcoming ?? bufferStats?.upcoming,              tone: 'text-yellow-300' },
    { label: 'Future queued',   val: bufferStats?.queue_labels?.future_queued ?? bufferStats?.future_buffered, tone: 'text-sky-300' },
    { label: 'Needs enrichment', val: bufferStats?.queue_labels?.needs_enrichment ?? bufferStats?.needs_enrichment, tone: 'text-orange-300' },
    { label: 'No Sofa match',   val: bufferStats?.queue_labels?.no_sofa_match ?? bufferStats?.no_sofa_match,    tone: 'text-rose-300' },
    { label: 'Ready',           val: bufferStats?.queue_labels?.ready ?? bufferStats?.ready,                    tone: 'text-emerald-300' },
    { label: 'Deferred',        val: bufferStats?.queue_labels?.deferred ?? bufferStats?.deferred,              tone: 'text-amber-300' },
    { label: 'Stale live',      val: bufferStats?.queue_labels?.stale_live ?? bufferStats?.stale_live,          tone: 'text-red-400' },
  ];

  const current = activity.current;
  const eventTone = (status?: string) => {
    if (status === 'error') return 'bg-red-500';
    if (status === 'predicted' || status === 'matched' || status === 'ok') return 'bg-emerald-400';
    if (status === 'running') return 'bg-yellow-400 animate-pulse';
    if (status === 'waiting') return 'bg-orange-400';
    return 'bg-gray-500';
  };
  const timeLabel = (value?: string) => {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };
  const openActivityMatch = (event?: ActivityEvent) => {
    if (!event?.match_id) return;
    router.push(`/match/${encodeURIComponent(event.match_id)}`, 'forward', 'push');
  };

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
            <div key={label} className="shrink-0 rounded-lg bg-white/[0.04] border border-white/[0.07] px-3 py-1.5 text-center min-w-[92px]">
              <div className={`text-sm font-bold ${tone ?? 'text-white'}`}>{val ?? '—'}</div>
              <div className="text-[9px] text-gray-600 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 space-y-6">

        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">System Activity</div>
            <button onClick={loadBufferStats} className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold">Live refresh</button>
          </div>
          <div className="rounded-xl bg-[#161616] border border-white/[0.07] overflow-hidden">
            <button
              type="button"
              onClick={() => openActivityMatch(current)}
              disabled={!current?.match_id}
              className="w-full text-left px-4 py-3 border-b border-white/[0.06] bg-white/[0.02] disabled:cursor-default enabled:hover:bg-white/[0.04] transition-all"
            >
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${eventTone(current?.status)}`} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-gray-100 truncate">{current?.message || 'Waiting for activity'}</div>
                  <div className="text-[10px] text-gray-600 mt-0.5">
                    {current?.job || 'system'} {current?.ts ? `- ${timeLabel(current.ts)}` : ''}
                    {current?.match_id ? ' - tap to open match' : ''}
                  </div>
                </div>
              </div>
            </button>
            <div className="max-h-[220px] overflow-y-auto">
              {(activity.events || []).slice(0, 8).map((event, idx) => (
                <button
                  type="button"
                  key={`${event.ts}-${idx}`}
                  onClick={() => openActivityMatch(event)}
                  disabled={!event.match_id}
                  className="w-full text-left px-4 py-2.5 border-b border-white/[0.04] last:border-b-0 disabled:cursor-default enabled:hover:bg-white/[0.04] transition-all"
                >
                  <div className="flex items-start gap-2">
                    <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${eventTone(event.status)}`} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] text-gray-200 truncate">{event.message}</div>
                      <div className="text-[10px] text-gray-600 mt-0.5">
                        {timeLabel(event.ts)} - {event.job}
                        {event.details?.score !== undefined ? ` - score ${event.details.score}` : ''}
                        {event.details?.best_score !== undefined ? ` - best ${event.details.best_score}` : ''}
                        {event.match_id ? ' - open' : ''}
                      </div>
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

        {/* ── Ingest controls ── */}
        <div>
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3">Live Priority</div>
          <div className={`mb-6 rounded-xl border px-4 py-3 ${livePriority.enabled ? 'bg-emerald-500/[0.08] border-emerald-500/30' : 'bg-[#161616] border-white/[0.07]'}`}>
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-200">Continuous live enrichment</div>
                <div className="text-[11px] text-gray-600">Refresh live odds, enrich live first, and predict streaming matches automatically.</div>
                <div className={`mt-1 text-[11px] ${livePriority.enabled ? 'text-emerald-300' : 'text-gray-500'}`}>
                  {livePriority.loading ? 'Updating...' : livePriority.msg}
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={livePriority.enabled}
                onClick={toggleLivePriority}
                disabled={livePriority.loading}
                className={`relative h-7 w-12 shrink-0 rounded-full border transition-all disabled:opacity-50 ${livePriority.enabled ? 'border-emerald-400 bg-emerald-500/30' : 'border-white/10 bg-white/[0.05]'}`}
              >
                <span className={`absolute top-1 h-5 w-5 rounded-full transition-all ${livePriority.enabled ? 'left-6 bg-emerald-300' : 'left-1 bg-gray-500'}`} />
              </button>
            </div>
          </div>

          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3">Data Ingest</div>
          <div className="space-y-2">
            <div className="rounded-xl bg-[#161616] border border-white/[0.07] px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="text-xl">OD</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-200">Refresh Buffer Odds</div>
                  <div className="text-[11px] text-gray-600">Update live/upcoming odds, status, time, and movement snapshots.</div>
                </div>
                <button
                  onClick={() => run('odds', 'Refresh Buffer Odds', triggerRefreshBufferOdds)}
                  disabled={results.odds?.status === 'loading'}
                  className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-40 transition-all"
                >
                  {results.odds?.status === 'loading' ? 'Running...' : 'Run'}
                </button>
              </div>
              {results.odds && results.odds.status !== 'loading' && (
                <div className={`mt-2 text-[11px] px-1 ${results.odds.status === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {results.odds.status === 'ok' ? 'Done' : 'Failed'} {results.odds.msg}
                </div>
              )}
            </div>
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
            onClick={() => router.push('/prediction/dashboard', 'forward', 'push')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#161616] border border-white/[0.07] hover:border-emerald-500/30 transition-all text-left"
          >
            <span className="text-lg">AI</span>
            <div className="min-w-0">
              <span className="block text-sm font-semibold text-gray-200">Prediction Dashboard</span>
              <span className="block text-[11px] text-gray-600">Picks, explanations, model health and learning loop</span>
            </div>
            <svg className="w-4 h-4 text-gray-600 ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={() => router.push('/prediction/model-explorer', 'forward', 'push')}
            className="mt-2 w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#161616] border border-white/[0.07] hover:border-emerald-500/30 transition-all text-left"
          >
            <span className="text-lg">M</span>
            <div className="min-w-0">
              <span className="block text-sm font-semibold text-gray-200">Model Explorer</span>
              <span className="block text-[11px] text-gray-600">Filter low scoring, home, away, draw and value picks by proven accuracy</span>
            </div>
            <svg className="w-4 h-4 text-gray-600 ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={() => router.push('/analytics', 'forward', 'push')}
            className="mt-2 w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#161616] border border-white/[0.07] hover:border-emerald-500/30 transition-all text-left"
          >
            <span className="text-lg">📊</span>
            <span className="text-sm font-semibold text-gray-200">Analytics</span>
            <svg className="w-4 h-4 text-gray-600 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={() => router.push('/analytics/upcoming', 'forward', 'push')}
            className="mt-2 w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#161616] border border-white/[0.07] hover:border-emerald-500/30 transition-all text-left"
          >
            <span className="text-lg">AI</span>
            <div className="min-w-0">
              <span className="block text-sm font-semibold text-gray-200">Upcoming Ratings</span>
              <span className="block text-[11px] text-gray-600">Enriched and predicted matches ranked by assurance</span>
            </div>
            <svg className="w-4 h-4 text-gray-600 ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

      </div>
    </div>
  );
};

export default Settings;
