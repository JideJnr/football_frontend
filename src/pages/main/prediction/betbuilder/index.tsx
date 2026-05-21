import { useEffect, useState, useMemo } from 'react';
import { IonContent, IonPage, useIonRouter } from '@ionic/react';
import { buildAutoBetbuilder, getBetbuilderHistory, getPredictionHistory, saveBetbuilder } from '../../../../services/apis/footballApi';
import { useAuth } from '../../../../contexts/useAuthContext';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Pick {
  type: string;
  selection: string;
  confidence: number;
  reason: string;
}

interface Signal {
  name: string;
  value: any;
  impact: number;
}

interface Prediction {
  id: number;
  match_id: string;
  match_name: string;
  league_name: string;
  source: string;
  best_pick: Pick;
  picks: Pick[];
  signals: Signal[];
  created_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const confidenceColor = (c: number) =>
  c >= 70 ? 'text-green-400' : c >= 58 ? 'text-yellow-400' : 'text-red-400';

const confidenceBg = (c: number) =>
  c >= 70 ? 'bg-green-500' : c >= 58 ? 'bg-yellow-500' : 'bg-red-500';

const estimateOdds = (confidence: number) =>
  confidence > 0 ? Math.max(1.01, 1 / (confidence / 100)).toFixed(2) : '—';

const h2hFromSignals = (signals: Signal[]) =>
  signals.find(s => s.name === 'h2h_edge');

const formatTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleString([], {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
};

// ── Sub-components ────────────────────────────────────────────────────────────

const ConfidenceBar: React.FC<{ value: number }> = ({ value }) => (
  <div className="flex items-center gap-2 mt-1">
    <div className="flex-1 h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${confidenceBg(value)}`}
        style={{ width: `${value}%` }}
      />
    </div>
    <span className={`text-xs font-bold w-8 text-right ${confidenceColor(value)}`}>{value}%</span>
  </div>
);

const H2HBadge: React.FC<{ signal: Signal | undefined }> = ({ signal }) => {
  if (!signal) return null;
  const v = signal.value;
  if (typeof v !== 'object' || !v) return null;
  const { home_wins = 0, away_wins = 0, draws = 0, sample_size = 0 } = v;
  if (!sample_size) return null;
  return (
    <div className="flex items-center gap-1 mt-2 px-2 py-1 rounded bg-[#1a1a1a] border border-[#2a2a2a]">
      <span className="text-[10px] text-gray-500 mr-1">H2H</span>
      <span className="text-xs text-green-400 font-bold">{home_wins}W</span>
      <span className="text-[10px] text-gray-500">·</span>
      <span className="text-xs text-gray-400">{draws}D</span>
      <span className="text-[10px] text-gray-500">·</span>
      <span className="text-xs text-red-400 font-bold">{away_wins}L</span>
      <span className="text-[10px] text-gray-500 ml-1">({sample_size} games)</span>
    </div>
  );
};

const SignalRow: React.FC<{ signal: Signal }> = ({ signal }) => {
  const impact = signal.impact ?? 0;
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="text-gray-500 truncate flex-1">{signal.name.replace(/_/g, ' ')}</span>
      <span className={`font-bold shrink-0 ${impact > 0 ? 'text-green-400' : impact < 0 ? 'text-red-400' : 'text-gray-500'}`}>
        {impact > 0 ? `+${impact}` : impact}
      </span>
    </div>
  );
};

// ── Match Card ────────────────────────────────────────────────────────────────

const MatchCard: React.FC<{
  pred: Prediction;
  accepted: boolean | null;
  onAccept: () => void;
  onReject: () => void;
}> = ({ pred, accepted, onAccept, onReject }) => {
  const [expanded, setExpanded] = useState(false);
  const pick = pred.best_pick;
  const h2h = h2hFromSignals(pred.signals || []);
  const topSignals = (pred.signals || [])
    .filter(s => s.name !== 'ai_brain_review')
    .slice(0, 4);

  const decided = accepted !== null;

  return (
    <div
      className={`rounded-xl border transition-all mb-3 overflow-hidden ${
        accepted === true
          ? 'border-green-600 bg-green-950/30'
          : accepted === false
          ? 'border-[#2a2a2a] bg-[#111] opacity-50'
          : 'border-[#2a2a2a] bg-[#161616]'
      }`}
    >
      {/* Header */}
      <div
        className="px-4 pt-3 pb-2 cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-xs text-gray-500 truncate">{pred.league_name || '—'}</div>
            <div className="text-sm font-semibold text-white truncate mt-0.5">{pred.match_name || '—'}</div>
          </div>
          <div className="text-[10px] text-gray-600 shrink-0 mt-0.5">{formatTime(pred.created_at)}</div>
        </div>

        {/* Best pick */}
        {pick && (
          <div className="mt-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500 uppercase">{pick.type?.replace(/_/g, ' ')}</span>
              <span className="text-xs font-bold text-white flex-1 truncate">{pick.selection}</span>
              <span className="text-xs text-gray-400 shrink-0">~{estimateOdds(pick.confidence)}</span>
            </div>
            <ConfidenceBar value={pick.confidence} />
            <div className="text-[11px] text-gray-500 mt-1 line-clamp-2">{pick.reason}</div>
          </div>
        )}

        <H2HBadge signal={h2h} />

        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-gray-600">{expanded ? '▲ less' : '▼ signals'}</span>
          {accepted === true && <span className="text-[10px] text-green-400 font-bold">✓ Added</span>}
        </div>
      </div>

      {/* Expanded signals */}
      {expanded && (
        <div className="px-4 pb-3 border-t border-[#2a2a2a] pt-2 space-y-1">
          {topSignals.length > 0
            ? topSignals.map((s, i) => <SignalRow key={i} signal={s} />)
            : <div className="text-[11px] text-gray-600">No signals available</div>
          }
          {(pred.picks || []).length > 1 && (
            <div className="mt-2 pt-2 border-t border-[#2a2a2a]">
              <div className="text-[10px] text-gray-500 mb-1">Other picks</div>
              {pred.picks.slice(1).map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px] mb-0.5">
                  <span className="text-gray-600 w-20 shrink-0 truncate">{p.type?.replace(/_/g, ' ')}</span>
                  <span className="flex-1 text-gray-400 truncate">{p.selection}</span>
                  <span className={`shrink-0 font-bold ${confidenceColor(p.confidence)}`}>{p.confidence}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      {!decided && (
        <div className="flex border-t border-[#2a2a2a]">
          <button
            onClick={onReject}
            className="flex-1 py-2.5 text-xs text-red-400 hover:bg-red-950 transition font-semibold"
          >
            ✕ Skip
          </button>
          <div className="w-px bg-[#2a2a2a]" />
          <button
            onClick={onAccept}
            className="flex-1 py-2.5 text-xs text-green-400 hover:bg-green-950 transition font-semibold"
          >
            ✓ Add to Slip
          </button>
        </div>
      )}
      {decided && accepted && (
        <button
          onClick={onReject}
          className="w-full py-2 text-[11px] text-gray-500 hover:text-red-400 border-t border-[#2a2a2a] transition"
        >
          Remove from slip
        </button>
      )}
    </div>
  );
};

// ── Bet Slip ──────────────────────────────────────────────────────────────────

const BetSlip: React.FC<{
  accepted: Prediction[];
  onEnd: () => void;
  saving: boolean;
}> = ({ accepted, onEnd, saving }) => {
  const combinedOdds = accepted.reduce((acc, p) => {
    const odds = parseFloat(estimateOdds(p.best_pick?.confidence ?? 50));
    return acc * (isNaN(odds) ? 1 : odds);
  }, 1);

  const avgConf = accepted.length
    ? Math.round(accepted.reduce((a, p) => a + (p.best_pick?.confidence ?? 50), 0) / accepted.length)
    : 0;

  return (
    <div className="border-t border-[#2a2a2a] bg-[#0d0d0d] px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-400 font-semibold">
          Bet Slip ({accepted.length} {accepted.length === 1 ? 'pick' : 'picks'})
        </span>
        {accepted.length > 0 && (
          <div className="flex items-center gap-3 text-xs">
            <span className="text-gray-500">Combined odds</span>
            <span className="text-white font-bold">{combinedOdds.toFixed(2)}</span>
            <span className={`font-bold ${confidenceColor(avgConf)}`}>{avgConf}% avg</span>
          </div>
        )}
      </div>

      {accepted.length === 0 ? (
        <div className="text-[11px] text-gray-600 text-center py-1">Add picks to build your slip</div>
      ) : (
        <div className="flex flex-wrap gap-1 mb-2">
          {accepted.map(p => (
            <span key={p.id} className="text-[10px] bg-green-900 text-green-300 px-2 py-0.5 rounded-full truncate max-w-[140px]">
              {p.match_name?.split(' vs ')[0] || p.match_id} — {p.best_pick?.selection}
            </span>
          ))}
        </div>
      )}

      <button
        onClick={onEnd}
        disabled={accepted.length === 0 || saving}
        className="w-full py-3 rounded-xl text-sm font-bold transition disabled:opacity-40 disabled:cursor-not-allowed bg-green-600 hover:bg-green-500 text-white"
      >
        {saving ? 'Saving…' : accepted.length === 0 ? 'Add picks first' : `End & Save Slip (${accepted.length})`}
      </button>
    </div>
  );
};

// ── Saved Slip View ───────────────────────────────────────────────────────────

const pickTypeOptions = [
  { label: 'Goals', value: 'goals' },
  { label: 'Double chance', value: 'double_chance' },
  { label: 'Match result', value: 'match_result' },
  { label: 'Market value', value: 'market_value' },
  { label: 'Value bet', value: 'value_bet' },
  { label: 'Live next goal', value: 'live_next_goal' },
  { label: 'Live total goals', value: 'live_total_goals' },
  { label: 'Live winner', value: 'live_match_winner' },
  { label: 'Live team score', value: 'live_team_to_score' },
];

const upcomingPickTypes = ['goals', 'double_chance', 'match_result', 'market_value'];
const livePickTypes = ['live_next_goal', 'live_total_goals', 'live_match_winner', 'live_team_to_score'];

const BuilderTabs = ({ active, onChange }: { active: string; onChange: (value: any) => void }) => (
  <div className="grid grid-cols-3 gap-1 border-b border-[#1e1e1e] bg-[#0d0d0d] px-3 py-2">
    {[
      ['auto', 'Auto Builder'],
      ['manual', 'Manual Picks'],
      ['history', 'Bet History'],
    ].map(([value, label]) => (
      <button
        key={value}
        onClick={() => onChange(value)}
        className={`rounded-lg px-2 py-2 text-xs font-semibold ${active === value ? 'bg-white text-black' : 'border border-[#2a2a2a] text-gray-500'}`}
      >
        {label}
      </button>
    ))}
  </div>
);

const AutoBuilderPanel = ({ form, setForm, result, building, saving, onBuild, onSave }: any) => {
  const toggleType = (value: string) => {
    setForm((current: any) => {
      const set = new Set(current.pick_types || []);
      set.has(value) ? set.delete(value) : set.add(value);
      return { ...current, pick_types: Array.from(set) };
    });
  };
  const fieldConfig: Array<[string, string, string, string?, string?]> = [
    ['target_odds', 'Target odds', '1', '1'],
    ['max_total_odds', 'Odds ceiling', '1', '1'],
    ['min_confidence', 'Min confidence', '1', '40', '99'],
    ['min_leg_odds', 'Min leg odds', '0.01', '1.01'],
    ['max_leg_odds', 'Max leg odds', '0.01', '1.05'],
    ['max_legs', 'Max picks', '1', '1', '30'],
  ];
  const setScope = (scope: 'upcoming' | 'live') => {
    setForm((current: any) => ({
      ...current,
      scope,
      pick_types: scope === 'live' ? livePickTypes : upcomingPickTypes,
      date: '',
      start_time: '',
      end_time: '',
    }));
  };

  return (
    <div className="px-3 py-3 pb-24">
      <div className="rounded-xl border border-[#2a2a2a] bg-[#151515] p-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-bold text-white">Request</div>
            <div className="text-[11px] text-gray-500">Tell the app the odds shape you want.</div>
          </div>
          <button onClick={onBuild} disabled={building} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
            {building ? 'Building...' : 'Generate bet'}
          </button>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-1 rounded-lg bg-black/40 p-1">
          {[
            ['upcoming', 'Upcoming'],
            ['live', 'Live'],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setScope(value as 'upcoming' | 'live')}
              className={`rounded-md px-3 py-2 text-xs font-bold ${form.scope === value ? 'bg-white text-black' : 'text-gray-500'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {fieldConfig.map(([key, label, step, min, max]) => (
            <label key={key} className="text-[10px] text-gray-500">
              {label}
              <input type="number" step={step} min={min} max={max} value={form[key]} onChange={e => setForm((current: any) => ({ ...current, [key]: e.target.value }))} className="mt-1 w-full rounded border border-[#2a2a2a] bg-black px-2 py-1.5 text-xs text-white outline-none" />
            </label>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-3 gap-2">
          <label className="text-[10px] text-gray-500">Date<input type="date" value={form.date} onChange={e => setForm((current: any) => ({ ...current, date: e.target.value }))} className="mt-1 w-full rounded border border-[#2a2a2a] bg-black px-2 py-1.5 text-xs text-white outline-none" /></label>
          <label className="text-[10px] text-gray-500">From<input type="time" value={form.start_time} onChange={e => setForm((current: any) => ({ ...current, start_time: e.target.value }))} className="mt-1 w-full rounded border border-[#2a2a2a] bg-black px-2 py-1.5 text-xs text-white outline-none" /></label>
          <label className="text-[10px] text-gray-500">To<input type="time" value={form.end_time} onChange={e => setForm((current: any) => ({ ...current, end_time: e.target.value }))} className="mt-1 w-full rounded border border-[#2a2a2a] bg-black px-2 py-1.5 text-xs text-white outline-none" /></label>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {pickTypeOptions.map(option => {
            const active = (form.pick_types || []).includes(option.value);
            return <button key={option.value} onClick={() => toggleType(option.value)} className={`rounded-full border px-2.5 py-1 text-[10px] ${active ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-[#333] text-gray-500'}`}>{option.label}</button>;
          })}
        </div>
      </div>

      {result && (
        <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-white">Generated Bet</div>
              <div className="text-[11px] text-gray-500">
                {result.selections?.length || 0} picks · {result.combined_odds || 0} odds · {result.confidence || 0}% average
                <span className={`ml-2 ${result.target_met ? 'text-emerald-400' : 'text-yellow-400'}`}>{result.target_met ? 'target met' : 'closest fit'}</span>
              </div>
              {!result.target_met && (
                <div className="mt-1 text-[10px] text-yellow-400">
                  {result.constraint_warning || `Short by ${result.target_gap || 0} odds. Raise max picks or max leg odds.`}
                </div>
              )}
              {result.max_possible_odds ? (
                <div className="mt-1 text-[10px] text-gray-600">
                  Constraint ceiling: {result.max_possible_odds}
                  {result.request?.max_legs < 30 && !result.target_met ? ' - try 30 max picks for very high targets.' : ''}
                </div>
              ) : null}
            </div>
            <button onClick={onSave} disabled={!result.selections?.length || saving} className="rounded-lg bg-white px-3 py-2 text-[10px] font-bold text-black disabled:opacity-40">{saving ? 'Saving...' : 'Save bet'}</button>
          </div>
          <div className="mt-2 space-y-1.5">
            {(result.selections || []).map((item: any) => (
              <div key={`${item.match_id}-${item.type}-${item.selection}`} className="rounded-lg border border-white/[0.06] bg-[#151515] px-2.5 py-2">
                <div className="truncate text-xs font-semibold text-white">{item.match}</div>
                <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-gray-500">
                  {item.country && <span>{item.country}</span>}
                  {(item.league || item.tournament) && <span>{item.league || item.tournament}</span>}
                  {item.status && <span className={item.scope === 'live' ? 'text-red-300' : 'text-blue-300'}>{item.status}</span>}
                  {item.local_time && <span>{item.local_time}</span>}
                  <span>{item.type?.replace(/_/g, ' ')}</span>
                  <span className="text-emerald-300">{item.selection}</span>
                  <span>odds {item.odds}</span>
                  <span>{item.confidence}%</span>
                </div>
                {item.reason && <div className="mt-1 line-clamp-2 text-[10px] text-gray-600">{item.reason}</div>}
              </div>
            ))}
          </div>
          <div className="mt-2 text-[10px] text-gray-600">{result.learning_note}</div>
        </div>
      )}
    </div>
  );
};

const SavedSlipView: React.FC<{
  slip: any;
  user: any;
  onReset: () => void;
}> = ({ slip, user, onReset }) => {
  const router = useIonRouter();
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center">
      <div className="text-4xl mb-3">🎯</div>
      <div className="text-lg font-bold text-white mb-1">Slip Saved!</div>
      {user && (
        <div className="text-xs text-gray-500 mb-4">
          Saved for <span className="text-white">{user.firstName || user.email}</span>
        </div>
      )}
      <div className="w-full bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 mb-4 text-left">
        <div className="flex justify-between text-xs mb-3">
          <span className="text-gray-500">Slip ID</span>
          <span className="text-white font-mono">#{slip?.bet?.id ?? '—'}</span>
        </div>
        <div className="flex justify-between text-xs mb-3">
          <span className="text-gray-500">Picks</span>
          <span className="text-white">{slip?.bet?.selections?.length ?? 0}</span>
        </div>
        <div className="flex justify-between text-xs mb-3">
          <span className="text-gray-500">Combined Odds</span>
          <span className="text-white font-bold">{slip?.bet?.combined_odds ?? '—'}</span>
        </div>
        <div className="flex justify-between text-xs mb-4">
          <span className="text-gray-500">Avg Confidence</span>
          <span className={`font-bold ${confidenceColor(slip?.bet?.confidence ?? 0)}`}>
            {slip?.bet?.confidence ?? 0}%
          </span>
        </div>
        <div className="border-t border-[#2a2a2a] pt-3 space-y-2">
          {(slip?.bet?.selections || []).map((s: any, i: number) => (
            <div key={i} className="text-xs">
              <div className="text-white font-semibold">{s.match}</div>
              <div className="text-gray-400">{s.selection} · odds {s.odds}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-3 w-full">
        <button
          onClick={onReset}
          className="flex-1 py-2.5 rounded-xl border border-[#2a2a2a] text-xs text-gray-400 hover:text-white transition"
        >
          Build Another
        </button>
        <button
          onClick={() => router.push('/home', 'back', 'pop')}
          className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-xs text-white font-bold transition"
        >
          Go Home
        </button>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────

const BetHistoryPanel = ({ history, loading, onRefresh }: any) => {
  return (
    <IonContent style={{ '--background': '#111' } as any} className="flex-1">
      <div className="px-3 py-3">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-white">Saved Bets</div>
            <div className="text-[11px] text-gray-500">Full generated and manual slips.</div>
          </div>
          <button onClick={onRefresh} className="rounded-lg border border-[#2a2a2a] px-3 py-2 text-xs text-gray-300">Refresh</button>
        </div>
        {loading && <div className="mt-12 text-center text-xs text-gray-500">Loading saved bets...</div>}
        {!loading && !history.length && <div className="mt-12 text-center text-xs text-gray-600">No saved bets yet.</div>}
        <div className="space-y-3">
          {history.map((bet: any) => (
            <div key={bet.id} className="rounded-xl border border-[#2a2a2a] bg-[#161616] p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-white">Bet #{bet.id}</div>
                  <div className="mt-1 text-[10px] text-gray-500">{formatTime(bet.created_at)}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-emerald-300">{Number(bet.combined_odds || 0).toFixed(2)}</div>
                  <div className="text-[10px] text-gray-500">{bet.confidence || 0}% avg - {(bet.selections || []).length} picks</div>
                </div>
              </div>
              {bet.request && Object.keys(bet.request).length > 0 && (
                <div className="mt-2 rounded-lg bg-black/25 px-2 py-1.5 text-[10px] text-gray-500">
                  Request: {bet.request.scope || 'upcoming'} - target {bet.request.target_odds || '-'} - max {bet.request.max_total_odds || '-'} - confidence {bet.request.min_confidence || '-'}+
                </div>
              )}
              <div className="mt-3 space-y-1.5">
                {(bet.selections || []).map((item: any, index: number) => (
                  <div key={`${bet.id}-${index}`} className="rounded-lg border border-white/[0.05] bg-black/20 px-2.5 py-2">
                    <div className="truncate text-xs font-semibold text-white">{item.match || item.match_name || item.match_id}</div>
                    <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-gray-500">
                      {item.country && <span>{item.country}</span>}
                      {(item.league || item.tournament) && <span>{item.league || item.tournament}</span>}
                      <span>{item.type?.replace?.(/_/g, ' ') || item.pick_type || 'pick'}</span>
                      <span className="text-emerald-300">{item.selection}</span>
                      <span>odds {item.odds || '-'}</span>
                      <span>{item.confidence || '-'}%</span>
                    </div>
                    {item.reason && <div className="mt-1 line-clamp-2 text-[10px] text-gray-600">{item.reason}</div>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </IonContent>
  );
};

const Builder = () => {
  const router = useIonRouter();
  const { user } = useAuth();

  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<Record<number, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [savedSlip, setSavedSlip] = useState<any>(null);
  const [filter, setFilter] = useState<'all' | 'high' | 'medium'>('all');
  const [mode, setMode] = useState<'auto' | 'manual' | 'history'>('auto');
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [buildingAuto, setBuildingAuto] = useState(false);
  const [autoResult, setAutoResult] = useState<any>(null);
  const [autoForm, setAutoForm] = useState<any>({
    scope: 'upcoming',
    target_odds: '5000',
    max_total_odds: '6500',
    min_leg_odds: '1.10',
    max_leg_odds: '2.50',
    min_confidence: '70',
    max_legs: '30',
    date: '',
    start_time: '',
    end_time: '',
    pick_types: upcomingPickTypes,
  });

  useEffect(() => {
    setLoading(true);
    getPredictionHistory(200)
      .then(res => {
        const list: Prediction[] = res?.predictions ?? [];
        // deduplicate by match_id, keep latest
        const seen = new Set<string>();
        const deduped = list.filter(p => {
          if (seen.has(p.match_id)) return false;
          seen.add(p.match_id);
          return true;
        });
        setPredictions(deduped);
      })
      .catch(e => setError(e?.response?.data?.detail || 'Failed to load predictions'))
      .finally(() => setLoading(false));
  }, []);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await getBetbuilderHistory(100);
      setHistory(res?.bets || []);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to load bet history');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (mode === 'history') loadHistory();
  }, [mode]);

  const filtered = useMemo(() => {
    return predictions.filter(p => {
      const c = p.best_pick?.confidence ?? 0;
      if (filter === 'high') return c >= 70;
      if (filter === 'medium') return c >= 58 && c < 70;
      return p.best_pick?.type !== 'no_bet';
    });
  }, [predictions, filter]);

  const accepted = useMemo(
    () => filtered.filter(p => decisions[p.id] === true),
    [filtered, decisions]
  );

  const handleAccept = (id: number) =>
    setDecisions(d => ({ ...d, [id]: true }));

  const handleReject = (id: number) =>
    setDecisions(d => ({ ...d, [id]: false }));

  const handleEnd = async () => {
    if (!accepted.length) return;
    setSaving(true);
    try {
      const selections = accepted.map(p => ({
        match_id: p.match_id,
        match: p.match_name,
        league: p.league_name,
        selection: p.best_pick?.selection,
        odds: parseFloat(estimateOdds(p.best_pick?.confidence ?? 50)),
        confidence: p.best_pick?.confidence,
        reason: p.best_pick?.reason,
      }));
      const res = await saveBetbuilder({ selections });
      setSavedSlip(res);
      loadHistory();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to save slip');
    } finally {
      setSaving(false);
    }
  };

  const handleAutoBuild = async () => {
    setBuildingAuto(true);
    setError(null);
    try {
      const res = await buildAutoBetbuilder({
        ...autoForm,
        target_odds: Number(autoForm.target_odds),
        max_total_odds: Number(autoForm.max_total_odds),
        min_leg_odds: Number(autoForm.min_leg_odds),
        max_leg_odds: Number(autoForm.max_leg_odds),
        min_confidence: Number(autoForm.min_confidence),
        max_legs: Number(autoForm.max_legs),
      });
      setAutoResult(res);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to build auto slip');
    } finally {
      setBuildingAuto(false);
    }
  };

  const handleSaveAuto = async () => {
    if (!autoResult?.selections?.length) return;
    setSaving(true);
    setError(null);
    try {
      const res = await saveBetbuilder({
        selections: autoResult.selections,
        request: autoResult.request,
      } as any);
      setSavedSlip(res);
      loadHistory();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to save auto slip');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setDecisions({});
    setSavedSlip(null);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <IonPage>
      <div className="w-full h-full bg-[#111] text-white flex flex-col">

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1e1e1e] shrink-0">
          <button onClick={() => router.goBack()} className="text-gray-400 text-lg">←</button>
          <div className="flex-1">
            <div className="text-sm font-bold text-white">Bet Builder</div>
            {user && (
              <div className="text-[11px] text-gray-500">
                {user.firstName || user.email} · {accepted.length} selected
              </div>
            )}
          </div>
          <div className="text-xs text-gray-600">{filtered.length} matches</div>
        </div>

        <BuilderTabs active={mode} onChange={setMode} />

        {mode === 'manual' && (
          <div className="flex gap-1 px-3 py-2 border-b border-[#1e1e1e] shrink-0">
          {(['all', 'high', 'medium'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-xs border transition ${
                filter === f
                  ? 'border-white bg-white text-black font-semibold'
                  : 'border-[#333] text-gray-500 hover:text-white'
              }`}
            >
              {f === 'all' ? 'All' : f === 'high' ? '🔥 High (70%+)' : '⚡ Medium (58%+)'}
            </button>
          ))}
          </div>
        )}

        {/* Content */}
        {savedSlip ? (
          <SavedSlipView slip={savedSlip} user={user} onReset={handleReset} />
        ) : mode === 'history' ? (
          <BetHistoryPanel history={history} loading={historyLoading} onRefresh={loadHistory} />
        ) : mode === 'auto' ? (
          <IonContent style={{ '--background': '#111' } as any} className="flex-1">
            {error && <div className="px-4 pt-4 text-center text-xs text-red-400">{error}</div>}
            <AutoBuilderPanel
              form={autoForm}
              setForm={setAutoForm}
              result={autoResult}
              building={buildingAuto}
              saving={saving}
              onBuild={handleAutoBuild}
              onSave={handleSaveAuto}
            />
          </IonContent>
        ) : (
          <>
            <IonContent style={{ '--background': '#111' } as any} className="flex-1">
              <div className="px-3 py-3">
                {loading && (
                  <div className="text-center text-gray-500 text-xs mt-16">Loading predictions…</div>
                )}
                {error && (
                  <div className="text-center text-red-400 text-xs mt-10 px-4">{error}</div>
                )}
                {!loading && !error && filtered.length === 0 && (
                  <div className="text-center text-gray-600 text-xs mt-16">
                    No predictions found. Run predictions from the match detail page first.
                  </div>
                )}
                {!loading && filtered.map(pred => (
                  <MatchCard
                    key={pred.id}
                    pred={pred}
                    accepted={decisions[pred.id] ?? null}
                    onAccept={() => handleAccept(pred.id)}
                    onReject={() => handleReject(pred.id)}
                  />
                ))}
              </div>
            </IonContent>

            {/* Sticky bet slip */}
            <BetSlip accepted={accepted} onEnd={handleEnd} saving={saving} />
          </>
        )}
      </div>
    </IonPage>
  );
};

export default Builder;
