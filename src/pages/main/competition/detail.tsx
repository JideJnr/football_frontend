import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useIonRouter } from '@ionic/react';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Brain,
  CheckCircle2,
  ChevronRight,
  Circle,
  Database,
  RefreshCw,
  Search,
  ShieldCheck,
} from 'lucide-react';
import {
  getCompetitionPage,
  setCompetitionSpecialSettings,
} from '../../../services/apis/footballApi';
import type { CompetitionAnalysis } from '../../../interfaces/interface';

// ─── helpers ──────────────────────────────────────────────────────────────────

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

const fmtDate = (v?: string | number) => {
  if (!v) return '—';
  const d = new Date(typeof v === 'number' && v < 1e12 ? v * 1000 : v);
  return isNaN(d.getTime()) ? String(v) : d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const fmtShort = (v?: string) => {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const matchName = (m: any) =>
  m?.match || m?.name || m?.match_name ||
  `${m?.home_team?.name ?? m?.home_team ?? 'Home'} vs ${m?.away_team?.name ?? m?.away_team ?? 'Away'}`;

const matchGroup = (m: any) => m?.group || m?.round || m?.stage || '';

const bestPick = (m: any) => {
  const picks = m?.prediction?.picks;
  return Array.isArray(picks) && picks.length ? picks[0] : null;
};

const pickConf = (p: any) => {
  const n = Number(p?.confidence ?? p?.probability ?? p?.score);
  if (!isFinite(n)) return null;
  return n <= 1 ? Math.round(n * 100) : Math.round(n);
};

const pipelineIssues = (total: number, enriched: number, predicted: number, enabled: boolean) => {
  const issues: string[] = [];
  if (total === 0) issues.push('No fixtures — run Sync first');
  else if (enriched === 0) issues.push('0 enriched — SofaScore detail not pulled yet');
  else if (pct(enriched, total) < 30) issues.push(`Only ${pct(enriched, total)}% enriched`);
  if (enriched > 0 && predicted === 0) issues.push('Enriched but no predictions yet');
  if (!enabled) issues.push('Paused — enable to run in scheduler');
  return issues;
};

// ─── progress bar ─────────────────────────────────────────────────────────────

const Bar = ({ label, value, total, color }: { label: string; value: number; total: number; color: string }) => {
  const p = pct(value, total);
  return (
    <div>
      <div className="mb-1 flex justify-between text-[10px] font-semibold">
        <span className="text-gray-500">{label}</span>
        <span className={color}>{value}/{total} ({p}%)</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div className={`h-full rounded-full transition-all ${color.replace('text-', 'bg-')}`} style={{ width: `${p}%` }} />
      </div>
    </div>
  );
};

// ─── filter type ──────────────────────────────────────────────────────────────

type FilterMode = 'all' | 'enriched' | 'unenriched' | 'predicted' | 'unpredicted';

// ─── page ─────────────────────────────────────────────────────────────────────

export default function CompetitionDetail() {
  const { key } = useParams<{ key: string }>();
  const router = useIonRouter();

  const [pageData, setPageData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [msg, setMsg] = useState('');
  const [mode, setMode] = useState<FilterMode>('all');
  const [group, setGroup] = useState('all');
  const [query, setQuery] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await getCompetitionPage(key, 300);
      setPageData(res);
      setMsg('');
    } catch (e: any) {
      setMsg(e?.response?.data?.detail || e?.message || 'Load failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [key]);

  const parseAnalysis = (text?: string) => {
    if (!text) return null;
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed === 'object' && parsed !== null) return parsed;
    } catch {
      // plain text fallback
    }
    return { analysis: text };
  };

  // derived
  const settings = pageData?.settings ?? {};
  const bufferSummary = pageData?.buffer_summary ?? {};
  const bufferStatus = pageData?.buffer_status ?? {};
  const matches: any[] = pageData?.matches ?? [];

  const total = bufferStatus?.total ?? bufferSummary?.total ?? 0;
  const enriched = bufferStatus?.enriched ?? bufferSummary?.enriched ?? 0;
  const predicted = bufferStatus?.predicted ?? bufferSummary?.predicted ?? 0;
  const enabled = settings?.enabled ?? false;
  const cursor = settings?.metadata?.last_sync_end_date ?? settings?.metadata?.cursor_date ?? null;
  const issues = pipelineIssues(total, enriched, predicted, enabled);

  const groups = useMemo(() => {
    const vals = new Set(matches.map(matchGroup).filter(Boolean));
    return ['all', ...Array.from(vals).sort()];
  }, [matches]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return matches.filter((m) => {
      const hasPred = Boolean(m?.prediction || m?.predicted_at);
      const hasEnrich = Boolean(m?.enriched || m?.enriched_at || m?.sofascore_id);
      if (mode === 'enriched' && !hasEnrich) return false;
      if (mode === 'unenriched' && hasEnrich) return false;
      if (mode === 'predicted' && !hasPred) return false;
      if (mode === 'unpredicted' && hasPred) return false;
      if (group !== 'all' && matchGroup(m) !== group) return false;
      if (term) return `${matchName(m)} ${matchGroup(m)}`.toLowerCase().includes(term);
      return true;
    });
  }, [matches, mode, group, query]);

  return (
    <div className="h-full w-full overflow-y-auto bg-[#0c0c0c] text-white">

      {/* ── sticky header ─────────────────────────────────────── */}
      <div className="sticky top-0 z-10 border-b border-white/[0.06] bg-[#0c0c0c] px-4 pb-3 pt-4">

        {/* back + title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.goBack()}
            className="shrink-0 rounded-md p-1 text-gray-500 active:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[16px] font-bold text-white">
              {settings?.name ?? decodeURIComponent(key)}
            </h1>
            <p className="text-[10px] text-gray-600">
              {cursor ? `Synced to ${fmtShort(cursor)}` : 'Never synced'} · ID {settings?.unique_tournament_id ?? '—'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* toggle */}
            <button
              role="switch"
              aria-checked={enabled}
              onClick={async () => {
                setToggling(true);
                try {
                  await setCompetitionSpecialSettings(key, { enabled: !enabled });
                  setMsg('Updated');
                  await load();
                } catch (e: any) {
                  setMsg(e?.response?.data?.detail || e?.message || 'Failed');
                } finally {
                  setToggling(false);
                }
              }}
              disabled={toggling}
              className={`relative h-6 w-11 rounded-full border transition-all disabled:opacity-40 ${
                enabled ? 'border-emerald-400 bg-emerald-500/30' : 'border-white/10 bg-white/[0.05]'
              }`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full transition-all ${enabled ? 'left-5 bg-emerald-300' : 'left-0.5 bg-gray-500'}`} />
            </button>
            <button
              onClick={load}
              disabled={loading}
              className="rounded-md border border-white/[0.08] bg-white/[0.04] p-1.5 text-gray-400 disabled:opacity-40"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* stat tiles */}
        <div className="mt-3 grid grid-cols-4 gap-2">
          {[
            { label: 'Fixtures', val: total, color: 'text-white' },
            { label: 'Enriched', val: enriched, color: enriched === 0 && total > 0 ? 'text-red-400' : 'text-sky-300' },
            { label: 'Predicted', val: predicted, color: predicted === 0 && enriched > 0 ? 'text-orange-400' : 'text-emerald-300' },
            { label: 'Live', val: bufferSummary?.live ?? 0, color: 'text-yellow-300' },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-2 py-2 text-center">
              <div className={`text-base font-bold ${s.color}`}>{s.val}</div>
              <div className="text-[9px] font-semibold uppercase tracking-wider text-gray-600">{s.label}</div>
            </div>
          ))}
        </div>

        {/* progress bars */}
        {total > 0 && (
          <div className="mt-3 space-y-1.5">
            <Bar label="Enriched" value={enriched} total={total} color="text-sky-400" />
            <Bar label="Predicted" value={predicted} total={total} color="text-emerald-400" />
          </div>
        )}

        {/* issues */}
        {issues.length > 0 && (
          <div className="mt-2 space-y-1">
            {issues.map((issue) => (
              <div key={issue} className="flex items-center gap-2 rounded-md bg-orange-500/[0.08] px-3 py-1.5 text-[11px] text-orange-300">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {issue}
              </div>
            ))}
          </div>
        )}

        {/* ── analysis section ─────────────────────────────────── */}
        {(() => {
          const latestAnalysis = pageData?.latest_analysis as CompetitionAnalysis | null | undefined;
          const analysisHistory = (pageData?.analysis_history as CompetitionAnalysis[] | undefined) ?? [];
          const latestParsed = parseAnalysis(latestAnalysis?.analysis_text);

          return (
            <div className="mt-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-purple-400" />
                <span className="text-[12px] font-bold text-white">Weekly AI Review</span>
                {latestAnalysis && (
                  <span className="ml-auto text-[9px] text-gray-600">
                    {latestAnalysis.round_name} · {fmtShort(latestAnalysis.generated_at)}
                  </span>
                )}
              </div>

              {latestParsed ? (
                <div className="mt-3 space-y-3">
                  {/* Main analysis text */}
                  {latestParsed.analysis && (
                    <p className="text-[11px] leading-relaxed text-gray-300">{latestParsed.analysis}</p>
                  )}

                  {/* Top Table */}
                  {latestParsed.top_table && Array.isArray(latestParsed.top_table) && latestParsed.top_table.length > 0 && (
                    <div className="rounded-md bg-emerald-500/[0.06] border border-emerald-500/10 p-2.5">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-2">Top Table</div>
                      <div className="space-y-1">
                        {latestParsed.top_table.map((row: any, i: number) => (
                          <div key={i} className="flex items-center gap-2 text-[11px]">
                            <span className="w-5 text-right font-bold text-emerald-300">{row.pos ?? i + 1}</span>
                            <span className="flex-1 text-white">{row.team}</span>
                            <span className="text-gray-400">{row.pts ?? row.points ?? 0} pts</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Disappointments */}
                  {latestParsed.disappointments && Array.isArray(latestParsed.disappointments) && latestParsed.disappointments.length > 0 && (
                    <div className="rounded-md bg-red-500/[0.06] border border-red-500/10 p-2.5">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-red-400 mb-2">Disappointments This Week</div>
                      <div className="space-y-1">
                        {latestParsed.disappointments.map((item: string, i: number) => (
                          <div key={i} className="flex items-center gap-2 text-[11px] text-red-200">
                            <span className="text-red-500">•</span>
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Standings Impact */}
                  {latestParsed.standings_impact && (
                    <div className="rounded-md bg-white/[0.02] border border-white/[0.06] p-2.5">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Standings Impact</div>
                      <p className="text-[11px] text-gray-400">{latestParsed.standings_impact}</p>
                    </div>
                  )}
                </div>
              ) : latestAnalysis ? (
                <div className="mt-2 rounded-md bg-black/20 p-2.5">
                  <div className="flex items-center gap-2 text-[10px] text-gray-500">
                    <span className="rounded bg-purple-500/10 px-1.5 py-0.5 font-bold text-purple-300">{latestAnalysis.round_name}</span>
                    <span>{latestAnalysis.match_count} matches</span>
                    <span>·</span>
                    <span>{fmtShort(latestAnalysis.generated_at)}</span>
                    <span>·</span>
                    <span className="text-gray-600">{latestAnalysis.model_used}</span>
                  </div>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-gray-300">{latestAnalysis.analysis_text}</p>
                </div>
              ) : (
                <p className="mt-2 text-[10px] text-gray-600">No analysis yet. The pipeline will generate one after matches complete.</p>
              )}

              {analysisHistory.length > 1 && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-[10px] font-bold text-gray-500 hover:text-gray-300">
                    {analysisHistory.length - 1} earlier analyses
                  </summary>
                  <div className="mt-1.5 space-y-1.5">
                    {analysisHistory.slice(1).map((a) => {
                      const parsed = parseAnalysis(a.analysis_text);
                      return (
                        <div key={a.id} className="rounded-md bg-black/10 p-2">
                          <div className="flex items-center gap-2 text-[9px] text-gray-600">
                            <span className="font-bold text-gray-500">{a.round_name}</span>
                            <span>{a.match_count} matches</span>
                            <span>·</span>
                            <span>{fmtShort(a.generated_at)}</span>
                          </div>
                          {parsed?.analysis && (
                            <p className="mt-0.5 text-[10px] leading-relaxed text-gray-500">{parsed.analysis}</p>
                          )}
                          {!parsed?.analysis && (
                            <p className="mt-0.5 text-[10px] leading-relaxed text-gray-500" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{a.analysis_text}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </details>
              )}
            </div>
          );
        })()}

        {/* filter bar */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-600" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="h-8 w-40 rounded-md border border-white/[0.07] bg-black/20 pl-8 pr-3 text-xs text-white outline-none placeholder:text-gray-700 focus:border-emerald-500/40"
            />
          </div>
          <div className="flex gap-1 overflow-x-auto">
            {(['all', 'enriched', 'unenriched', 'predicted', 'unpredicted'] as FilterMode[]).map((f) => (
              <button
                key={f}
                onClick={() => setMode(f)}
                className={`shrink-0 rounded px-2.5 py-1 text-[10px] font-bold capitalize transition ${
                  mode === f ? 'bg-emerald-500/15 text-emerald-300' : 'text-gray-600 hover:text-gray-300'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* group pills */}
        {groups.length > 1 && (
          <div className="mt-2 flex gap-1 overflow-x-auto">
            {groups.map((g) => (
              <button
                key={g}
                onClick={() => setGroup(g)}
                className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold transition ${
                  group === g ? 'bg-white text-black' : 'bg-white/[0.05] text-gray-500'
                }`}
              >
                {g === 'all' ? 'All' : g}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── match list ────────────────────────────────────────── */}
      <div className="divide-y divide-white/[0.04]">
        {loading && !matches.length && (
          <div className="py-16 text-center text-sm text-gray-600">Loading…</div>
        )}

        {!loading && !matches.length && (
          <div className="py-16 text-center">
            <Database className="mx-auto mb-3 h-8 w-8 text-gray-700" />
            <p className="text-sm font-semibold text-gray-500">No fixtures in buffer</p>
            <p className="mt-1 text-xs text-gray-700">Enable and click Sync to pull fixtures from SofaScore.</p>
          </div>
        )}

        {filtered.map((m) => {
          const pick = bestPick(m);
          const conf = pickConf(pick);
          const isEnriched = Boolean(m?.enriched || m?.enriched_at || m?.sofascore_id);
          const isPredicted = Boolean(m?.prediction || m?.predicted_at);
          const matchId = m?.match_id || m?.id;
          const importance = m?.importance_context ?? {};
          const tier = importance?.tier;
          const score = m?.score ?? {};
          const hasScore = score?.home != null && score?.away != null;

          return (
            <button
              key={matchId || matchName(m)}
              type="button"
              onClick={() => matchId && router.push(`/match/${encodeURIComponent(matchId)}`, 'forward', 'push')}
              className="w-full px-4 py-3 text-left transition active:bg-white/[0.03]"
            >
              <div className="flex items-start gap-3">
                {/* status icon */}
                <div className="mt-0.5 shrink-0">
                  {isPredicted
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    : isEnriched
                    ? <Circle className="h-4 w-4 text-sky-500" />
                    : <Circle className="h-4 w-4 text-gray-700" />}
                </div>

                <div className="min-w-0 flex-1">
                  {/* name + badges */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate text-[13px] font-semibold text-white">{matchName(m)}</span>
                    {matchGroup(m) && (
                      <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-bold text-gray-500">{matchGroup(m)}</span>
                    )}
                    {tier && tier !== 'normal' && (
                      <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                        tier === 'critical' ? 'bg-red-500/15 text-red-300' :
                        tier === 'high' ? 'bg-yellow-500/15 text-yellow-200' :
                        'bg-sky-500/15 text-sky-300'
                      }`}>{tier}</span>
                    )}
                    {hasScore && (
                      <span className="rounded bg-white/[0.08] px-1.5 py-0.5 text-[9px] font-bold text-white">
                        {score.home}–{score.away}
                      </span>
                    )}
                  </div>

                  {/* date */}
                  <div className="mt-0.5 text-[10px] text-gray-600">
                    {fmtDate(m?.start_time || m?.match_date)}
                    {importance?.stage ? ` · ${String(importance.stage).replace(/_/g, ' ')}` : ''}
                  </div>

                  {/* pipeline tags */}
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${isEnriched ? 'bg-sky-500/10 text-sky-300' : 'bg-white/[0.04] text-gray-600'}`}>
                      {isEnriched ? '✓ enriched' : '○ not enriched'}
                    </span>
                    {pick ? (
                      <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                        {pick.selection || pick.pick || 'pick'}{conf !== null ? ` ${conf}%` : ''}
                      </span>
                    ) : (
                      <span className="rounded bg-orange-500/10 px-2 py-0.5 text-[10px] font-bold text-orange-400">
                        no prediction
                      </span>
                    )}
                    {m?.prediction?.risk_management?.risk_level && (
                      <span className="rounded bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold text-gray-600">
                        {m.prediction.risk_management.risk_level}
                      </span>
                    )}
                  </div>
                </div>

                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-gray-700" />
              </div>
            </button>
          );
        })}

        {!loading && matches.length > 0 && filtered.length === 0 && (
          <div className="py-10 text-center text-sm text-gray-600">No matches for this filter.</div>
        )}
      </div>

      {/* footer */}
      {matches.length > 0 && (
        <div className="border-t border-white/[0.05] px-4 py-2 text-[10px] text-gray-700">
          {filtered.length} of {matches.length} · {enriched} enriched · {predicted} predicted
        </div>
      )}
    </div>
  );
}
