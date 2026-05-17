import { IonContent, IonPage, IonRefresher, IonRefresherContent, useIonRouter } from '@ionic/react';
import { useParams } from 'react-router';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useFootballContext } from '../../../../contexts/useFootballContext';
import {
  enrichMatch,
  getSofascoreCandidates,
  matchSofascoreCandidate,
  predictMatch,
} from '../../../../services/apis/footballApi';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const val = (v: any, fb = '—') => (v != null && v !== '') ? v : fb;

const fmtDateTime = (ms: any) => {
  if (!ms) return '—';
  const d = typeof ms === 'string' ? new Date(ms) : new Date(ms < 1e10 ? ms * 1000 : ms);
  return d.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const fmtTime = (ms: any) => {
  if (!ms) return '—';
  const d = typeof ms === 'string' ? new Date(ms) : new Date(ms < 1e10 ? ms * 1000 : ms);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const compactForm = (form: any): string => {
  if (!form) return '';
  if (typeof form === 'string') return form;
  if (Array.isArray(form)) return form.map((x: any) => {
    const v = x?.result ?? x?.value ?? x?.winnerCode ?? '';
    return String(v).slice(0, 1).toUpperCase();
  }).join('');
  return String(form);
};

const parsePlayedSeconds = (v: any): number | null => {
  if (v == null) return null;
  if (typeof v === 'number') return v > 0 ? v : null;
  if (typeof v === 'string' && v.includes(':')) {
    const [mm, ss] = v.split(':').map(Number);
    if (!isNaN(mm) && !isNaN(ss)) return mm * 60 + ss;
  }
  const n = Number(v);
  return !isNaN(n) && n > 0 ? n : null;
};

const getMatchTime = (m: any): string | null => {
  const p: string = m?.period || '';
  if (!p || p === 'Not start' || p === 'Not started') return null;
  if (p === 'HT') return 'HT';
  if (p === 'FT' || p === 'AET') return 'FT';
  if (p === 'Penalty') return 'PEN';
  const isFirst  = p === 'H1' || p === '1H';
  const isSecond = p === 'H2' || p === '2H';
  const ps = parsePlayedSeconds(m?.played_seconds);
  if (ps !== null) {
    const mins = Math.floor(ps / 60);
    if (isFirst)  { const d = Math.min(mins, 45); const a = mins > 45 ? mins - 45 : 0; return a > 0 ? `45+${a}'` : `${d}'`; }
    if (isSecond) { const d = Math.min(mins, 90); const a = mins > 90 ? mins - 90 : 0; return a > 0 ? `90+${a}'` : `${d}'`; }
    return `${mins}'`;
  }
  const t = m?.start_time;
  const startMs = !t ? 0 : typeof t === 'string' ? new Date(t).getTime() : t < 1e10 ? t * 1000 : t;
  if (!startMs) return p;
  const e = Math.floor((Date.now() - startMs) / 60000);
  if (isFirst)  { const d = Math.min(e, 45); const a = e > 45 ? Math.min(e - 45, 5) : 0; return a > 0 ? `45+${a}'` : `${d}'`; }
  if (isSecond) { const sh = e - 60; if (sh < 0) return "45'"; const d = 45 + Math.min(sh, 45); const a = sh > 45 ? Math.min(sh - 45, 5) : 0; return a > 0 ? `90+${a}'` : `${d}'`; }
  return `${Math.min(e, 90)}'`;
};

const isLive = (m: any) => {
  const p = m?.period;
  return p && p !== 'Not started' && p !== 'Not start' && p !== 'FT' && p !== 'AET' && p !== 'Finished';
};

// ─── Shared UI ────────────────────────────────────────────────────────────────

const LiveDot = () => (
  <span className="relative flex h-2 w-2 shrink-0">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
  </span>
);

const Sec = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="bg-[#161616] border border-white/[0.07] rounded-xl overflow-hidden mb-3">
    <div className="px-4 py-2.5 border-b border-white/[0.07] text-[10px] font-bold text-gray-500 uppercase tracking-widest">{title}</div>
    <div className="p-4 space-y-2.5">{children}</div>
  </div>
);

const Row = ({ label, value, color }: { label: string; value: any; color?: string }) => (
  <div className="flex justify-between items-center text-sm gap-4">
    <span className="text-gray-500 shrink-0">{label}</span>
    <span className={`text-right ${color || 'text-white font-medium'}`}>{val(value)}</span>
  </div>
);

const FormDots = ({ form }: { form: any }) => {
  const t = compactForm(form);
  if (!t) return <span className="text-gray-600 text-xs">—</span>;
  return (
    <div className="flex gap-1">
      {t.split('').slice(-5).map((r, i) => (
        <span key={i} className={`w-5 h-5 rounded-full text-[9px] flex items-center justify-center font-bold ${r === 'W' ? 'bg-emerald-500/25 text-emerald-400' : r === 'L' ? 'bg-red-500/25 text-red-400' : 'bg-gray-600/30 text-gray-400'}`}>{r}</span>
      ))}
    </div>
  );
};

const StatBar = ({ a, b }: { a: number; b: number }) => {
  const total = (a + b) || 1;
  return (
    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden flex mt-1">
      <div className="bg-emerald-500 rounded-full transition-all" style={{ width: `${(a / total) * 100}%` }} />
      <div className="bg-blue-500 rounded-full transition-all" style={{ width: `${(b / total) * 100}%` }} />
    </div>
  );
};

const Empty = ({ msg = 'No data available' }: { msg?: string }) => (
  <div className="flex flex-col items-center justify-center py-10 gap-2">
    <span className="text-2xl">📭</span>
    <span className="text-xs text-gray-600">{msg}</span>
  </div>
);

// ─── Tab definitions ──────────────────────────────────────────────────────────

const TABS = ['Home', 'Details', 'Lineups', 'Statistics', 'Odds', 'Comparison', 'H2H', 'Prediction'] as const;
type Tab = typeof TABS[number];

// ─── Hero header (always visible) ────────────────────────────────────────────

const MatchHero = ({ m, activeTab, setActiveTab }: { m: any; activeTab: Tab; setActiveTab: (t: Tab) => void }) => {
  const live = isLive(m);
  const matchTime = getMatchTime(m);
  const score = m?.score;
  const hasScore = score?.home != null && score?.away != null;

  return (
    <div className="bg-[#161616] border-b border-white/[0.07]">
      {/* Tournament */}
      <div className="text-center pt-4 pb-1">
        <span className="text-[10px] text-gray-500 uppercase tracking-widest">{val(m.tournament)}</span>
        {m.venue && <div className="text-[10px] text-gray-700 mt-0.5">{m.venue}</div>}
      </div>

      {/* Teams + score */}
      <div className="flex items-center gap-2 px-4 py-3">
        {/* Home */}
        <div className="flex-1 text-center">
          <div className="text-sm font-semibold text-white leading-tight">{m.home_team}</div>
          {m.home_position && <div className="text-[10px] text-gray-600">#{m.home_position}</div>}
          {m.home_form && <div className="flex justify-center mt-1"><FormDots form={m.home_form} /></div>}
        </div>

        {/* Score / time */}
        <div className="flex flex-col items-center shrink-0 min-w-[88px]">
          {hasScore ? (
            <>
              <div className="flex items-center gap-1.5">
                {live && <LiveDot />}
                <span className="text-2xl font-bold text-white tabular-nums">{score.home} – {score.away}</span>
              </div>
              {matchTime && (
                <span className={`text-xs font-bold mt-0.5 ${m.period === 'HT' ? 'text-orange-400' : m.period === 'FT' || m.period === 'AET' ? 'text-gray-500' : 'text-red-400'}`}>
                  {matchTime}
                </span>
              )}
            </>
          ) : (
            <>
              <span className="text-xl font-bold text-emerald-400">{fmtTime(m.start_time)}</span>
              <span className="text-[10px] text-gray-600 mt-0.5">{fmtDateTime(m.start_time)}</span>
            </>
          )}
        </div>

        {/* Away */}
        <div className="flex-1 text-center">
          <div className="text-sm font-semibold text-white leading-tight">{m.away_team}</div>
          {m.away_position && <div className="text-[10px] text-gray-600">#{m.away_position}</div>}
          {m.away_form && <div className="flex justify-center mt-1"><FormDots form={m.away_form} /></div>}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex overflow-x-auto border-t border-white/[0.06] scrollbar-hide">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 px-4 py-2.5 text-xs font-semibold transition-colors whitespace-nowrap border-b-2 ${
              activeTab === tab
                ? 'text-emerald-400 border-emerald-400'
                : 'text-gray-500 border-transparent hover:text-gray-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
};

// ─── Tab: Overview ────────────────────────────────────────────────────────────

const TabOverview = ({ m, onEnrich, onPredict, enriching, predicting, actionMsg }: any) => (
  <div className="px-4 py-4 space-y-3">
    {/* Action buttons */}
    <div className="flex gap-2">
      <button onClick={onEnrich} disabled={enriching}
        className="flex-1 py-2.5 rounded-xl text-xs font-semibold border border-white/10 text-gray-300 hover:border-emerald-500/40 hover:text-emerald-400 transition disabled:opacity-40">
        {enriching ? 'Enriching…' : '⚡ Enrich'}
      </button>
      <button onClick={onPredict} disabled={predicting}
        className="flex-1 py-2.5 rounded-xl text-xs font-semibold border border-white/10 text-gray-300 hover:border-purple-500/40 hover:text-purple-400 transition disabled:opacity-40">
        {predicting ? 'Predicting…' : '🔮 Predict'}
      </button>
    </div>
    {actionMsg && <div className="text-center text-xs text-emerald-400">{actionMsg}</div>}

    {/* Match info */}
    <Sec title="Match Info">
      <Row label="Tournament" value={m.tournament} />
      <Row label="Kickoff" value={fmtDateTime(m.start_time)} />
      {m.time_context?.start_local && <Row label="Local kickoff" value={`${m.time_context.local_date} ${m.time_context.local_time} (${m.time_context.timezone})`} color="text-emerald-400" />}
      {m.time_context?.start_utc && <Row label="UTC kickoff" value={`${m.time_context.utc_date} ${m.time_context.utc_time}`} color="text-gray-400" />}
      {m.venue && <Row label="Venue" value={m.venue} />}
      {m.home_manager && <Row label="Home Manager" value={m.home_manager} />}
      {m.away_manager && <Row label="Away Manager" value={m.away_manager} />}
      <Row label="Sofascore" value={m.sofascore_id ? '✓ Matched' : '✗ Not matched'} color={m.sofascore_id ? 'text-emerald-400' : 'text-gray-600'} />
      {m.enriched_at && <Row label="Last enriched" value={new Date(m.enriched_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} color="text-gray-500" />}
    </Sec>

    {(m.sofascore_id || m.web_context?.query || m.enriched_at) && (
      <Sec title="Enrichment Status">
        <Row label="SofaScore detail" value={m.sofascore_id ? 'Pulled from saved match' : 'Not matched'} color={m.sofascore_id ? 'text-emerald-400' : 'text-gray-600'} />
        <Row label="DuckDuckGo" value={m.web_context?.query ? (m.web_context?.snippets?.length ? `${m.web_context.snippets.length} snippets` : 'Searched, no snippets') : 'Not searched'} color={m.web_context?.query ? 'text-emerald-400' : 'text-gray-600'} />
        {m.web_context?.query && <Row label="Search query" value={m.web_context.query} color="text-gray-400 text-xs" />}
        {m.enriched_at && <Row label="Updated" value={new Date(m.enriched_at).toLocaleString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} color="text-gray-500" />}
      </Sec>
    )}

    {/* Incidents */}
    {m.incidents && m.incidents.length > 0 && (
      <Sec title="Match Events">
        <div className="space-y-1.5">
          {m.incidents.map((inc: any, i: number) => {
            const type = (inc?.incidentType || inc?.type || '').toLowerCase();
            const icon = type.includes('goal') ? '⚽' : type.includes('red') ? '🟥' : type.includes('card') ? '🟨' : type.includes('sub') ? '🔄' : '•';
            const time = inc?.time ?? inc?.minute;
            const player = inc?.player?.name ?? inc?.playerName ?? inc?.description ?? '';
            const side = inc?.isHome ? m.home_team : m.away_team;
            return (
              <div key={i} className="flex items-center gap-2 text-xs py-1 border-b border-white/[0.04] last:border-0">
                <span className="text-gray-600 w-8 shrink-0 tabular-nums">{time ? `${time}'` : '—'}</span>
                <span>{icon}</span>
                <span className="text-gray-300 flex-1 truncate">{player}</span>
                <span className="text-gray-600 shrink-0 truncate max-w-[80px]">{side}</span>
              </div>
            );
          })}
        </div>
      </Sec>
    )}

    {/* Web context */}
    {m.web_context?.snippets?.length > 0 && (
      <Sec title="Context">
        <div className="space-y-2">
          {m.web_context.snippets.slice(0, 4).map((s: any, i: number) => (
            <p key={i} className="text-xs text-gray-500 leading-relaxed border-l-2 border-white/10 pl-2">
              {typeof s === 'string' ? s : s?.text ?? s?.snippet ?? JSON.stringify(s)}
            </p>
          ))}
        </div>
      </Sec>
    )}
  </div>
);

// ─── Tab: Odds ────────────────────────────────────────────────────────────────

const TabOdds = ({ m }: { m: any }) => {
  const odds = m?.odds_1x2 || {};
  const movement = m?.odds_movement;
  const markets: any[] = m?.all_markets || [];
  const hasAny = odds.home || markets.length > 0;
  if (!hasAny) return <Empty msg="No odds available" />;

  return (
    <div className="px-4 py-4 space-y-3">
      {/* 1X2 */}
      {(odds.home || odds.draw || odds.away) && (
        <Sec title="1X2">
          <div className="flex gap-2">
            {[{ l: '1', v: odds.home }, { l: 'X', v: odds.draw }, { l: '2', v: odds.away }].map(({ l, v }) => (
              <div key={l} className="flex-1 flex flex-col items-center py-2.5 rounded-xl border border-white/[0.07] bg-white/[0.03]">
                <span className="text-[10px] text-gray-500">{l}</span>
                <span className="text-sm font-bold text-white mt-0.5">{val(v)}</span>
              </div>
            ))}
          </div>
        </Sec>
      )}

      {/* Odds movement */}
      {movement?.snapshots > 0 && (
        <Sec title="Odds Movement">
          <Row label="Snapshots" value={movement.snapshots} />
          {movement.opening && <>
            <div className="text-[10px] text-gray-600 uppercase tracking-wide pt-1">Opening</div>
            <Row label="Home" value={movement.opening.home} />
            <Row label="Draw" value={movement.opening.draw} />
            <Row label="Away" value={movement.opening.away} />
          </>}
          {movement.current && <>
            <div className="text-[10px] text-gray-600 uppercase tracking-wide pt-1">Current</div>
            <Row label="Home" value={movement.current.home} />
            <Row label="Draw" value={movement.current.draw} />
            <Row label="Away" value={movement.current.away} />
          </>}
          {movement.movement && (
            <div className="flex justify-between items-center text-sm pt-2 border-t border-white/[0.06]">
              <span className="text-gray-500">Drift</span>
              <div className="flex gap-3 text-xs">
                {['home', 'draw', 'away'].map(k => {
                  const d = movement.movement[k];
                  return <span key={k} className={d === 'shortened' ? 'text-emerald-400 font-bold' : d === 'drifted' ? 'text-red-400 font-bold' : 'text-gray-600'}>{d ?? '—'}</span>;
                })}
              </div>
            </div>
          )}
          {movement.sharp_signal && <Row label="Sharp Signal" value={movement.sharp_signal} color="text-yellow-400 font-bold" />}
        </Sec>
      )}

      {movement?.markets?.length > 0 && (
        <Sec title={`All Market Movement (${movement.market_snapshots || 0})`}>
          <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
            {movement.markets.slice(0, 80).map((mk: any, i: number) => (
              <div key={i} className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2">
                <div className="min-w-0">
                  <div className="text-xs text-gray-300 truncate">{mk.market}{mk.specifier ? ` · ${mk.specifier}` : ''}</div>
                  <div className="text-[10px] text-gray-600 truncate">{mk.selection} · {mk.snapshots} snapshots</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-semibold text-white tabular-nums">{mk.opening?.odds} → {mk.current?.odds}</div>
                  <div className={mk.movement === 'shortened' ? 'text-[10px] text-emerald-400' : mk.movement === 'drifted' ? 'text-[10px] text-red-400' : 'text-[10px] text-gray-500'}>
                    {mk.movement || 'stable'} {mk.delta != null ? `(${mk.delta > 0 ? '+' : ''}${mk.delta})` : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Sec>
      )}

      {/* All markets */}
      {markets.filter((mk: any) => mk?.selections?.length > 0 && mk?.status !== 3).length > 0 && (
        <Sec title={`All Markets`}>
          <div className="space-y-4">
            {markets
              .filter((mk: any) => mk?.selections?.length > 0 && mk?.status !== 3)
              .slice(0, 25)
              .map((mk: any, i: number) => (
                <div key={i}>
                  <div className="text-[10px] text-gray-600 uppercase tracking-wide mb-1.5">
                    {mk.name}{mk.specifier ? ` · ${mk.specifier}` : ''}
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {(mk.selections || []).map((sel: any, j: number) => (
                      <div key={j} className="flex flex-col items-center px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] min-w-[52px]">
                        <span className="text-[10px] text-gray-500">{sel.name}</span>
                        <span className="text-xs font-semibold text-white mt-0.5">{sel.odds}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </Sec>
      )}
    </div>
  );
};

// ─── Tab: H2H ─────────────────────────────────────────────────────────────────

const TabH2H = ({ m }: { m: any }) => {
  const h2h = m?.h2h;
  const standings: any[] = m?.standings || [];
  if (!h2h && standings.length === 0) return <Empty msg="No H2H data available" />;

  return (
    <div className="px-4 py-4 space-y-3">
      {h2h && (
        <Sec title="Head to Head">
          {(() => {
            const meetings = h2h?.teamDuel?.meetings ?? h2h?.meetings;
            const homeW    = h2h?.teamDuel?.homeWins  ?? h2h?.homeWins;
            const draws    = h2h?.teamDuel?.draws      ?? h2h?.draws;
            const awayW    = h2h?.teamDuel?.awayWins   ?? h2h?.awayWins;
            return (
              <>
                {meetings != null && <Row label="Total meetings" value={meetings} />}
                <div className="flex gap-2 mt-2">
                  {[
                    { label: m.home_team, value: homeW, color: 'text-emerald-400' },
                    { label: 'Draw', value: draws, color: 'text-gray-400' },
                    { label: m.away_team, value: awayW, color: 'text-blue-400' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex-1 flex flex-col items-center py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                      <span className={`text-lg font-bold ${color}`}>{val(value, '0')}</span>
                      <span className="text-[10px] text-gray-600 mt-0.5 text-center truncate px-1">{label}</span>
                    </div>
                  ))}
                </div>
              </>
            );
          })()}
        </Sec>
      )}

      {standings.length > 0 && (
        <Sec title="Standings">
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-xs min-w-[280px]">
              <thead>
                <tr className="text-gray-600 border-b border-white/[0.06]">
                  <th className="text-left pb-2 font-medium w-6">#</th>
                  <th className="text-left pb-2 font-medium">Team</th>
                  <th className="text-center pb-2 font-medium w-7">P</th>
                  <th className="text-center pb-2 font-medium w-7">W</th>
                  <th className="text-center pb-2 font-medium w-7">D</th>
                  <th className="text-center pb-2 font-medium w-7">L</th>
                  <th className="text-center pb-2 font-medium w-8">Pts</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((row: any, i: number) => {
                  const name = row?.team?.name ?? row?.name ?? '—';
                  const ht = (m.home_team || '').toLowerCase().slice(0, 6);
                  const at = (m.away_team || '').toLowerCase().slice(0, 6);
                  const highlight = name.toLowerCase().includes(ht) || name.toLowerCase().includes(at);
                  return (
                    <tr key={i} className={`border-b border-white/[0.04] ${highlight ? 'bg-emerald-500/5' : ''}`}>
                      <td className="py-1.5 text-gray-600">{row?.position ?? i + 1}</td>
                      <td className={`py-1.5 truncate max-w-[110px] ${highlight ? 'text-emerald-400 font-semibold' : 'text-gray-300'}`}>{name}</td>
                      <td className="py-1.5 text-center text-gray-400">{row?.matches ?? '—'}</td>
                      <td className="py-1.5 text-center text-emerald-400">{row?.wins ?? '—'}</td>
                      <td className="py-1.5 text-center text-gray-400">{row?.draws ?? '—'}</td>
                      <td className="py-1.5 text-center text-red-400">{row?.losses ?? '—'}</td>
                      <td className="py-1.5 text-center text-white font-bold">{row?.points ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Sec>
      )}
    </div>
  );
};

// ─── Tab: Stats ───────────────────────────────────────────────────────────────

const TabStats = ({ m }: { m: any }) => {
  const detail = m?.sofascore_detail || {};
  const statRows = flattenStats(m?.statistics || detail?.statistics || detail?.stats || []);
  const standings: any[] = m?.standings || detail?.standings || [];
  const hasRatings = m.home_avg_rating || m.away_avg_rating;

  return (
    <div className="px-4 py-4 space-y-3">
      {statRows.length > 0 ? (
        <Sec title="Match Statistics">
          <div className="space-y-3">
            {statRows.map((s: any, i: number) => {
              const label = s?.name ?? s?.label ?? s?.type ?? `Stat ${i}`;
              const homeRaw = s?.home ?? s?.homeValue ?? s?.homeTotal ?? 0;
              const awayRaw = s?.away ?? s?.awayValue ?? s?.awayTotal ?? 0;
              const a = statNumber(homeRaw);
              const b = statNumber(awayRaw);
              return (
                <div key={`${label}-${i}`}>
                  <div className="flex justify-between text-xs mb-1 gap-3">
                    <span className="text-emerald-400 font-semibold tabular-nums">{val(homeRaw, '0')}</span>
                    <span className="text-gray-500 text-center truncate">{label}</span>
                    <span className="text-blue-400 font-semibold tabular-nums">{val(awayRaw, '0')}</span>
                  </div>
                  <StatBar a={a} b={b} />
                </div>
              );
            })}
          </div>
        </Sec>
      ) : hasRatings ? (
        <Sec title="Ratings">
          <Row label="Home avg rating" value={m.home_avg_rating} color="text-emerald-400" />
          <Row label="Away avg rating" value={m.away_avg_rating} color="text-blue-400" />
        </Sec>
      ) : (
        <Empty msg="No match statistics available yet" />
      )}
      <StandingsFull m={m} standings={standings} />
    </div>
  );
};

// ─── Tab: Lineups ─────────────────────────────────────────────────────────────

const PlayerDot = ({ player, side }: { player: any; side: 'home' | 'away' }) => {
  const name = player?.name ?? player?.player?.name ?? '?';
  const num  = player?.jerseyNumber ?? player?.shirtNumber ?? '';
  const rating = player?.statistics?.rating ?? player?.rating;
  return (
    <div className="flex flex-col items-center gap-0.5 w-14">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${side === 'home' ? 'bg-emerald-900/60 border-emerald-500 text-emerald-300' : 'bg-blue-900/60 border-blue-500 text-blue-300'}`}>
        {num || name.slice(0, 2).toUpperCase()}
      </div>
      {rating && <span className="text-[9px] text-yellow-400 font-semibold">{Number(rating).toFixed(1)}</span>}
      <span className="text-[9px] text-gray-400 text-center leading-tight truncate w-full text-center">{name.split(' ').pop()}</span>
    </div>
  );
};

const lineupPlayers = (lineups: any, side: 'home' | 'away') => {
  const key = side === 'home' ? 'home' : 'away';
  const data = lineups?.[key] || lineups?.[`${key}Team`] || {};
  const players = data?.players || data?.lineup || [];
  return Array.isArray(players) ? players.map((entry: any) => entry?.player || entry) : [];
};

const TabLineups = ({ m }: { m: any }) => {
  const homePlayers: any[] = lineupPlayers(m?.lineups, 'home').length ? lineupPlayers(m?.lineups, 'home') : (m?.home_players || []);
  const awayPlayers: any[] = lineupPlayers(m?.lineups, 'away').length ? lineupPlayers(m?.lineups, 'away') : (m?.away_players || []);
  if (homePlayers.length === 0 && awayPlayers.length === 0) return <Empty msg="Lineups not available yet" />;

  return (
    <div className="px-4 py-4 space-y-3">
      {homePlayers.length > 0 && (
        <Sec title={`${m.home_team} — Featured`}>
          <div className="flex flex-wrap gap-3 justify-center">
            {homePlayers.map((p: any, i: number) => <PlayerDot key={i} player={p} side="home" />)}
          </div>
        </Sec>
      )}
      {awayPlayers.length > 0 && (
        <Sec title={`${m.away_team} — Featured`}>
          <div className="flex flex-wrap gap-3 justify-center">
            {awayPlayers.map((p: any, i: number) => <PlayerDot key={i} player={p} side="away" />)}
          </div>
        </Sec>
      )}
    </div>
  );
};

// ─── Tab: Predictions ────────────────────────────────────────────────────────

const TabPredictions = ({ m, onPredict, predicting, actionMsg }: any) => {
  const prediction = m?.prediction;
  const picks: any[] = prediction?.picks || [];

  return (
    <div className="px-4 py-4 space-y-3">
      <button onClick={onPredict} disabled={predicting}
        className="w-full py-2.5 rounded-xl text-xs font-semibold border border-white/10 text-gray-300 hover:border-purple-500/40 hover:text-purple-400 transition disabled:opacity-40">
        {predicting ? 'Running prediction…' : '🔮 Run Prediction'}
      </button>
      {actionMsg && <div className="text-center text-xs text-emerald-400">{actionMsg}</div>}

      {!prediction ? (
        <Empty msg="No prediction yet — tap Run Prediction" />
      ) : (
        <>
          {picks.length > 0 && (
            <Sec title="Picks">
              <div className="space-y-2">
                {picks.map((p: any, i: number) => (
                  <div key={i} className="flex items-start justify-between bg-white/[0.03] rounded-xl px-3 py-2.5 gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white">{val(p.market || p.type)} - <span className="text-emerald-400">{val(p.pick || p.selection)}</span></div>
                      {(p.reasoning || p.reason) && <div className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{p.reasoning || p.reason}</div>}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-emerald-400">{val(p.confidence)}%</div>
                      {p.odds && <div className="text-[10px] text-gray-600">@ {p.odds}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </Sec>
          )}
          {prediction.summary && (
            <Sec title="Summary">
              <p className="text-xs text-gray-400 leading-relaxed">{prediction.summary}</p>
            </Sec>
          )}
          {prediction.signals && prediction.signals.length > 0 && (
            <Sec title="Signals">
              <div className="space-y-1.5">
                {prediction.signals.map((s: any, i: number) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-gray-500">{s.name}</span>
                    <span className={`font-medium ${s.impact > 0 ? 'text-emerald-400' : s.impact < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                      {s.impact > 0 ? `+${s.impact}` : s.impact}
                    </span>
                  </div>
                ))}
              </div>
            </Sec>
          )}
        </>
      )}
    </div>
  );
};

const statNumber = (value: any): number => {
  if (typeof value === 'number') return value;
  const cleaned = String(value ?? '').replace('%', '').trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
};

const flattenStats = (stats: any[]) => {
  const rows: any[] = [];
  for (const block of stats || []) {
    const groups = block?.groups || block?.statisticsGroups || [];
    if (groups.length) {
      for (const group of groups) {
        for (const item of group?.statisticsItems || group?.items || []) {
          rows.push({ ...item, group: group?.groupName || group?.name || block?.period });
        }
      }
    } else if (block?.statisticsItems || block?.items) {
      for (const item of block.statisticsItems || block.items || []) rows.push({ ...item, group: block?.period });
    } else {
      rows.push(block);
    }
  }
  return rows;
};

const resultForTeam = (event: any, teamName: string) => {
  const home = event?.home_team?.name || event?.homeTeam?.name || '';
  const score = event?.score || {};
  const hs = Number(score.home ?? event?.homeScore?.current);
  const as = Number(score.away ?? event?.awayScore?.current);
  if (!Number.isFinite(hs) || !Number.isFinite(as)) return '';
  const isHome = home.toLowerCase() === teamName.toLowerCase();
  const own = isHome ? hs : as;
  const opp = isHome ? as : hs;
  if (own > opp) return 'W';
  if (own < opp) return 'L';
  return 'D';
};

const MatchList = ({ title, team, matches }: { title: string; team: string; matches: any[] }) => (
  <Sec title={title}>
    {matches.length === 0 ? <Empty msg="No recent matches available" /> : (
      <div className="space-y-2">
        {matches.map((event: any, i: number) => {
          const home = event?.home_team?.name || event?.homeTeam?.name || '';
          const away = event?.away_team?.name || event?.awayTeam?.name || '';
          const score = event?.score || {};
          const scoreline = score.home != null && score.away != null ? `${score.home}-${score.away}` : 'vs';
          const r = resultForTeam(event, team);
          return (
            <div key={event?.id || i} className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2">
              <span className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold ${r === 'W' ? 'bg-emerald-500/25 text-emerald-400' : r === 'L' ? 'bg-red-500/25 text-red-400' : 'bg-gray-600/30 text-gray-400'}`}>{r || '-'}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-300 truncate">{home} vs {away}</div>
                <div className="text-[10px] text-gray-600 truncate">{event?.tournament?.name || event?.tournament || ''}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs font-bold text-white">{scoreline}</div>
                <div className="text-[10px] text-gray-600">{fmtDateTime(event?.start_timestamp || event?.startTimestamp || event?.start_time)}</div>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </Sec>
);

const StandingsFull = ({ m, standings }: { m: any; standings: any[] }) => {
  if (!standings?.length) return null;
  return (
    <Sec title="Full Table">
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-xs min-w-[420px]">
          <thead>
            <tr className="text-gray-600 border-b border-white/[0.06]">
              <th className="text-left pb-2 font-medium w-6">#</th>
              <th className="text-left pb-2 font-medium">Team</th>
              <th className="text-center pb-2 font-medium">P</th>
              <th className="text-center pb-2 font-medium">W</th>
              <th className="text-center pb-2 font-medium">D</th>
              <th className="text-center pb-2 font-medium">L</th>
              <th className="text-center pb-2 font-medium">GF</th>
              <th className="text-center pb-2 font-medium">GA</th>
              <th className="text-center pb-2 font-medium">GD</th>
              <th className="text-center pb-2 font-medium">Pts</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row: any, i: number) => {
              const name = row?.team?.name ?? row?.name ?? '-';
              const ht = (m.home_team || '').toLowerCase().slice(0, 6);
              const at = (m.away_team || '').toLowerCase().slice(0, 6);
              const highlight = name.toLowerCase().includes(ht) || name.toLowerCase().includes(at);
              return (
                <tr key={row?.team?.id || i} className={`border-b border-white/[0.04] ${highlight ? 'bg-emerald-500/5' : ''}`}>
                  <td className="py-1.5 text-gray-600">{row?.position ?? i + 1}</td>
                  <td className={`py-1.5 min-w-[130px] ${highlight ? 'text-emerald-400 font-semibold' : 'text-gray-300'}`}>{name}</td>
                  <td className="py-1.5 text-center text-gray-400">{row?.played ?? row?.matches ?? '-'}</td>
                  <td className="py-1.5 text-center text-emerald-400">{row?.wins ?? '-'}</td>
                  <td className="py-1.5 text-center text-gray-400">{row?.draws ?? '-'}</td>
                  <td className="py-1.5 text-center text-red-400">{row?.losses ?? '-'}</td>
                  <td className="py-1.5 text-center text-gray-400">{row?.goals_for ?? '-'}</td>
                  <td className="py-1.5 text-center text-gray-400">{row?.goals_against ?? '-'}</td>
                  <td className="py-1.5 text-center text-gray-400">{row?.goal_diff ?? '-'}</td>
                  <td className="py-1.5 text-center text-white font-bold">{row?.points ?? '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Sec>
  );
};

const MatchingPanel = ({
  m,
  candidates,
  loading,
  matching,
  onLoad,
  onSelect,
}: {
  m: any;
  candidates: any[];
  loading: boolean;
  matching: string | null;
  onLoad: () => void;
  onSelect: (candidate: any) => void;
}) => (
  <Sec title={m.sofascore_id ? 'SofaScore Match' : 'Match Required'}>
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className={m.sofascore_id ? 'text-sm font-semibold text-emerald-400' : 'text-sm font-semibold text-yellow-400'}>
            {m.sofascore_id ? `Matched: ${m.sofascore_name || m.sofascore_id}` : 'Not matched to SofaScore'}
          </div>
          <div className="text-[11px] text-gray-600 mt-0.5">
            {isLive(m) ? 'Live SportyBet match: showing all live SofaScore matches.' : 'Prematch SportyBet match: showing all scheduled SofaScore matches for this date.'}
          </div>
        </div>
        <button
          onClick={onLoad}
          disabled={loading}
          className="shrink-0 px-3 py-2 rounded-lg text-xs font-semibold border border-white/10 text-gray-300 hover:border-emerald-500/40 hover:text-emerald-400 disabled:opacity-40"
        >
          {loading ? 'Scanning...' : m.sofascore_id ? 'Correct' : 'Find'}
        </button>
      </div>

      {candidates.length > 0 && (
        <div className="space-y-2">
          <div className="text-[11px] text-gray-600">{candidates.length} SofaScore matches loaded. Select the correct one.</div>
          {candidates.map((c: any) => (
            <button
              key={c.id}
              onClick={() => onSelect(c)}
              disabled={!!matching}
              className="w-full text-left rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-2.5 hover:border-emerald-500/40 disabled:opacity-50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{c.name}</div>
                  <div className="text-[11px] text-gray-600 truncate">{c.tournament || 'SofaScore'} · {c.status || 'scheduled'}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-bold text-emerald-400">{c.scoreline || `${Math.round((c.score || 0) * 100)}%`}</div>
                  <div className="text-[10px] text-gray-600">{matching === String(c.id) ? 'Saving...' : fmtTime(c.start_timestamp)}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  </Sec>
);

// ─── Tab: Comparison ─────────────────────────────────────────────────────────

const getGoals = (event: any, side: 'home' | 'away') => {
  const score = event?.score || {};
  const h = Number(score.home ?? event?.homeScore?.current);
  const a = Number(score.away ?? event?.awayScore?.current);
  if (!Number.isFinite(h) || !Number.isFinite(a)) return null;
  return side === 'home' ? h : a;
};

const teamGoalsInMatch = (event: any, teamName: string) => {
  const homeName = event?.home_team?.name || event?.homeTeam?.name || '';
  const isHome = homeName.toLowerCase() === teamName.toLowerCase();
  const score = event?.score || {};
  const h = Number(score.home ?? event?.homeScore?.current);
  const a = Number(score.away ?? event?.awayScore?.current);
  if (!Number.isFinite(h) || !Number.isFinite(a)) return null;
  return { scored: isHome ? h : a, conceded: isHome ? a : h, total: h + a };
};

const buildTeamStats = (matches: any[], teamName: string) => {
  let w = 0, d = 0, l = 0;
  let homeW = 0, homeD = 0, homeL = 0, homeGames = 0;
  let awayW = 0, awayD = 0, awayL = 0, awayGames = 0;
  let totalScored = 0, totalConceded = 0, validGames = 0;
  let highestScoring: any = null, lowestScoring: any = null;
  let highestTotal = -1, lowestTotal = Infinity;
  let cleanSheets = 0, failedToScore = 0;
  const scoringGames: number[] = [];

  for (const event of matches) {
    const homeName = event?.home_team?.name || event?.homeTeam?.name || '';
    const isHome = homeName.toLowerCase() === teamName.toLowerCase();
    const g = teamGoalsInMatch(event, teamName);
    if (!g) continue;

    validGames++;
    totalScored += g.scored;
    totalConceded += g.conceded;
    scoringGames.push(g.scored);
    if (g.conceded === 0) cleanSheets++;
    if (g.scored === 0) failedToScore++;

    const r = resultForTeam(event, teamName);
    if (r === 'W') w++; else if (r === 'D') d++; else if (r === 'L') l++;

    if (isHome) {
      homeGames++;
      if (r === 'W') homeW++; else if (r === 'D') homeD++; else if (r === 'L') homeL++;
    } else {
      awayGames++;
      if (r === 'W') awayW++; else if (r === 'D') awayD++; else if (r === 'L') awayL++;
    }

    if (g.total > highestTotal) { highestTotal = g.total; highestScoring = event; }
    if (g.total < lowestTotal) { lowestTotal = g.total; lowestScoring = event; }
  }

  const avgScored = validGames ? (totalScored / validGames).toFixed(2) : '—';
  const avgConceded = validGames ? (totalConceded / validGames).toFixed(2) : '—';
  const winRate = validGames ? Math.round((w / validGames) * 100) : 0;

  return {
    played: validGames, w, d, l, winRate,
    homeGames, homeW, homeD, homeL,
    awayGames, awayW, awayD, awayL,
    totalScored, totalConceded, avgScored, avgConceded,
    cleanSheets, failedToScore,
    highestScoring, lowestScoring,
    highestTotal: highestTotal === -1 ? null : highestTotal,
    lowestTotal: lowestTotal === Infinity ? null : lowestTotal,
  };
};

const scoreline = (event: any) => {
  const score = event?.score || {};
  const h = score.home ?? event?.homeScore?.current;
  const a = score.away ?? event?.awayScore?.current;
  if (h == null || a == null) return '?-?';
  return `${h}-${a}`;
};

const matchLabel = (event: any) => {
  const home = event?.home_team?.name || event?.homeTeam?.name || '?';
  const away = event?.away_team?.name || event?.awayTeam?.name || '?';
  return `${home} vs ${away}`;
};

const CompareBar = ({ label, homeVal, awayVal, homeColor = 'bg-emerald-500', awayColor = 'bg-blue-500' }: {
  label: string; homeVal: number; awayVal: number; homeColor?: string; awayColor?: string;
}) => {
  const total = (homeVal + awayVal) || 1;
  const homePct = Math.round((homeVal / total) * 100);
  const awayPct = 100 - homePct;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-emerald-400 font-bold tabular-nums">{homeVal}</span>
        <span className="text-gray-500">{label}</span>
        <span className="text-blue-400 font-bold tabular-nums">{awayVal}</span>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden bg-white/10">
        <div className={`${homeColor} transition-all`} style={{ width: `${homePct}%` }} />
        <div className={`${awayColor} transition-all`} style={{ width: `${awayPct}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-gray-600">
        <span>{homePct}%</span>
        <span>{awayPct}%</span>
      </div>
    </div>
  );
};

const RecordGrid = ({ label, w, d, l, games }: { label: string; w: number; d: number; l: number; games: number }) => (
  <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3">
    <div className="text-[10px] text-gray-600 uppercase tracking-wide mb-2">{label} ({games}G)</div>
    <div className="flex gap-2">
      <div className="flex-1 text-center">
        <div className="text-base font-bold text-emerald-400">{w}</div>
        <div className="text-[10px] text-gray-600">W</div>
      </div>
      <div className="flex-1 text-center">
        <div className="text-base font-bold text-gray-400">{d}</div>
        <div className="text-[10px] text-gray-600">D</div>
      </div>
      <div className="flex-1 text-center">
        <div className="text-base font-bold text-red-400">{l}</div>
        <div className="text-[10px] text-gray-600">L</div>
      </div>
    </div>
  </div>
);

const TabComparison = ({ m }: { m: any }) => {
  const homeMatches: any[] = m?.home_last_matches || [];
  const awayMatches: any[] = m?.away_last_matches || [];

  if (homeMatches.length === 0 && awayMatches.length === 0)
    return <Empty msg="No recent match data available" />;

  const home = buildTeamStats(homeMatches, m.home_team);
  const away = buildTeamStats(awayMatches, m.away_team);

  return (
    <div className="px-4 py-4 space-y-3">

      {/* Team header */}
      <div className="flex items-center justify-between px-1 mb-1">
        <span className="text-sm font-bold text-emerald-400 flex-1">{m.home_team}</span>
        <span className="text-[10px] text-gray-600 uppercase tracking-widest">vs</span>
        <span className="text-sm font-bold text-blue-400 flex-1 text-right">{m.away_team}</span>
      </div>

      {/* Overall record */}
      <Sec title="Overall Record (Last Matches)">
        <div className="grid grid-cols-2 gap-2 mb-3">
          <RecordGrid label="Overall" w={home.w} d={home.d} l={home.l} games={home.played} />
          <RecordGrid label="Overall" w={away.w} d={away.d} l={away.l} games={away.played} />
        </div>
        <CompareBar label="Wins" homeVal={home.w} awayVal={away.w} />
        <div className="mt-3" />
        <CompareBar label="Win Rate %" homeVal={home.winRate} awayVal={away.winRate} />
      </Sec>

      {/* Home / Away split */}
      <Sec title="Home & Away Record">
        <div className="grid grid-cols-2 gap-2 mb-2">
          <RecordGrid label={`${m.home_team} at Home`} w={home.homeW} d={home.homeD} l={home.homeL} games={home.homeGames} />
          <RecordGrid label={`${m.away_team} Away`} w={away.awayW} d={away.awayD} l={away.awayL} games={away.awayGames} />
        </div>
        <div className="text-[10px] text-gray-600 text-center mt-1">Home team's home record vs Away team's away record</div>
      </Sec>

      {/* Scoring */}
      <Sec title="Scoring">
        <CompareBar label="Goals Scored" homeVal={home.totalScored} awayVal={away.totalScored} />
        <div className="mt-3" />
        <CompareBar label="Goals Conceded" homeVal={home.totalConceded} awayVal={away.totalConceded} homeColor="bg-red-500" awayColor="bg-orange-500" />
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs"><span className="text-gray-500">Avg scored</span><span className="text-emerald-400 font-bold">{home.avgScored}</span></div>
            <div className="flex justify-between text-xs"><span className="text-gray-500">Avg conceded</span><span className="text-red-400 font-bold">{home.avgConceded}</span></div>
            <div className="flex justify-between text-xs"><span className="text-gray-500">Clean sheets</span><span className="text-white font-bold">{home.cleanSheets}</span></div>
            <div className="flex justify-between text-xs"><span className="text-gray-500">Failed to score</span><span className="text-white font-bold">{home.failedToScore}</span></div>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs"><span className="text-gray-500">Avg scored</span><span className="text-blue-400 font-bold">{away.avgScored}</span></div>
            <div className="flex justify-between text-xs"><span className="text-gray-500">Avg conceded</span><span className="text-orange-400 font-bold">{away.avgConceded}</span></div>
            <div className="flex justify-between text-xs"><span className="text-gray-500">Clean sheets</span><span className="text-white font-bold">{away.cleanSheets}</span></div>
            <div className="flex justify-between text-xs"><span className="text-gray-500">Failed to score</span><span className="text-white font-bold">{away.failedToScore}</span></div>
          </div>
        </div>
      </Sec>

      {/* Highest & lowest scoring games */}
      <Sec title="Notable Games">
        <div className="space-y-2">
          {home.highestScoring && (
            <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2">
              <div className="text-[10px] text-emerald-400 uppercase tracking-wide mb-1">{m.home_team} — Highest Scoring</div>
              <div className="text-xs text-white font-semibold">{matchLabel(home.highestScoring)}</div>
              <div className="flex justify-between text-[10px] text-gray-500 mt-0.5">
                <span>{scoreline(home.highestScoring)} ({home.highestTotal} goals)</span>
                <span>{fmtDateTime(home.highestScoring?.start_timestamp || home.highestScoring?.start_time)}</span>
              </div>
            </div>
          )}
          {home.lowestScoring && home.lowestScoring !== home.highestScoring && (
            <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2">
              <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">{m.home_team} — Lowest Scoring</div>
              <div className="text-xs text-white font-semibold">{matchLabel(home.lowestScoring)}</div>
              <div className="flex justify-between text-[10px] text-gray-500 mt-0.5">
                <span>{scoreline(home.lowestScoring)} ({home.lowestTotal} goals)</span>
                <span>{fmtDateTime(home.lowestScoring?.start_timestamp || home.lowestScoring?.start_time)}</span>
              </div>
            </div>
          )}
          {away.highestScoring && (
            <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2">
              <div className="text-[10px] text-blue-400 uppercase tracking-wide mb-1">{m.away_team} — Highest Scoring</div>
              <div className="text-xs text-white font-semibold">{matchLabel(away.highestScoring)}</div>
              <div className="flex justify-between text-[10px] text-gray-500 mt-0.5">
                <span>{scoreline(away.highestScoring)} ({away.highestTotal} goals)</span>
                <span>{fmtDateTime(away.highestScoring?.start_timestamp || away.highestScoring?.start_time)}</span>
              </div>
            </div>
          )}
          {away.lowestScoring && away.lowestScoring !== away.highestScoring && (
            <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2">
              <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">{m.away_team} — Lowest Scoring</div>
              <div className="text-xs text-white font-semibold">{matchLabel(away.lowestScoring)}</div>
              <div className="flex justify-between text-[10px] text-gray-500 mt-0.5">
                <span>{scoreline(away.lowestScoring)} ({away.lowestTotal} goals)</span>
                <span>{fmtDateTime(away.lowestScoring?.start_timestamp || away.lowestScoring?.start_time)}</span>
              </div>
            </div>
          )}
        </div>
      </Sec>

      {/* Full recent match lists */}
      <Sec title={`${m.home_team} — Last ${homeMatches.length} Matches`}>
        {homeMatches.length === 0 ? <Empty msg="No data" /> : (
          <div className="space-y-1.5">
            {homeMatches.map((event: any, i: number) => {
              const r = resultForTeam(event, m.home_team);
              const g = teamGoalsInMatch(event, m.home_team);
              const opp = (event?.home_team?.name || event?.homeTeam?.name || '').toLowerCase() === m.home_team.toLowerCase()
                ? (event?.away_team?.name || event?.awayTeam?.name || '?')
                : (event?.home_team?.name || event?.homeTeam?.name || '?');
              return (
                <div key={event?.id || i} className="flex items-center gap-2 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2">
                  <span className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold shrink-0 ${
                    r === 'W' ? 'bg-emerald-500/25 text-emerald-400' : r === 'L' ? 'bg-red-500/25 text-red-400' : 'bg-gray-600/30 text-gray-400'
                  }`}>{r || '-'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-300 truncate">vs {opp}</div>
                    <div className="text-[10px] text-gray-600 truncate">{event?.tournament?.name || event?.tournament || ''}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-white">{scoreline(event)}</div>
                    {g && <div className="text-[10px] text-gray-600">{g.scored}G {g.conceded}GA</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Sec>

      <Sec title={`${m.away_team} — Last ${awayMatches.length} Matches`}>
        {awayMatches.length === 0 ? <Empty msg="No data" /> : (
          <div className="space-y-1.5">
            {awayMatches.map((event: any, i: number) => {
              const r = resultForTeam(event, m.away_team);
              const g = teamGoalsInMatch(event, m.away_team);
              const opp = (event?.home_team?.name || event?.homeTeam?.name || '').toLowerCase() === m.away_team.toLowerCase()
                ? (event?.away_team?.name || event?.awayTeam?.name || '?')
                : (event?.home_team?.name || event?.homeTeam?.name || '?');
              return (
                <div key={event?.id || i} className="flex items-center gap-2 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2">
                  <span className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold shrink-0 ${
                    r === 'W' ? 'bg-emerald-500/25 text-emerald-400' : r === 'L' ? 'bg-red-500/25 text-red-400' : 'bg-gray-600/30 text-gray-400'
                  }`}>{r || '-'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-300 truncate">vs {opp}</div>
                    <div className="text-[10px] text-gray-600 truncate">{event?.tournament?.name || event?.tournament || ''}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-white">{scoreline(event)}</div>
                    {g && <div className="text-[10px] text-gray-600">{g.scored}G {g.conceded}GA</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Sec>
    </div>
  );
};

const TabDetails = ({ m }: { m: any }) => (
  <div className="px-4 py-4 space-y-3">
    <Sec title="Team Comparison">
      <Row label="Home" value={m.home_team} color="text-emerald-400 font-semibold" />
      <Row label="Away" value={m.away_team} color="text-blue-400 font-semibold" />
      <Row label="Home form" value={compactForm(m.home_form)} />
      <Row label="Away form" value={compactForm(m.away_form)} />
      <Row label="Home position" value={m.home_position} />
      <Row label="Away position" value={m.away_position} />
      <Row label="Home rating" value={m.home_avg_rating} />
      <Row label="Away rating" value={m.away_avg_rating} />
    </Sec>
    <Sec title="Match Details">
      <Row label="Tournament" value={m.tournament} />
      <Row label="Category" value={m.category} />
      <Row label="Kickoff" value={fmtDateTime(m.start_time)} />
      {m.time_context?.start_local && <Row label="Local kickoff" value={`${m.time_context.local_date} ${m.time_context.local_time} (${m.time_context.timezone})`} />}
      {m.time_context?.start_utc && <Row label="UTC kickoff" value={`${m.time_context.utc_date} ${m.time_context.utc_time}`} />}
      <Row label="Venue" value={m.venue} />
      <Row label="SportyBet ID" value={m.sportybet_id} />
      <Row label="SofaScore ID" value={m.sofascore_id} />
    </Sec>
    <MatchList title={`${m.home_team} Last Matches`} team={m.home_team} matches={m.home_last_matches || []} />
    <MatchList title={`${m.away_team} Last Matches`} team={m.away_team} matches={m.away_last_matches || []} />
  </div>
);

const Match = () => {
  const params = useParams<{ id: string }>();
  const pathId = typeof window !== 'undefined'
    ? window.location.pathname.split('/match/')[1]?.split('?')[0]
    : undefined;
  const id = decodeURIComponent(pathId || params.id || '');
  const router = useIonRouter();
  const { getMatchDetail, matchDetail, loading, error } = useFootballContext();
  const [activeTab, setActiveTab] = useState<Tab>('Home');
  const [enriching, setEnriching] = useState(false);
  const [predicting, setPredicting] = useState(false);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [matching, setMatching] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState('');
  const autoRunRef = useRef<string>('');

  useEffect(() => {
    if (id) {
      setCandidates([]);
      getMatchDetail(id);
      if (autoRunRef.current !== id) {
        autoRunRef.current = id;
        (async () => {
          setActionMsg('Refreshing enrichment and prediction...');
          try {
            await enrichMatch(id);
            await predictMatch(id);
            setActionMsg('Enrichment and prediction refreshed');
          } catch (err: any) {
            setActionMsg(err?.response?.data?.detail || err?.message || 'Auto refresh could not finish');
          } finally {
            await getMatchDetail(id);
          }
        })();
      }
    }
  }, [id]);

  const refresh = async () => {
    if (id) await getMatchDetail(id);
  };

  const handleEnrich = async () => {
    if (!id) return;
    setEnriching(true);
    setActionMsg('');
    try {
      const res = await enrichMatch(id);
      if (res?.matched_sofascore) {
        const web = res?.has_web_context ? 'DuckDuckGo snippets found' : 'DuckDuckGo searched, no snippets';
        setActionMsg(`Enriched from SofaScore. ${web}.`);
      } else {
        setActionMsg('No automatic SofaScore match found');
      }
      await refresh();
    } catch (err: any) {
      setActionMsg(err?.response?.data?.detail || err?.message || 'Enrichment failed');
    } finally {
      setEnriching(false);
    }
  };

  const handlePredict = async () => {
    if (!id) return;
    setPredicting(true);
    setActionMsg('');
    try {
      await predictMatch(id);
      setActionMsg('Prediction complete');
      await refresh();
    } catch (err: any) {
      setActionMsg(err?.response?.data?.detail || err?.message || 'Prediction failed');
    } finally {
      setPredicting(false);
    }
  };

  const loadCandidates = async () => {
    if (!id) return;
    setCandidateLoading(true);
    setActionMsg('');
    try {
      const res = await getSofascoreCandidates(id);
      setCandidates(res?.candidates || []);
      if (!res?.candidates?.length) setActionMsg('No SofaScore matches found for this match state');
    } catch (err: any) {
      setActionMsg(err?.response?.data?.detail || err?.message || 'Candidate scan failed');
    } finally {
      setCandidateLoading(false);
    }
  };

  const selectCandidate = async (candidate: any) => {
    if (!id) return;
    setMatching(String(candidate.id));
    setActionMsg('');
    try {
      await matchSofascoreCandidate(id, { sofascore_id: candidate.id, match_date: candidate.match_date, event: candidate.event || candidate });
      setActionMsg('SofaScore match saved. Click Enrich to pull SofaScore detail and DuckDuckGo context.');
      setCandidates([]);
      await refresh();
    } catch (err: any) {
      setActionMsg(err?.response?.data?.detail || err?.message || 'Matching failed');
    } finally {
      setMatching(null);
    }
  };

  const renderTab = (m: any) => {
    switch (activeTab) {
      case 'Home':
        return (
          <>
            <div className="px-4 pt-4">
              <MatchingPanel
                m={m}
                candidates={candidates}
                loading={candidateLoading}
                matching={matching}
                onLoad={loadCandidates}
                onSelect={selectCandidate}
              />
            </div>
            <TabOverview m={m} onEnrich={handleEnrich} onPredict={handlePredict} enriching={enriching} predicting={predicting} actionMsg={actionMsg} />
          </>
        );
      case 'Details':
        return <TabDetails m={m} />;
      case 'Lineups':
        return <TabLineups m={m} />;
      case 'Statistics':
        return <TabStats m={m} />;
      case 'Odds':
        return <TabOdds m={m} />;
      case 'Comparison':
        return <TabComparison m={m} />;
      case 'H2H':
        return <TabH2H m={m} />;
      case 'Prediction':
        return <TabPredictions m={m} onPredict={handlePredict} predicting={predicting} actionMsg={actionMsg} />;
      default:
        return <TabOverview m={m} onEnrich={handleEnrich} onPredict={handlePredict} enriching={enriching} predicting={predicting} actionMsg={actionMsg} />;
    }
  };

  const notFound = !loading && !matchDetail;

  return (
    <IonPage>
      <IonContent fullscreen className="ion-padding-0">
        <IonRefresher slot="fixed" onIonRefresh={async (event) => {
          await refresh();
          event.detail.complete();
        }}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="min-h-full bg-[#0f0f0f] text-white pb-8">
          <div className="sticky top-0 z-20 bg-[#0f0f0f]/95 border-b border-white/[0.06] px-4 py-3 backdrop-blur">
            <button onClick={() => router.goBack()} className="text-xs font-semibold text-gray-400 hover:text-white">
              Back
            </button>
          </div>

          {matchDetail && (
            <>
              <MatchHero m={matchDetail} activeTab={activeTab} setActiveTab={setActiveTab} />
              {renderTab(matchDetail)}
            </>
          )}

          {loading && !matchDetail && (
            <div className="flex items-center justify-center py-20 text-sm text-gray-500">Loading match...</div>
          )}

          {notFound && (
            <div className="px-4 py-12">
              <Sec title="Match Not Found">
                <p className="text-sm text-gray-500 leading-relaxed">
                  This match is not in the SQL buffer yet. Run the upcoming/live scan, then open it again.
                </p>
                {error && <p className="text-xs text-red-400">{error}</p>}
              </Sec>
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Match;
