import { IonContent, IonPage } from '@ionic/react';
import { useIonRouter } from '@ionic/react';
import { useEffect, useState, useCallback } from 'react';
import {
  getPipelines,
  enablePipeline,
  disablePipeline,
  applyPipelinePreset,
} from '../../../services/apis/footballApi';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Pipeline {
  engine_id: string;
  label: string;
  description: string;
  interval: string;
  source: 'SportyBet' | 'SofaScore' | 'Internal';
  job_ids: string[];
  enabled: boolean;
  last_run_at: string | null;
  last_error: string | null;
  consecutive_failures: number;
  run_count: number;
  conflict_warning?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const SOURCE_BADGE: Record<string, string> = {
  SportyBet: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  SofaScore: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  Internal:  'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const timeAgo = (ts: string | null): string => {
  if (!ts) return 'never';
  const diff = Date.now() - new Date(ts).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
};

// ── Toggle ────────────────────────────────────────────────────────────────────

const Toggle = ({
  enabled, loading, onToggle,
}: {
  enabled: boolean;
  loading: boolean;
  onToggle: () => void;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={enabled}
    onClick={onToggle}
    disabled={loading}
    className={`relative h-6 w-11 shrink-0 rounded-full border transition-all disabled:opacity-40 ${
      enabled ? 'border-emerald-400 bg-emerald-500/30' : 'border-white/10 bg-white/[0.05]'
    }`}
  >
    <span className={`absolute top-0.5 h-5 w-5 rounded-full transition-all ${
      enabled ? 'left-5 bg-emerald-300' : 'left-0.5 bg-gray-500'
    } ${loading ? 'opacity-50' : ''}`} />
  </button>
);

// ── Pipelines page ────────────────────────────────────────────────────────────

const PipelinesPage = () => {
  const router = useIonRouter();

  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [presetLoading, setPresetLoading] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await getPipelines();
      setPipelines(res.pipelines ?? []);
    } catch {
      setMsg('Could not load pipeline states');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Toggle single pipeline — persists immediately to the backend engine_state table
  const handleToggle = async (pipeline: Pipeline) => {
    setTogglingId(pipeline.engine_id);
    setMsg('');
    try {
      if (pipeline.enabled) {
        await disablePipeline(pipeline.engine_id);
      } else {
        await enablePipeline(pipeline.engine_id);
      }
      // Reload from backend so UI reflects the persisted state
      await load();
    } catch (e: any) {
      setMsg(e?.response?.data?.detail || e?.message || 'Toggle failed');
    } finally {
      setTogglingId(null);
    }
  };

  const handlePreset = async (preset: 'cloud' | 'local' | 'off') => {
    setPresetLoading(preset);
    setMsg('');
    try {
      const res = await applyPipelinePreset(preset);
      setMsg(`Preset "${preset}" applied — ${res.applied_count} pipelines updated`);
      await load();
    } catch (e: any) {
      setMsg(e?.response?.data?.detail || e?.message || 'Preset failed');
    } finally {
      setPresetLoading(null);
    }
  };

  const enabledCount = pipelines.filter(p => p.enabled).length;

  return (
    <IonPage>
      <IonContent fullscreen className="ion-padding-0">
        <div className="min-h-full bg-[#0f0f0f] text-white pb-8">

          {/* Header */}
          <div className="sticky top-0 z-20 bg-[#0f0f0f]/95 border-b border-white/[0.06] px-4 py-3 backdrop-blur flex items-center justify-between">
            <button onClick={() => router.goBack()} className="text-xs font-semibold text-gray-400 hover:text-white">
              ← Back
            </button>
            <span className="text-xs font-bold text-gray-300">Pipeline Control</span>
            <button onClick={load} className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold">↻</button>
          </div>

          <div className="px-4 pt-4 space-y-4">

            {/* Summary strip */}
            <div className="flex items-center justify-between bg-[#161616] border border-white/[0.07] rounded-xl px-4 py-3">
              <div>
                <div className="text-sm font-bold text-white">{enabledCount} / {pipelines.length} active</div>
                <div className="text-[11px] text-gray-500 mt-0.5">Pausing a pipeline persists until you re-enable it</div>
              </div>
              <div className={`w-2.5 h-2.5 rounded-full ${enabledCount > 0 ? 'bg-emerald-400' : 'bg-red-500'}`} />
            </div>

            {/* Preset buttons */}
            <div>
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Quick Presets</div>
              <div className="flex gap-2">
                {([
                  { id: 'local', label: '🖥 Local (all on)',      cls: 'border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10' },
                  { id: 'cloud', label: '☁ Cloud (SofaScore)',   cls: 'border-blue-500/30 text-blue-300 hover:bg-blue-500/10' },
                  { id: 'off',   label: '⏸ Pause All',           cls: 'border-red-500/30 text-red-300 hover:bg-red-500/10' },
                ] as const).map(({ id, label, cls }) => (
                  <button
                    key={id}
                    onClick={() => handlePreset(id)}
                    disabled={!!presetLoading}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border bg-white/[0.03] transition disabled:opacity-40 ${cls}`}
                  >
                    {presetLoading === id ? '…' : label}
                  </button>
                ))}
              </div>
            </div>

            {msg && (
              <div className="text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                {msg}
              </div>
            )}

            {/* Pipeline list */}
            <div>
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Pipelines</div>

              {loading && (
                <div className="text-[12px] text-gray-500 py-6 text-center">Loading…</div>
              )}

              <div className="space-y-2">
                {pipelines.map(pipeline => {
                  const isToggling = togglingId === pipeline.engine_id;

                  return (
                    <div
                      key={pipeline.engine_id}
                      className={`rounded-xl border px-4 py-3 transition-all ${
                        pipeline.enabled
                          ? 'bg-emerald-500/[0.05] border-emerald-500/20'
                          : 'bg-[#161616] border-white/[0.07]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          {/* Name + badges */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-gray-200">{pipeline.label}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wide ${SOURCE_BADGE[pipeline.source] || SOURCE_BADGE.Internal}`}>
                              {pipeline.source}
                            </span>
                            <span className="text-[9px] text-gray-600 bg-white/[0.04] border border-white/[0.06] px-1.5 py-0.5 rounded">
                              {pipeline.interval}
                            </span>
                            {!pipeline.enabled && (
                              <span className="text-[9px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                                PAUSED
                              </span>
                            )}
                            {pipeline.last_error && (
                              <span className="text-[9px] text-red-400 font-bold">⚠ error</span>
                            )}
                          </div>

                          {/* Description */}
                          <div className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                            {pipeline.description}
                          </div>

                          {/* Stats row */}
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            <span className="text-[10px] text-gray-600">
                              Last run: <span className={pipeline.last_run_at ? 'text-gray-400' : 'text-gray-600'}>{timeAgo(pipeline.last_run_at)}</span>
                            </span>
                            {pipeline.run_count > 0 && (
                              <span className="text-[10px] text-gray-600">{pipeline.run_count} runs</span>
                            )}
                            {pipeline.consecutive_failures > 0 && (
                              <span className="text-[10px] text-red-400">{pipeline.consecutive_failures} failures</span>
                            )}
                          </div>

                          {/* Conflict warning */}
                          {pipeline.conflict_warning && (
                            <div className="mt-1.5 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-1 leading-snug">
                              ⚡ {pipeline.conflict_warning}
                            </div>
                          )}

                          {/* Error detail */}
                          {pipeline.last_error && (
                            <div className="mt-1 text-[10px] text-red-400 truncate">{pipeline.last_error}</div>
                          )}
                        </div>

                        {/* Toggle */}
                        <div className="pt-0.5 flex flex-col items-center gap-1">
                          <Toggle
                            enabled={pipeline.enabled}
                            loading={isToggling}
                            onToggle={() => handleToggle(pipeline)}
                          />
                          <span className="text-[9px] text-gray-600">
                            {isToggling ? '…' : pipeline.enabled ? 'On' : 'Off'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default PipelinesPage;
