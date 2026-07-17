import { useEffect, useMemo, useState } from 'react';
import { useIonRouter } from '@ionic/react';
import {
  Activity,
  CalendarDays,
  ChevronRight,
  Database,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trophy,
} from 'lucide-react';
import {
  enrichPredictWorldCupSpecial,
  getWorldCupSpecialBuffer,
  getWorldCupSpecialStatus,
  setWorldCupSpecialSettings,
  syncWorldCupSpecial,
  triggerWorldCupSpecial,
} from '../../../services/apis/footballApi';

type FilterMode = 'all' | 'predicted' | 'unpredicted' | 'enriched';

const emptyStatus = {
  enabled: false,
  total: 0,
  enriched: 0,
  predicted: 0,
  first_match_date: '',
  last_match_date: '',
  metadata: {} as Record<string, any>,
};

const getMatchName = (match: any) =>
  match?.name ||
  match?.match_name ||
  match?.match ||
  match?.prediction?.name ||
  `${match?.home_team || match?.homeTeam?.name || match?.prediction?.teams?.home?.name || 'Home'} vs ${match?.away_team || match?.awayTeam?.name || match?.prediction?.teams?.away?.name || 'Away'}`;

const getGroup = (match: any) =>
  match?.group || match?.round || match?.tournament_round || match?.stage || 'World Cup';

const getBestPick = (match: any) => {
  const picks = match?.prediction?.picks;
  return Array.isArray(picks) && picks.length ? picks[0] : null;
};

const getConfidence = (pick: any) => {
  const raw = pick?.confidence ?? pick?.probability ?? pick?.score;
  const num = Number(raw);
  if (!Number.isFinite(num)) return null;
  return num <= 1 ? Math.round(num * 100) : Math.round(num);
};

