import { useEffect, useState } from 'react';
import { useIonRouter } from '@ionic/react';
import { AlertTriangle, ChevronRight, RefreshCw, Trophy, Zap } from 'lucide-react';
import {
  getCompetitionCatalogue,
  getCompetitionSpecialStatus,
  triggerCompetitionCycles,
} from '../../../services/apis/footballApi';

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

const healthColor = (enriched: number, total: number, predicted: number) => {
  if (total === 0) return 'text-gray-600';
  if (enriched === 0) return 'text-red-400';
  if (predicted === 0) return 'text-orange-400';
  if (pct(predicted, total) >= 60) return 'text-emerald-400';
  return 'text-yellow-400';
};

const healthLabel = (enriched: number, total: number, predicted: number, enabled: boolean) => {
  if (!enabled) return 'paused';
  if (total === 0) return 'no fixtures';
  if (enriched === 0) return 'needs enrichment';
  if (predicted === 0) return 'needs predictions';
  return `${pct(predicted, total)}% predicted`;
};

export default function CompetitionList() {
  const router = useIonRouter();
  const [catalogue, setCatalogue] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [cycling, setCycling] = useState(false);
  const [msg, setMsg] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await getCompetitionCatalogue();
      const list: any[] = Array.isArray(res) ? res : (res?.competitions ?? []);
      setCatalogue(list);

      // fetch counts in background batches of 6
      const chunks: any[][] = [];
      for (let i = 0; i < list.length; i += 6) chunks.push(list.slice(i, i + 6));
      for (const chunk of chunks) {
        const results = await Promise.allSettled(
          chunk.map((c: any) => getCompetitionSpecialStatus(c.key))
        );
        setCounts((prev) => {
          const next = { ...prev };
          chunk.forEach((c: any, i: number) => {
            const r = results[i];
            if (r.status === 'fulfilled') {
              const buf = (r.value as any)?.buffer ?? {};
              const comp = (r.value as any)?.competition ?? {};
              next[c.key] = {
                total: buf.total ?? 0,
                enriched: buf.enriched ?? 0,
                predicted: buf.predicted ?? 0,
                enabled: comp.enabled ?? c.enabled ?? false,
              };
            }
          });
          return next;
        });
      }
    } catch {
      setMsg('Failed to load competitions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const runCycle = async () => {
    setCycling(true);
    setMsg('');
    try {
      const r = await triggerCompetitionCycles();
      setMsg(`Cycle complete — ${r?.processed ?? 0} competitions ran`);
      await load();
    } catch (e: any) {
      setMsg(e?.response?.data?.detail || e?.message || 'Cycle failed');
    } finally {
      setCycling(false);
    }
  };

  const enabledCount = catalogue.filter((c) => counts[c.key]?.enabled).length;
  const totalFixtures = Object.values(counts).reduce((s: number, c: any) => s + (c?.total ?? 0), 0);
  const totalPredicted = Object.values(counts).reduce((s: number, c: any) => s + (c?.predicted ?? 0), 0);

  return (
    <div className="h-full w-full overflow-y-auto bg-[#0c0c0c] text-white">
      {/* header */}
      <div className="sticky top-0 z-10 border-b border-white/[0.06] bg-[#0c0c0c] px-4 pb-3 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-emerald-400" />
            <h1 className="text-lg font-bold">Competitions</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              disabled={loading}
              className="rounded-md border border-white/[0.08] bg-white/[0.04] p-1.5 text-gray-400 disabled:opacity-40"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={runCycle}
              disabled={cycling || loading}
              className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-bold text-emerald-300 disabled:opacity-40"
            >
              <Zap className="h-3.5 w-3.5" />
              {cycling ? 'Running…' : 'Run all'}
            </button>
          </div>
        </div>

        {/* summary row */}
        <div className="mt-3 flex gap-3 text-[11px]">
          <span className="text-gray-500">{catalogue.length} competitions</span>
          <span className="text-emerald-400">{enabledCount} active</span>
          <span className="text-gray-500">{totalFixtures} fixtures</span>
          <span className="text-sky-400">{totalPredicted} predicted</span>
        </div>

        {msg && (
          <p className={`mt-2 text-[11px] ${msg.includes('fail') || msg.includes('Failed') ? 'text-red-400' : 'text-emerald-300'}`}>
            {msg}
          </p>
        )}
      </div>

      {/* list */}
      <div className="divide-y divide-white/[0.04]">
        {loading && catalogue.length === 0 && (
          <div className="py-16 text-center text-sm text-gray-600">Loading…</div>
        )}

        {catalogue.map((comp) => {
          const c = counts[comp.key];
          const total = c?.total ?? 0;
          const enriched = c?.enriched ?? 0;
          const predicted = c?.predicted ?? 0;
          const enabled = c?.enabled ?? comp.enabled ?? false;
          const color = healthColor(enriched, total, predicted);
          const label = healthLabel(enriched, total, predicted, enabled);
          const enrichPct = pct(enriched, total);
          const predPct = pct(predicted, total);
          const needsAttention = enabled && total > 0 && (enriched === 0 || predicted === 0);

          return (
            <button
              key={comp.key}
              type="button"
              onClick={() => router.push(`/competition/${encodeURIComponent(comp.key)}`, 'forward', 'push')}
              className="w-full px-4 py-3.5 text-left transition active:bg-white/[0.03]"
            >
              <div className="flex items-center gap-3">
                {/* enabled dot */}
                <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${enabled ? 'bg-emerald-400' : 'bg-gray-700'}`} />

                <div className="min-w-0 flex-1">
                  {/* name + alert */}
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[14px] font-semibold text-white">{comp.name}</span>
                    {needsAttention && (
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-orange-400" />
                    )}
                  </div>

                  {/* stats row */}
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px]">
                    {total > 0 ? (
                      <>
                        <span className="text-gray-500">{total} fixtures</span>
                        <span className={`font-semibold ${enriched === 0 ? 'text-red-400' : 'text-sky-400'}`}>
                          {enrichPct}% enriched
                        </span>
                        <span className={`font-semibold ${color}`}>{label}</span>
                      </>
                    ) : (
                      <span className="text-gray-700">{c ? 'no fixtures synced' : 'loading…'}</span>
                    )}
                  </div>

                  {/* mini progress bar — only when there's data */}
                  {total > 0 && (
                    <div className="mt-2 flex h-1 w-full gap-0.5 overflow-hidden rounded-full bg-white/[0.05]">
                      <div className="h-full bg-sky-500/60 transition-all" style={{ width: `${enrichPct}%` }} />
                      <div className="h-full bg-emerald-500/70 transition-all" style={{ width: `${predPct}%` }} />
                    </div>
                  )}
                </div>

                <ChevronRight className="h-4 w-4 shrink-0 text-gray-700" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
