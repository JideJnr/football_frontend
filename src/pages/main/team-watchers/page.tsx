import { useEffect, useState } from 'react';
import { ArrowLeft, Brain, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { useIonRouter } from '@ionic/react';
import { backfillTeamWatchers, getTeamWatchers, inspectSportyTeamWatcherIds } from '../../../services/apis/footballApi';

export default function TeamWatchersPage() {
  const router = useIonRouter();
  const [watchers, setWatchers] = useState<any[]>([]);
  const [sportyInspect, setSportyInspect] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [query, setQuery] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [watcherRes, inspectRes] = await Promise.all([
        getTeamWatchers(150),
        inspectSportyTeamWatcherIds(12),
      ]);
      setWatchers(watcherRes?.watchers ?? []);
      setSportyInspect(inspectRes);
      setMsg('');
    } catch (err: any) {
      setMsg(err?.response?.data?.detail || err?.message || 'Load failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const runBackfill = async () => {
    setBusy(true);
    try {
      const res = await backfillTeamWatchers(300);
      setMsg(`Backfilled ${res.team_updates ?? 0} team updates from ${res.processed ?? 0} matches`);
      await load();
    } catch (err: any) {
      setMsg(err?.response?.data?.detail || err?.message || 'Backfill failed');
    } finally {
      setBusy(false);
    }
  };

  const filtered = watchers.filter((watcher) =>
    String(watcher?.team_name || '').toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <div className="h-full w-full overflow-y-auto bg-[#0c0c0c] text-white">
      <div className="sticky top-0 z-10 border-b border-white/[0.06] bg-[#0c0c0c] px-4 pb-3 pt-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.goBack()} className="rounded-md p-1 text-gray-500 active:text-white">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-[16px] font-bold text-white">AI Team Watchers</h1>
            <p className="text-[10px] text-gray-600">
              {sportyInspect?.sporty_has_team_ids ? 'Sporty team IDs detected' : 'Using fallback team identity'} · {watchers.length} analysts
            </p>
          </div>
          <button onClick={load} disabled={loading} className="rounded-md border border-white/[0.08] bg-white/[0.04] p-1.5 text-gray-400 disabled:opacity-40">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-2 py-2 text-center">
            <div className="text-base font-bold text-white">{watchers.length}</div>
            <div className="text-[9px] font-semibold uppercase tracking-wider text-gray-600">Watchers</div>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-2 py-2 text-center">
            <div className="text-base font-bold text-emerald-300">{watchers.filter(w => (w?.profile?.prediction_context || {}).usable).length}</div>
            <div className="text-[9px] font-semibold uppercase tracking-wider text-gray-600">Usable</div>
          </div>
          <button onClick={runBackfill} disabled={busy} className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.08] px-2 py-2 text-center disabled:opacity-40">
            <div className="text-base font-bold text-emerald-300">{busy ? '...' : 'Run'}</div>
            <div className="text-[9px] font-semibold uppercase tracking-wider text-emerald-400">Backfill</div>
          </button>
        </div>

        {msg && <div className="mt-2 rounded-md bg-white/[0.04] px-3 py-2 text-[11px] text-gray-300">{msg}</div>}

        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-600" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search teams"
            className="h-9 w-full rounded-md border border-white/[0.07] bg-black/20 pl-8 pr-3 text-xs text-white outline-none placeholder:text-gray-700 focus:border-emerald-500/40"
          />
        </div>
      </div>

      <div className="divide-y divide-white/[0.04]">
        {loading && !watchers.length && <div className="py-16 text-center text-sm text-gray-600">Loading...</div>}
        {!loading && !watchers.length && (
          <div className="py-16 text-center">
            <Brain className="mx-auto mb-3 h-8 w-8 text-gray-700" />
            <p className="text-sm font-semibold text-gray-500">No team watchers yet</p>
            <p className="mt-1 text-xs text-gray-700">Run backfill or wait for finished-match AI analysis.</p>
          </div>
        )}
        {filtered.map((watcher) => {
          const profile = watcher.profile ?? {};
          const record = profile.record ?? {};
          const context = profile.prediction_context ?? {};
          const market = profile.preferred_markets?.[0];
          return (
            <div key={watcher.team_key} className="px-4 py-3">
              <div className="flex items-start gap-3">
                <ShieldCheck className={`mt-0.5 h-4 w-4 ${context.usable ? 'text-emerald-400' : 'text-gray-700'}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate text-[13px] font-bold text-white">{watcher.team_name}</div>
                    <div className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                      {Math.round(Number(profile.analyst_score ?? 0))}
                    </div>
                  </div>
                  <div className="mt-0.5 text-[10px] text-gray-600">
                    {watcher.provider_team_id} · {record.form || 'new'} · {watcher.match_count} matches
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {market && (
                      <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                        {String(market.market).replace(/_/g, ' ')}
                      </span>
                    )}
                    <span className="rounded bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold text-gray-500">
                      {context.confidence || 'low'} confidence
                    </span>
                    <span className="rounded bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold text-gray-500">
                      {profile.trend || 'stable'}
                    </span>
                  </div>
                  {profile.recent_briefs?.[0] && (
                    <p className="mt-2 text-[10px] leading-relaxed text-gray-500">{profile.recent_briefs[0]}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {!loading && watchers.length > 0 && filtered.length === 0 && (
          <div className="py-10 text-center text-sm text-gray-600">No teams match this search.</div>
        )}
      </div>
    </div>
  );
}
