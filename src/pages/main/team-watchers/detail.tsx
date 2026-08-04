import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useIonRouter } from '@ionic/react';
import { ArrowLeft, Brain, CalendarDays, Database, RefreshCw, ShieldCheck } from 'lucide-react';
import { getTeamWatcher } from '../../../services/apis/footballApi';

const pct = (value: number) => `${Math.round(Number(value || 0) * 100)}%`;

const card = 'rounded-lg border border-white/[0.06] bg-white/[0.03] p-3';

const pill = (value: string) => (
  <span className="rounded bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold text-gray-500">{value}</span>
);

export default function TeamWatcherDetailPage() {
  const { teamKey } = useParams<{ teamKey: string }>();
  const router = useIonRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await getTeamWatcher(teamKey, 40);
      setData(res);
      setMsg('');
    } catch (err: any) {
      setMsg(err?.response?.data?.detail || err?.message || 'Load failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [teamKey]);

  const watcher = data?.watcher ?? {};
  // profile_json may be stored as '{}' — fall back to top-level watcher fields
  const profile = (watcher?.profile && Object.keys(watcher.profile).length > 0)
    ? watcher.profile
    : {
        analyst_score: watcher?.overview?.learned_signals ? 0 : 0,
        trend: null,
        record: null,
        preferred_markets: watcher?.overview?.learned_signals?.preferred_markets ?? [],
        prediction_context: { confidence: 'low', market_focus: [] },
        venue_split: watcher?.venue_split ?? {},
      };
  const venue = profile?.venue_split ?? watcher?.venue_split ?? {};
  const home = venue?.home ?? {};
  const away = venue?.away ?? {};
  const matches: any[] = data?.matches ?? [];
  const recent = useMemo(() => matches.slice(0, 10), [matches]);

  return (
    <div className="h-full w-full overflow-y-auto bg-[#0c0c0c] text-white">
      <div className="sticky top-0 z-10 border-b border-white/[0.06] bg-[#0c0c0c] px-4 pb-3 pt-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.goBack()} className="rounded-md p-1 text-gray-500 active:text-white">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[16px] font-bold text-white">{watcher.team_name || decodeURIComponent(teamKey)}</h1>
            <p className="text-[10px] text-gray-600">
              {watcher.league_name || 'League unknown'} · {watcher.position || 'unranked'} · {watcher.match_count || 0} matches
            </p>
          </div>
          <button onClick={load} disabled={loading} className="rounded-md border border-white/[0.08] bg-white/[0.04] p-1.5 text-gray-400 disabled:opacity-40">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {msg && <div className="mt-2 rounded-md bg-white/[0.04] px-3 py-2 text-[11px] text-gray-300">{msg}</div>}

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className={card}>
            <div className="text-[10px] uppercase tracking-widest text-gray-500">Analyst score</div>
            <div className="mt-1 text-2xl font-bold text-emerald-300">{Math.round(Number(profile.analyst_score ?? 0))}</div>
            <div className="mt-1 text-[10px] text-gray-600">{profile.trend || 'stable'}</div>
          </div>
          <div className={card}>
            <div className="text-[10px] uppercase tracking-widest text-gray-500">Prediction context</div>
            <div className="mt-1 text-sm font-semibold text-white">{profile?.prediction_context?.confidence || 'low'}</div>
            <div className="mt-1 text-[10px] text-gray-600">{(profile?.prediction_context?.market_focus || []).join(' · ') || 'No market focus yet'}</div>
          </div>
        </div>
      </div>

      <div className="space-y-3 px-4 py-3">
        {loading && !data && <div className="py-12 text-center text-sm text-gray-600">Loading...</div>}

        <div className="grid grid-cols-2 gap-2">
          <div className={card}>
            <div className="text-[10px] uppercase tracking-widest text-gray-500">Team IDs</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {watcher.sporty_team_id ? pill(`Sporty ${watcher.sporty_team_id}`) : pill('No sporty id')}
              {watcher.sofascore_team_id ? pill(`SofaScore ${watcher.sofascore_team_id}`) : pill('No sofascore id')}
            </div>
          </div>
          <div className={card}>
            <div className="text-[10px] uppercase tracking-widest text-gray-500">Record</div>
            <div className="mt-2 text-sm font-semibold text-white">{profile?.record?.form || 'n/a'}</div>
            <div className="mt-1 text-[10px] text-gray-600">
              {profile?.record?.wins || 0}W · {profile?.record?.draws || 0}D · {profile?.record?.losses || 0}L
            </div>
          </div>
        </div>

        <div className={card}>
          <div className="flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-widest text-gray-500">Venue split</div>
            <CalendarDays className="h-4 w-4 text-gray-700" />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded bg-white/[0.02] p-2">
              <div className="text-[10px] text-gray-500">Home</div>
              <div className="mt-1 font-semibold text-white">{home.played || 0} played</div>
              <div className="mt-1 text-[10px] text-gray-600">PPG {home.ppg ?? 0} · CS {pct(home.clean_sheet_rate || 0)}</div>
            </div>
            <div className="rounded bg-white/[0.02] p-2">
              <div className="text-[10px] text-gray-500">Away</div>
              <div className="mt-1 font-semibold text-white">{away.played || 0} played</div>
              <div className="mt-1 text-[10px] text-gray-600">PPG {away.ppg ?? 0} · CS {pct(away.clean_sheet_rate || 0)}</div>
            </div>
          </div>
        </div>

        <div className={card}>
          <div className="flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-widest text-gray-500">Preferred markets</div>
            <ShieldCheck className="h-4 w-4 text-gray-700" />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(profile?.preferred_markets || []).slice(0, 6).map((market: any, index: number) => (
              <span key={`${market.market}-${index}`} className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                {String(market.market).replace(/_/g, ' ')}
              </span>
            ))}
            {!(profile?.preferred_markets || []).length && pill('No markets yet')}
          </div>
        </div>

        <div className={card}>
          <div className="flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-widest text-gray-500">Recent matches</div>
            <Database className="h-4 w-4 text-gray-700" />
          </div>
          <div className="mt-3 space-y-2">
            {recent.map((match) => (
              <div key={match.match_id} className="rounded bg-white/[0.02] p-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-[11px] font-semibold text-white">{match.opponent || 'Opponent unavailable'}</div>
                    <div className="mt-0.5 text-[10px] text-gray-600">{match.tournament || match.league_name || 'Tournament unknown'} · {match.team_side || 'side unknown'}</div>
                  </div>
                  <div className="text-right text-[11px] font-bold text-white">
                    {match.goals_for ?? '—'}-{match.goals_against ?? '—'}
                  </div>
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5 text-[10px]">
                  {pill(match.result || 'pending')}
                  {pill(match.status || 'unknown')}
                  {pill(match.venue || 'venue n/a')}
                </div>
                {match.brief && <div className="mt-1 text-[10px] leading-relaxed text-gray-500">{match.brief}</div>}
              </div>
            ))}
            {!recent.length && <div className="py-6 text-center text-sm text-gray-600">No match history yet.</div>}
          </div>
        </div>

        {watcher.overview && (
          <div className={card}>
            <div className="text-[10px] uppercase tracking-widest text-gray-500">AI overview</div>
            <div className="mt-2 text-sm leading-relaxed text-gray-200">{watcher.overview?.summary || watcher.overview?.note || 'Overview not available yet.'}</div>
          </div>
        )}
      </div>
    </div>
  );
}
