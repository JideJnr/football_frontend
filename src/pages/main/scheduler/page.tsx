import { IonContent, IonPage, useIonRouter } from '@ionic/react';
import { useCallback, useEffect, useState } from 'react';
import {
  getSchedulerIntervals,
  patchSchedulerIntervals,
  resetSchedulerIntervals,
} from '../../../services/apis/footballApi';

interface SchedulerJob {
  job_id: string;
  engine_id: string;
  label: string;
  enabled: boolean;
  interval_seconds: number;
  default_seconds: number;
  min_seconds: number;
  max_seconds: number;
  last_run_at: string | null;
  next_run_at: string | null;
}

const formatSeconds = (seconds: number) => {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  return `${minutes}m`;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return 'not scheduled';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'not scheduled';
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const SchedulerPage = () => {
  const router = useIonRouter();
  const [jobs, setJobs] = useState<SchedulerJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await getSchedulerIntervals(false);
      const sorted = [...(res.jobs ?? [])].sort((a: SchedulerJob, b: SchedulerJob) => {
        const priority = (job: SchedulerJob) => job.job_id.startsWith('competition_') ? 0 : 1;
        return priority(a) - priority(b) || a.label.localeCompare(b.label);
      });
      setJobs(sorted);
    } catch (e: any) {
      setMessage(e?.response?.data?.detail || e?.message || 'Could not load scheduler intervals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 10000);
    return () => window.clearInterval(timer);
  }, [load]);

  const saveInterval = async (jobId: string, seconds: number) => {
    setSavingId(jobId);
    setMessage('');
    try {
      await patchSchedulerIntervals({ [jobId]: seconds });
      await load();
      setMessage('Interval updated');
    } catch (e: any) {
      setMessage(e?.response?.data?.detail || e?.message || 'Interval update failed');
    } finally {
      setSavingId(null);
    }
  };

  const resetDefaults = async () => {
    setSavingId('reset');
    setMessage('');
    try {
      await resetSchedulerIntervals();
      await load();
      setMessage('Scheduler intervals reset to defaults');
    } catch (e: any) {
      setMessage(e?.response?.data?.detail || e?.message || 'Reset failed');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <IonPage>
      <IonContent fullscreen className="ion-padding-0">
        <div className="min-h-full bg-[#0f0f0f] text-white pb-8">
          <div className="sticky top-0 z-20 bg-[#0f0f0f]/95 border-b border-white/[0.06] px-4 py-3 backdrop-blur flex items-center justify-between">
            <button onClick={() => router.goBack()} className="text-xs font-semibold text-gray-400 hover:text-white">
              Back
            </button>
            <span className="text-xs font-bold text-gray-300">Scheduler</span>
            <button onClick={load} className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold">Refresh</button>
          </div>

          <div className="px-4 pt-4 space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-[#161616] border border-white/[0.07] px-4 py-3">
              <div>
                <div className="text-sm font-bold text-white">{jobs.length} active jobs</div>
                <div className="text-[11px] text-gray-500 mt-0.5">Competition special and analysis times apply immediately to running scheduler jobs</div>
              </div>
              <button
                onClick={resetDefaults}
                disabled={savingId === 'reset'}
                className="px-3 py-2 rounded-lg text-xs font-semibold bg-white/[0.04] border border-white/[0.08] text-gray-300 hover:border-emerald-500/30 disabled:opacity-40"
              >
                {savingId === 'reset' ? 'Resetting' : 'Reset to Defaults'}
              </button>
            </div>

            {message && (
              <div className="text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                {message}
              </div>
            )}

            {loading && <div className="text-[12px] text-gray-500 py-8 text-center">Loading scheduler jobs</div>}

            <div className="space-y-2">
              {jobs.map(job => (
                <div key={job.job_id} className="rounded-xl bg-[#161616] border border-white/[0.07] px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-gray-100">{job.label}</div>
                      <div className="text-[10px] text-gray-600 mt-0.5">
                        {job.job_id}
                        {job.job_id.startsWith('competition_') && (
                          <span className="ml-2 text-emerald-300">competition</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-emerald-300">{formatSeconds(job.interval_seconds)}</div>
                      <div className="text-[10px] text-gray-600">default {formatSeconds(job.default_seconds)}</div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <input
                      type="range"
                      min={job.min_seconds}
                      max={job.max_seconds}
                      step={job.min_seconds < 60 ? 15 : 30}
                      value={job.interval_seconds}
                      onChange={event => {
                        const seconds = Number(event.currentTarget.value);
                        setJobs(current => current.map(item => item.job_id === job.job_id ? { ...item, interval_seconds: seconds } : item));
                      }}
                      onMouseUp={event => saveInterval(job.job_id, Number(event.currentTarget.value))}
                      onTouchEnd={event => saveInterval(job.job_id, Number(event.currentTarget.value))}
                      className="w-full accent-emerald-400"
                    />
                    <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                      <span>{formatSeconds(job.min_seconds)}</span>
                      <span>{formatSeconds(job.max_seconds)}</span>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-white/[0.03] border border-white/[0.05] px-3 py-2">
                      <div className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Last Run</div>
                      <div className="text-[11px] text-gray-300 mt-0.5">{formatDateTime(job.last_run_at)}</div>
                    </div>
                    <div className="rounded-lg bg-white/[0.03] border border-white/[0.05] px-3 py-2">
                      <div className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Next Run</div>
                      <div className="text-[11px] text-gray-300 mt-0.5">{formatDateTime(job.next_run_at)}</div>
                    </div>
                  </div>

                  {savingId === job.job_id && (
                    <div className="mt-2 text-[10px] text-emerald-300">Saving interval</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default SchedulerPage;
