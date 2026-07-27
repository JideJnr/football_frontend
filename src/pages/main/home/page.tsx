import { IonContent, IonRefresher, IonRefresherContent, useIonRouter } from "@ionic/react";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useFootballContext } from "../../../contexts/useFootballContext";
import { LIVE_WS_URL, startPredictionPolling, getAutoBetSuggestions, autoBetPlace } from "../../../services/apis/footballApi";

// ─── Helpers ────────────────────────────────────────────────────────────────

const todayISO = () => new Date().toISOString().slice(0, 10);

const buildDateStrip = (): string[] => {
  const days: string[] = [];
  for (let i = -2; i <= 5; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
};

const formatDateLabel = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  const today = todayISO();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowISO = tomorrow.toISOString().slice(0, 10);
  if (iso === today) return { top: "Today", bottom: d.toLocaleDateString([], { day: "numeric", month: "short" }) };
  if (iso === tomorrowISO) return { top: "Tomorrow", bottom: d.toLocaleDateString([], { day: "numeric", month: "short" }) };
  return {
    top: d.toLocaleDateString([], { weekday: "short" }),
    bottom: d.toLocaleDateString([], { day: "numeric", month: "short" }),
  };
};

const formatKickoff = (startTime: any): string => {
  if (!startTime) return "--:--";
  let date: Date;
  if (typeof startTime === "string") {
    // ISO string or date string
    date = new Date(startTime);
  } else if (typeof startTime === "number") {
    // Unix seconds (10 digits) vs milliseconds (13 digits)
    date = new Date(startTime < 1e10 ? startTime * 1000 : startTime);
  } else {
    return "--:--";
  }
  if (isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const isLive = (m: any) => {
  const p = m.period;
  return p && p !== "Not started" && p !== "Not start" && p !== "FT" && p !== "AET" && p !== "Finished" && p !== "Ended" && p !== "After Penalties" && p !== "After Extra Time";
};

const isFinished = (m: any) => {
  const p = (m.period || "").toLowerCase();
  if (p === "ft" || p === "aet" || p === "finished" || p === "ended" || p === "after penalties" || p === "after extra time" || p === "ap") return true;
  // Hide H2 matches at 90+ minutes — they are effectively over
  if (p === "h2" || p === "2h") {
    const val = m.played_seconds;
    let ps: number | null = null;
    if (typeof val === "number" && val > 0) ps = val;
    else if (typeof val === "string" && val.includes(":")) {
      const [mm, ss] = val.split(":").map(Number);
      if (!isNaN(mm) && !isNaN(ss)) ps = mm * 60 + ss;
    } else if (val != null) { const n = Number(val); if (!isNaN(n) && n > 0) ps = n; }
    if (ps !== null && Math.floor(ps / 60) >= 90) return true;
    // Fallback via start_time: 105+ mins since kickoff
    const t = m.start_time;
    const startMs = !t ? 0 : typeof t === "string" ? new Date(t).getTime() : t < 1e10 ? t * 1000 : t;
    if (startMs && Math.floor((Date.now() - startMs) / 60000) >= 105) return true;
  }
  return false;
};

const scoreStr = (score: { home: string | null; away: string | null } | null | undefined) => {
  if (!score) return null;
  return score.home !== null && score.away !== null ? `${score.home} - ${score.away}` : null;
};

// Derive a country from tournament name.
// SportyBet sends names like "England - Premier League", "Ukraine - Premier League",
// or bare names like "Champions League". Always prefer the explicit "Country - League"
// split — never guess country from league name alone.
const parseLeagueCountry = (tournament: string, category?: string): { country: string; league: string } => {
  if (category && category.trim()) {
    return { country: category.trim(), league: tournament || "Unknown" };
  }
  const sep = tournament.indexOf(" - ");
  if (sep !== -1) {
    return { country: tournament.slice(0, sep).trim(), league: tournament.slice(sep + 3).trim() };
  }
  // Only use known map for tournaments that never carry a country prefix
  const internationalLeagues: Record<string, string> = {
    "Champions League": "Europe",
    "UEFA Champions League": "Europe",
    "Europa League": "Europe",
    "UEFA Europa League": "Europe",
    "Conference League": "Europe",
    "UEFA Conference League": "Europe",
    "World Cup": "International",
    "FIFA World Cup": "International",
    "AFCON": "Africa",
    "Africa Cup of Nations": "Africa",
    "Copa America": "International",
    "Nations League": "International",
  };
  for (const [key, country] of Object.entries(internationalLeagues)) {
    if (tournament.includes(key)) return { country, league: tournament };
  }
  return { country: "Other", league: tournament };
};

// ─── Sub-components ──────────────────────────────────────────────────────────

const LiveDot = () => (
  <span className="relative flex h-2 w-2">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
  </span>
);

// ─── Game time calculation ───────────────────────────────────────────────────

/**
 * Parse played_seconds from SportyBet — can be:
 *   "70:09"  (MM:SS string)
 *   2700     (numeric seconds)
 *   null/undefined
 * Returns total seconds as a number, or null.
 */
const parsePlayedSeconds = (val: any): number | null => {
  if (val == null) return null;
  if (typeof val === "number") return val > 0 ? val : null;
  if (typeof val === "string" && val.includes(":")) {
    const [mm, ss] = val.split(":").map(Number);
    if (!isNaN(mm) && !isNaN(ss)) return mm * 60 + ss;
  }
  const n = Number(val);
  return !isNaN(n) && n > 0 ? n : null;
};

/**
 * Returns elapsed match time as a string like "34'" or "HT" or "90+2'"
 * Priority: played_seconds from SportyBet → estimate from start_time
 */
const getMatchTime = (m: any): string | null => {
  const period: string = m.period || "";
  const notStarted = !period || period === "Not start" || period === "Not started";
  if (notStarted) return null;
  if (period === "HT") return "HT";
  if (period === "FT" || period === "AET") return "FT";
  if (period === "Penalty") return "PEN";

  // Normalise period: SportyBet live uses H1/H2, buffer may use 1H/2H
  const isFirst  = period === "H1" || period === "1H";
  const isSecond = period === "H2" || period === "2H";
  const isET1    = period === "ET" || period === "ET1";
  const isET2    = period === "ET2";

  // ── Use played_seconds from SportyBet if available ──
  const ps = parsePlayedSeconds(m.played_seconds);
  if (ps !== null) {
    const totalMins = Math.floor(ps / 60);
    if (isFirst) {
      const display = Math.min(totalMins, 45);
      const added   = totalMins > 45 ? totalMins - 45 : 0;
      return added > 0 ? `45+${added}'` : `${display}'`;
    }
    if (isSecond) {
      // played_seconds is cumulative from kick-off (e.g. "72:30" = 72nd minute)
      const display = Math.min(totalMins, 90);
      const added   = totalMins > 90 ? totalMins - 90 : 0;
      return added > 0 ? `90+${added}'` : `${display}'`;
    }
    if (isET1) return `${Math.min(90 + Math.floor(ps / 60), 105)}'`;
    if (isET2) return `${Math.min(105 + Math.floor(ps / 60), 120)}'`;
    return `${totalMins}'`;
  }

  // ── Fallback: estimate from start_time ──
  const toMs = (t: any): number => {
    if (!t) return 0;
    if (typeof t === "string") return new Date(t).getTime();
    return t < 1e10 ? t * 1000 : t;
  };

  const startMs = toMs(m.start_time);
  if (!startMs) return null;
  const elapsedMins = Math.floor((Date.now() - startMs) / 60000);
  if (elapsedMins < 0) return null;

  if (isFirst) {
    const display = Math.min(elapsedMins, 45);
    const added   = elapsedMins > 45 ? Math.min(elapsedMins - 45, 5) : 0;
    return added > 0 ? `45+${added}'` : `${display}'`;
  }
  if (isSecond) {
    // 2nd half starts ~60 mins after kick-off (45 min play + ~15 min HT)
    const shMins  = elapsedMins - 60;
    if (shMins < 0) return "45'";
    const display = 45 + Math.min(shMins, 45);
    const added   = shMins > 45 ? Math.min(shMins - 45, 5) : 0;
    return added > 0 ? `90+${added}'` : `${display}'`;
  }
  if (isET1) return `${90 + Math.max(0, Math.min(elapsedMins - 105, 15))}'`;
  if (isET2) return `${105 + Math.max(0, Math.min(elapsedMins - 120, 15))}'`;

  return `${Math.min(elapsedMins, 90)}'`;
};

const FormDots = ({ form }: { form: any }) => {
  if (!form) return null;
  const chars: string[] = Array.isArray(form) ? form : String(form).split("");
  return (
    <div className="flex gap-0.5">
      {chars.map((r, i) => (
        <span
          key={i}
          className={`w-3 h-3 rounded-full text-[8px] flex items-center justify-center font-bold ${
            r === "W" ? "bg-emerald-500/30 text-emerald-400" :
            r === "L" ? "bg-red-500/30 text-red-400" :
            "bg-gray-600/40 text-gray-400"
          }`}
        >
          {r}
        </span>
      ))}
    </div>
  );
};

interface MatchCardProps {
  m: any;
  onClick: () => void;
}

const MatchCard = ({ m, onClick }: MatchCardProps) => {
  const score = scoreStr(m.score);
  const live = isLive(m);
  const hasOdds = m.odds_1x2?.home;

  return (
    <div
      className="group px-4 py-3 border-b border-white/5 last:border-0 cursor-pointer transition-all duration-150 hover:bg-white/[0.03] active:bg-white/[0.06]"
      onClick={onClick}
    >
      {/* Teams row */}
      <div className="flex items-center gap-3">
        {/* Home team */}
        <div className="flex-1 min-w-0">
          <span className={`text-sm truncate block ${live && score ? "text-white font-medium" : "text-gray-200"}`}>
            {m.home_team}
          </span>
          {m.home_form && <FormDots form={m.home_form} />}
        </div>

        {/* Score / Time */}
        <div className="flex flex-col items-center shrink-0 min-w-[80px]">
          {live ? (
            <>
              <div className="flex items-center gap-1.5 mb-0.5">
                <LiveDot />
                <span className="text-base font-bold text-white tabular-nums">{score ?? "- -"}</span>
              </div>
              {(() => {
                const t = getMatchTime(m);
                const isPaused = m.period === "HT" || m.period === "FT" || m.period === "AET" || m.period === "Penalty";
                return (
                  <span className={`text-[11px] font-bold tabular-nums ${
                    isPaused ? "text-orange-400" :
                    m.period === "Penalty" ? "text-purple-400" :
                    "text-red-400"
                  }`}>
                    {t ?? m.period}
                  </span>
                );
              })()}
            </>
          ) : score ? (
            <span className="text-base font-bold text-white tabular-nums">{score}</span>
          ) : (
            <span className="text-sm font-semibold text-emerald-400 tabular-nums">
              {formatKickoff(m.start_time)}
            </span>
          )}
        </div>

        {/* Away team */}
        <div className="flex-1 min-w-0 text-right">
          <span className={`text-sm truncate block ${live && score ? "text-white font-medium" : "text-gray-200"}`}>
            {m.away_team}
          </span>
          {m.away_form && (
            <div className="flex justify-end">
              <FormDots form={m.away_form} />
            </div>
          )}
        </div>
      </div>

      {/* Odds row */}
      {hasOdds && (
        <div className="flex justify-between mt-2 px-1">
          {[
            { label: "1", val: m.odds_1x2.home },
            { label: "X", val: m.odds_1x2.draw },
            { label: "2", val: m.odds_1x2.away },
          ].map(({ label, val }) => (
            <div
              key={label}
              className="flex-1 mx-0.5 flex flex-col items-center py-1 rounded bg-white/[0.04] border border-white/[0.06] hover:border-emerald-500/40 hover:bg-emerald-500/[0.06] transition-colors cursor-pointer"
            >
              <span className="text-[10px] text-gray-500 leading-none">{label}</span>
              <span className="text-xs font-semibold text-gray-200 mt-0.5">{val}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

interface LeagueSectionProps {
  tournament: string;
  matches: any[];
  defaultOpen?: boolean;
  onMatchClick: (id: string) => void;
}

const LeagueSection = ({ tournament, matches, defaultOpen = true, onMatchClick }: LeagueSectionProps) => {
  const [open, setOpen] = useState(defaultOpen);
  const liveInLeague = matches.filter(isLive).length;

  return (
    <div className="mb-2 rounded-xl overflow-hidden border border-white/[0.07] bg-[#161616]">
      {/* League header */}
      <button
        className="w-full flex items-center gap-2 px-4 py-2.5 bg-[#1a1a1a] hover:bg-[#1e1e1e] transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <span className="text-base">🏆</span>
        <span className="flex-1 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider truncate">
          {tournament}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {liveInLeague > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-red-400 font-semibold">
              <LiveDot />
              {liveInLeague} live
            </span>
          )}
          <span className="text-[10px] text-gray-600 font-medium">{matches.length}</span>
          <svg
            className={`w-3.5 h-3.5 text-gray-600 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Matches */}
      {open && (
        <div>
          {matches.map(m => (
            <MatchCard
              key={m.sportybet_id}
              m={m}
              onClick={() => onMatchClick(m.sportybet_id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface CountrySectionProps {
  country: string;
  leagues: Record<string, any[]>;
  onMatchClick: (id: string) => void;
}

const CountrySection = ({ country, leagues, onMatchClick }: CountrySectionProps) => {
  const [open, setOpen] = useState(true);
  const totalMatches = Object.values(leagues).reduce((s, arr) => s + arr.length, 0);
  const totalLive = Object.values(leagues).flat().filter(isLive).length;

  return (
    <div className="mb-4">
      {/* Country header */}
      <button
        className="w-full flex items-center gap-2 px-2 py-1.5 mb-1.5"
        onClick={() => setOpen(o => !o)}
      >
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest px-2 whitespace-nowrap">
          {country}
        </span>
        {totalLive > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-red-400 font-semibold">
            <LiveDot />
            {totalLive}
          </span>
        )}
        <span className="text-[10px] text-gray-700">{totalMatches}</span>
        <div className="h-px flex-1 bg-white/10" />
        <svg
          className={`w-3 h-3 text-gray-600 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div>
          {Object.entries(leagues).map(([tournament, matches]) => (
            <LeagueSection
              key={tournament}
              tournament={tournament}
              matches={matches}
              onMatchClick={onMatchClick}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Time-sorted view ────────────────────────────────────────────────────────

const TimeSlotSection = ({ time, matches, onMatchClick }: { time: string; matches: any[]; onMatchClick: (id: string) => void }) => {
  const [open, setOpen] = useState(true);
  const liveCount = matches.filter(isLive).length;

  return (
    <div className="mb-2 rounded-xl overflow-hidden border border-white/[0.07] bg-[#161616]">
      <button
        className="w-full flex items-center gap-2 px-4 py-2.5 bg-[#1a1a1a] hover:bg-[#1e1e1e] transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="flex-1 text-left text-xs font-semibold text-emerald-400 tracking-wider">
          {time}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {liveCount > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-red-400 font-semibold">
              <LiveDot />
              {liveCount}
            </span>
          )}
          <span className="text-[10px] text-gray-600">{matches.length}</span>
          <svg
            className={`w-3.5 h-3.5 text-gray-600 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {open && (
        <div>
          {matches.map(m => (
            <MatchCard key={m.sportybet_id} m={m} onClick={() => onMatchClick(m.sportybet_id)} />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Main component ──────────────────────────────────────────────────────────

type SortMode = "country" | "time";

const Home = ({ onWsStatus, onPredictionCount }: { onWsStatus: (connected: boolean) => void; onPredictionCount: (count: number | null) => void }) => {
  const router = useIonRouter();
  const { getTodayMatches, getMatchesByDate, mergeLiveMatches, matches, loading } = useFootballContext();

  const [activeTab, setActiveTab] = useState<"all" | "live" | "upcoming">("all");
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [sortMode, setSortMode] = useState<SortMode>("country");
  const [autoSuggestions, setAutoSuggestions] = useState<any[]>([]);
  const [autoBetting, setAutoBetting] = useState(false);
  const dateStrip = useMemo(() => buildDateStrip(), []);
  const pollingCleanupRef = useRef<(() => void) | null>(null);

  const fetchForDate = useCallback(
    (date: string): Promise<void> => {
      if (date === todayISO()) {
        return getTodayMatches();
      } else {
        return getMatchesByDate(date);
      }
    },
    [getTodayMatches, getMatchesByDate]
  );

  useEffect(() => {
    fetchForDate(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    if (selectedDate !== todayISO()) return;

    let socket: WebSocket;
    let dead = false;
    let retryDelay = 1_000;

    const connect = () => {
      if (dead) return;
      socket = new WebSocket(LIVE_WS_URL);

      socket.onopen = () => {
        onWsStatus(true);
        retryDelay = 1_000; // reset backoff on successful connect
      };

      socket.onmessage = event => {
        try {
          const payload = JSON.parse(event.data);
          if (payload?.type === "live_update") {
            mergeLiveMatches(payload.matches || []);
          }
        } catch {
          // malformed frame — ignore
        }
      };

      socket.onerror = () => {
        // onclose fires right after, reconnect happens there
      };

      socket.onclose = () => {
        onWsStatus(false);
        if (!dead) {
          setTimeout(connect, retryDelay);
          retryDelay = Math.min(retryDelay * 2, 30_000); // cap at 30 s
        }
      };
    };

    connect();

    return () => {
      dead = true;
      setWsConnected(false);
      socket?.close();
    };
  }, [selectedDate, mergeLiveMatches]);

  // ── Auto-refresh: poll for new predictions every 60s ──
  useEffect(() => {
    if (selectedDate !== todayISO()) return;

    pollingCleanupRef.current = startPredictionPolling(
      (data) => {
        if (data?.predictions) {
          onPredictionCount(data.predictions.length);
        }
      },
      60000,
      true,
    );

    // Fetch auto-bet suggestions every 5min
    const suggestionsInterval = setInterval(async () => {
      try {
        const suggestions = await getAutoBetSuggestions(5, 65);
        setAutoSuggestions(suggestions?.suggestions || []);
      } catch { /* ignore */ }
    }, 300000);

    // Initial fetch
    getAutoBetSuggestions(5, 65).then((s: any) => setAutoSuggestions(s?.suggestions || [])).catch(() => {});

    return () => {
      pollingCleanupRef.current?.();
      clearInterval(suggestionsInterval);
    };
  }, [selectedDate]);

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
  };

  // Filter by tab — finished matches are always excluded from all/upcoming
  const filtered = useMemo(() => {
    const all = (matches || []).filter(m => !isFinished(m));
    if (activeTab === "live") return all.filter(isLive);
    if (activeTab === "upcoming") return all.filter(m => !isLive(m));
    return all;
  }, [matches, activeTab]);

  const liveCount = (matches || []).filter(isLive).length;
  const finishedCount = (matches || []).filter(isFinished).length;

  // Group by country → league
  const groupedByCountry = useMemo(() => {
    const countryMap: Record<string, Record<string, any[]>> = {};
    for (const m of filtered) {
      const { country, league } = parseLeagueCountry(m.tournament || "Unknown", m.category || m.country);
      if (!countryMap[country]) countryMap[country] = {};
      if (!countryMap[country][league]) countryMap[country][league] = [];
      countryMap[country][league].push(m);
    }
    // Sort countries alphabetically, but put "Europe" and "International" last
    return Object.fromEntries(
      Object.entries(countryMap).sort(([a], [b]) => {
        const priority = (s: string) => (s === "Europe" || s === "International" || s === "Other" ? 1 : 0);
        return priority(a) - priority(b) || a.localeCompare(b);
      })
    );
  }, [filtered]);

  // Group by time slot — key includes date prefix when match date differs from selected date
  const groupedByTime = useMemo(() => {
    const timeMap: Record<string, any[]> = {};
    const toMs = (t: any): number => {
      if (!t) return 0;
      if (typeof t === "string") return new Date(t).getTime();
      return t < 1e10 ? t * 1000 : t;
    };
    // Sort: live first, then by start_time asc, unknowns (0) pushed to bottom
    const sorted = [...filtered].sort((a, b) => {
      const aLive = isLive(a) ? 0 : 1;
      const bLive = isLive(b) ? 0 : 1;
      if (aLive !== bLive) return aLive - bLive;
      const aMs = toMs(a.start_time);
      const bMs = toMs(b.start_time);
      if (!aMs && !bMs) return 0;
      if (!aMs) return 1;  // no start_time → bottom
      if (!bMs) return -1;
      return aMs - bMs;
    });
    for (const m of sorted) {
      const live = isLive(m);
      if (live) {
        if (!timeMap["🔴 Live Now"]) timeMap["🔴 Live Now"] = [];
        timeMap["🔴 Live Now"].push(m);
        continue;
      }
      const ms = toMs(m.start_time);
      const kickoffTime = formatKickoff(m.start_time);
      let key: string;
      if (ms) {
        const matchDateISO = new Date(ms).toISOString().slice(0, 10);
        if (matchDateISO !== selectedDate) {
          const dateLabel = new Date(ms).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" });
          key = `${dateLabel} · ${kickoffTime}`;
        } else {
          key = kickoffTime;
        }
      } else {
        key = "--:--";  // unknown time — will sort to bottom
      }
      if (!timeMap[key]) timeMap[key] = [];
      timeMap[key].push(m);
    }
    // Put live first, then sort remaining slots chronologically, unknowns last
    const entries = Object.entries(timeMap);
    const liveEntry = entries.find(([k]) => k === "🔴 Live Now");
    const rest = entries
      .filter(([k]) => k !== "🔴 Live Now")
      .sort(([, a], [, b]) => {
        const aMs = toMs(a[0].start_time);
        const bMs = toMs(b[0].start_time);
        if (!aMs && !bMs) return 0;
        if (!aMs) return 1;
        if (!bMs) return -1;
        return aMs - bMs;
      });
    return Object.fromEntries(liveEntry ? [liveEntry, ...rest] : rest);
  }, [filtered, selectedDate]);

  const handleMatchClick = (id: string) => {
    router.push(`/match/${id}`, "forward", "push");
  };

  const isEmpty = filtered.length === 0;

  return (
     <div className="w-full h-full bg-[#0e0e0e] text-white flex flex-col">
       {/* ── Date strip ── */}
      <div className="flex overflow-x-auto gap-1 px-3 pt-3 pb-2 shrink-0 scrollbar-hide">
        {dateStrip.map(d => {
          const label = formatDateLabel(d);
          const isSelected = selectedDate === d;
          return (
            <button
              key={d}
              onClick={() => handleDateSelect(d)}
              className={`shrink-0 flex flex-col items-center px-3 py-1.5 rounded-lg transition-all duration-150 min-w-[52px] ${
                isSelected
                  ? "bg-emerald-500 text-black"
                  : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
              }`}
            >
              <span className={`text-[10px] font-semibold uppercase tracking-wide ${isSelected ? "text-black/70" : ""}`}>
                {label.top}
              </span>
              <span className={`text-xs font-bold ${isSelected ? "text-black" : ""}`}>
                {label.bottom}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Filter bar ── */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.06] shrink-0">
        {/* Status tabs */}
        <div className="flex gap-1 flex-1">
          {(["all", "live", "upcoming"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 text-xs rounded-full border transition-all duration-150 ${
                activeTab === tab
                  ? tab === "live"
                    ? "border-red-500 bg-red-500/10 text-red-400 font-semibold"
                    : "border-emerald-500 bg-emerald-500/10 text-emerald-400 font-semibold"
                  : "border-white/10 text-gray-500 hover:text-gray-300"
              }`}
            >
              {tab === "live" && liveCount > 0 ? (
                <span className="flex items-center gap-1.5">
                  <LiveDot />
                  Live ({liveCount})
                </span>
              ) : (
                <span className="capitalize">{tab}</span>
              )}
            </button>
          ))}
        </div>

        {/* Sort toggle */}
        <div className="flex items-center gap-1 bg-white/[0.05] rounded-lg p-0.5 shrink-0">
          <button
            onClick={() => setSortMode("country")}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-all ${
              sortMode === "country" ? "bg-white/10 text-white" : "text-gray-600"
            }`}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
            </svg>
            League
          </button>
          <button
            onClick={() => setSortMode("time")}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-all ${
              sortMode === "time" ? "bg-white/10 text-white" : "text-gray-600"
            }`}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Time
          </button>
        </div>

        {finishedCount > 0 && (
          <span className="text-[10px] text-gray-600 border border-white/10 rounded-full px-1.5 py-0.5 shrink-0">
            {finishedCount} FT
          </span>
        )}
      </div>

      {/* ── Match list ── */}
      <IonContent style={{ "--background": "#0e0e0e" } as any}>
        <IonRefresher
          slot="fixed"
          onIonRefresh={e => {
            fetchForDate(selectedDate).finally(() => e.detail.complete());
          }}
        >
          <IonRefresherContent pullingText="Pull to refresh" refreshingSpinner="crescent" />
        </IonRefresher>

        <div className="px-3 py-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center mt-16 gap-3">
              <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
              <span className="text-xs text-gray-600">Loading matches…</span>
            </div>
          ) : isEmpty ? (
            <div className="flex flex-col items-center justify-center mt-16 gap-2">
              <span className="text-3xl">⚽</span>
              <span className="text-sm text-gray-600">No matches found</span>
              <span className="text-xs text-gray-700">Try a different date or filter</span>
            </div>
          ) : sortMode === "country" ? (
            Object.entries(groupedByCountry).map(([country, leagues]) => (
              <CountrySection
                key={country}
                country={country}
                leagues={leagues}
                onMatchClick={handleMatchClick}
              />
            ))
          ) : (
            Object.entries(groupedByTime).map(([time, timeMatches]) => (
              <TimeSlotSection
                key={time}
                time={time}
                matches={timeMatches}
                onMatchClick={handleMatchClick}
              />
            ))
          )}
        </div>

        {/* ── Auto-Bet Suggestions Panel ── */}
        {autoSuggestions.length > 0 && (
          <div className="shrink-0 border-t border-white/[0.06] bg-[#111] px-3 py-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-yellow-400">🎯 Auto-Bet Picks</span>
              <button
                onClick={() => setAutoSuggestions([])}
                className="text-[10px] text-gray-500 hover:text-gray-300"
              >
                Dismiss
              </button>
            </div>
            <div className="space-y-1.5">
              {autoSuggestions.map((suggestion: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-lg border border-[#2a2a2a] bg-[#161616] px-3 py-2"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-white truncate">
                      {suggestion.match_name || suggestion.match_id}
                    </div>
                    <div className="text-[10px] text-gray-500">
                      {suggestion.pick_type?.replace(/_/g, ' ')} · {suggestion.selection} · {suggestion.confidence}% conf
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        setAutoBetting(true);
                        await autoBetPlace({
                          selections: [{
                            match_id: suggestion.match_id,
                            pick_type: suggestion.pick_type,
                            selection: suggestion.selection,
                            confidence: suggestion.confidence,
                          }],
                          stake: 10,
                        });
                      } catch { /* ignore */ }
                      setAutoBetting(false);
                    }}
                    disabled={autoBetting}
                    className="shrink-0 rounded bg-emerald-600 px-3 py-1.5 text-[10px] font-bold text-white disabled:opacity-40"
                  >
                    {autoBetting ? 'Placing...' : 'Bet'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </IonContent>
    </div>
  );
};

export default Home;