const formatDate = (value?: string | number) => {
  if (!value) return 'TBD';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const statTone = (value: number, total: number) => {
  if (!total) return 'text-gray-400';
  const ratio = value / total;
  if (ratio >= 0.8) return 'text-emerald-300';
  if (ratio >= 0.45) return 'text-yellow-300';
  return 'text-orange-300';
};

const importanceTone = (tier?: string) => {
  if (tier === 'critical') return 'bg-red-400/10 text-red-300';
  if (tier === 'high') return 'bg-yellow-400/10 text-yellow-200';
  if (tier === 'medium') return 'bg-sky-400/10 text-sky-300';
  return 'bg-white/[0.05] text-gray-400';
};

const edgeLabel = (value: any) => {
  const num = Number(value || 0);
  if (!Number.isFinite(num) || Math.abs(num) < 0.1) return 'even';
  return num > 0 ? `home +${num.toFixed(1)}` : `away +${Math.abs(num).toFixed(1)}`;
};

const normalizeStatus = (res: any) => {
  const competition = res?.competition || {};
  const buffer = res?.buffer || {};
  return {
    ...emptyStatus,
    enabled: res?.enabled ?? competition.enabled ?? false,
    total: res?.total ?? buffer.total ?? 0,
    enriched: res?.enriched ?? buffer.enriched ?? 0,
    predicted: res?.predicted ?? buffer.predicted ?? 0,
    first_match_date: res?.first_match_date ?? buffer.first_match_date ?? competition.start_date ?? '',
    last_match_date: res?.last_match_date ?? buffer.last_match_date ?? competition.end_date ?? '',
    metadata: { ...(res?.metadata || {}), ...(competition.metadata || {}) },
  };
};

const Competition = () => {
  const router = useIonRouter();
  const [status, setStatus] = useState<any>(emptyStatus);
  const [matches, setMatches] = useState<any[]>([]);
  const [mode, setMode] = useState<FilterMode>('all');
  const [group, setGroup] = useState('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [statusRes, bufferRes] = await Promise.all([
        getWorldCupSpecialStatus(),
        getWorldCupSpecialBuffer(260),
      ]);
      setStatus(normalizeStatus(statusRes));
      setMatches(Array.isArray(bufferRes?.matches) ? bufferRes.matches : []);
      setMessage('');
    } catch (e: any) {
      setMessage(e?.response?.data?.detail || e?.message || 'Could not load competition data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 30000);
    return () => window.clearInterval(timer);
  }, []);

  const groups = useMemo(() => {
    const values = new Set(matches.map(getGroup).filter(Boolean));
    return ['all', ...Array.from(values).sort()];
  }, [matches]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return matches.filter((match) => {
      const hasPrediction = Boolean(match?.prediction || match?.predicted_at);
      const hasEnrichment = Boolean(match?.enrichment || match?.sofascore_id || match?.enriched_at);
      if (mode === 'predicted' && !hasPrediction) return false;
      if (mode === 'unpredicted' && hasPrediction) return false;
      if (mode === 'enriched' && !hasEnrichment) return false;
      if (group !== 'all' && getGroup(match) !== group) return false;
      if (!term) return true;
      return `${getMatchName(match)} ${getGroup(match)}`.toLowerCase().includes(term);
    });
  }, [matches, mode, group, query]);

  const runAction = async (key: string, fn: () => Promise<any>) => {
    setBusy(key);
    setMessage('');
    try {
      const res = await fn();
      const summary =
        key === 'cycle' ? `Cycle complete: ${res?.message || 'World Cup scan ran'}` :
        key === 'sync' ? `Synced ${res?.stored ?? res?.matches ?? 0} matches` :
        key === 'enrich' ? `Enriched ${res?.enriched ?? res?.processed ?? 0}, predicted ${res?.predicted ?? 0}` :
        key === 'toggle' ? 'Competition setting updated' :
        'Done';
      setMessage(summary);
      await load();
    } catch (e: any) {
      setMessage(e?.response?.data?.detail || e?.message || 'Action failed');
    } finally {
      setBusy('');
    }
  };

  const toggleEnabled = () =>
    runAction('toggle', () => setWorldCupSpecialSettings({ enabled: !status.enabled }));

  const cursor = status?.metadata?.cursor_date || status?.metadata?.last_sync_end_date || 'not started';
  const criticalCount = matches.filter((match) => (match?.importance_context?.importance_score || 0) >= 90).length;

  return (
    <div className="h-full w-full overflow-y-auto bg-[#0f0f0f] text-white">
      <div className="border-b border-white/[0.06] bg-[#121212] px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-emerald-300">
              <Trophy className="h-4 w-4" />
              Competitions
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-normal text-white">World Cup special lane</h1>
            <p className="mt-1 max-w-2xl text-sm text-gray-400">
              Dedicated buffer, enrichment, predictions, and match state for competition play.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={!!status.enabled}
            onClick={toggleEnabled}
            disabled={busy === 'toggle'}
            className={`relative mt-1 h-8 w-14 shrink-0 rounded-full border transition-all disabled:opacity-50 ${
              status.enabled ? 'border-emerald-400 bg-emerald-500/30' : 'border-white/10 bg-white/[0.05]'
            }`}
          >
            <span className={`absolute top-1 h-6 w-6 rounded-full transition-all ${status.enabled ? 'left-7 bg-emerald-300' : 'left-1 bg-gray-500'}`} />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
          {[
            { label: 'Matches', value: status.total, tone: 'text-white' },
            { label: 'Enriched', value: status.enriched, tone: statTone(status.enriched, status.total) },
            { label: 'Predicted', value: status.predicted, tone: statTone(status.predicted, status.total) },
            { label: 'Critical', value: criticalCount, tone: criticalCount ? 'text-red-300' : 'text-gray-400' },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-white/[0.07] bg-white/[0.04] px-3 py-2">
              <div className={`text-xl font-bold ${item.tone}`}>{item.value ?? 0}</div>
              <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4 px-4 py-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-500/15 text-emerald-300">
                <Trophy className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-white">World Cup 2026</div>
                <div className="truncate text-xs text-gray-400">
                  {formatDate(status.first_match_date)} to {formatDate(status.last_match_date)}
                </div>
              </div>
              <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${status.enabled ? 'bg-emerald-400/15 text-emerald-300' : 'bg-gray-500/15 text-gray-400'}`}>
                {status.enabled ? 'active' : 'paused'}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => runAction('cycle', triggerWorldCupSpecial)} disabled={!!busy} className="inline-flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-300 disabled:opacity-45">
                <Activity className="h-4 w-4" />
                {busy === 'cycle' ? 'Running...' : 'Run cycle'}
              </button>
              <button onClick={() => runAction('sync', () => syncWorldCupSpecial({ limitDays: 2 }))} disabled={!!busy} className="inline-flex items-center gap-2 rounded-md border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs font-bold text-sky-300 disabled:opacity-45">
                <Database className="h-4 w-4" />
                {busy === 'sync' ? 'Syncing...' : 'Sync next'}
              </button>
              <button onClick={() => runAction('enrich', () => enrichPredictWorldCupSpecial(6))} disabled={!!busy} className="inline-flex items-center gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs font-bold text-yellow-200 disabled:opacity-45">
                <ShieldCheck className="h-4 w-4" />
                {busy === 'enrich' ? 'Learning...' : 'Enrich picks'}
              </button>
              <button onClick={load} disabled={loading || !!busy} className="inline-flex items-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-bold text-gray-200 disabled:opacity-45">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
            <div className="mt-3 text-[11px] text-gray-500">
              Cursor: {cursor} {message ? <span className="text-gray-300">- {message}</span> : null}
            </div>
          </div>

          <button type="button" className="rounded-lg border border-dashed border-white/[0.12] bg-white/[0.03] p-4 text-left text-gray-400">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-md bg-white/[0.05]">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-gray-200">Add competition</div>
                <div className="text-xs text-gray-500">AFCON, Euros, UCL, and more can plug into this same lane.</div>
              </div>
            </div>
          </button>
        </div>

        <div className="rounded-lg border border-white/[0.07] bg-[#151515]">
          <div className="border-b border-white/[0.06] p-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search teams or group"
                  className="h-10 w-full rounded-md border border-white/[0.08] bg-black/20 pl-9 pr-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-emerald-500/40"
                />
              </div>
              <div className="flex gap-1 overflow-x-auto">
                {(['all', 'predicted', 'unpredicted', 'enriched'] as FilterMode[]).map((item) => (
                  <button
                    key={item}
                    onClick={() => setMode(item)}
                    className={`shrink-0 rounded-md px-3 py-2 text-xs font-bold capitalize transition ${mode === item ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/[0.04] text-gray-400 hover:text-white'}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-3 flex gap-1 overflow-x-auto">
              {groups.map((item) => (
                <button
                  key={item}
                  onClick={() => setGroup(item)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold ${group === item ? 'bg-white text-black' : 'bg-white/[0.05] text-gray-400'}`}
                >
                  {item === 'all' ? 'All groups' : item}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-white/[0.05]">
            {filtered.map((match) => {
              const pick = getBestPick(match);
              const confidence = getConfidence(pick);
              const risk = match?.prediction?.risk_management?.risk_level || match?.prediction?.risk_level || 'review';
              const matchId = match?.match_id || match?.id;
              const importance = match?.importance_context || {};
              const intel = match?.event?.competition_intelligence || match?.competition_intelligence || match?.prediction?.competition_intelligence || {};
              const strength = intel?.team_strength || {};
              const table = intel?.table || {};
              const movement = intel?.odds_movement || match?.prediction?.odds_movement || {};
              return (
                <button
                  type="button"
                  key={matchId || getMatchName(match)}
                  onClick={() => matchId && router.push(`/match/${encodeURIComponent(matchId)}`, 'forward', 'push')}
                  className="w-full p-3 text-left transition hover:bg-white/[0.03]"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-md bg-white/[0.05] text-gray-300">
                      <CalendarDays className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="truncate text-sm font-bold text-white">{getMatchName(match)}</div>
                        <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-gray-400">{getGroup(match)}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${importanceTone(importance?.tier)}`}>
                          {importance?.tier || 'normal'} {importance?.importance_score ? `${importance.importance_score}` : ''}
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] text-gray-500">
                        {formatDate(match?.start_time || match?.match_date || match?.date)}
                        {importance?.stage ? <span> - {String(importance.stage).replace(/_/g, ' ')}</span> : null}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className={`rounded px-2 py-1 text-[10px] font-bold ${pick ? 'bg-emerald-400/10 text-emerald-300' : 'bg-orange-400/10 text-orange-300'}`}>
                          {pick ? `${pick.selection || pick.pick || pick.market || 'prediction'}${confidence !== null ? ` - ${confidence}%` : ''}` : 'needs prediction'}
                        </span>
                        <span className="rounded bg-white/[0.05] px-2 py-1 text-[10px] font-bold text-gray-400">Risk: {risk}</span>
                        {(importance?.prediction_focus || []).slice(0, 2).map((focus: string) => (
                          <span key={focus} className="rounded bg-purple-400/10 px-2 py-1 text-[10px] font-bold text-purple-300">
                            {focus.replace(/_/g, ' ')}
                          </span>
                        ))}
                        <span className="rounded bg-cyan-400/10 px-2 py-1 text-[10px] font-bold text-cyan-300">
                          Strength: {strength?.leader || 'even'} {edgeLabel(strength?.edge)}
                        </span>
                        <span className="rounded bg-blue-400/10 px-2 py-1 text-[10px] font-bold text-blue-300">
                          Table: {table?.leader || 'even'} {edgeLabel(table?.edge_ppg)}
                        </span>
                        <span className="rounded bg-yellow-400/10 px-2 py-1 text-[10px] font-bold text-yellow-200">
                          Odds: {movement?.sharp_signal || `${movement?.snapshots || 0} snapshots`}
                        </span>
                        {match?.sofascore_id ? <span className="rounded bg-sky-400/10 px-2 py-1 text-[10px] font-bold text-sky-300">SofaScore linked</span> : null}
                      </div>
                    </div>
                    <ChevronRight className="mt-3 h-4 w-4 shrink-0 text-gray-600" />
                  </div>
                </button>
              );
            })}
            {!filtered.length && (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                {loading ? 'Loading competition buffer...' : 'No matches match this view yet.'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Competition;
