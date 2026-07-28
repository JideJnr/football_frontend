import { createContext, useContext, ReactNode, useCallback, useState, useRef } from 'react';
import { useFootballStore } from '../stores/footballStore/useFootballStore';

interface FootballContextType {
  getTodayMatches: () => Promise<void>;
  getMatchesByDate: (date: string) => Promise<void>;
  getMatchDetail: (id: string) => Promise<void>;
  mergeLiveMatches: (liveMatches: any[]) => void;
  prefetchToday: () => Promise<void>;
  matches: any[] | null;
  currentMatch: any | null;
  matchDetail: any | null;
  team: any | null;
  getTeamById: (id: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

const FootballContext = createContext<FootballContextType | undefined>(undefined);

export const FootballProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const store = useFootballStore();
  const [matches, setMatches] = useState<any[] | null>(null);
  const [matchDetail, setMatchDetail] = useState<any | null>(null);
  // Shared in-flight promise so splash + home never double-fetch
  const prefetchRef = useRef<Promise<void> | null>(null);

  const _loadToday = useCallback(async () => {
    const res = await store.getTodayMatches();
    if (res.status === 'success') setMatches(res.matches);
  }, [store]);

  // Called by splash during animation — result is cached so Home reuses it
  const prefetchToday = useCallback((): Promise<void> => {
    if (!prefetchRef.current) {
      prefetchRef.current = _loadToday().catch(() => {}).finally(() => {
        prefetchRef.current = null;
      });
    }
    return prefetchRef.current;
  }, [_loadToday]);

  const getTodayMatches = useCallback(async () => {
    // If a prefetch is already in flight, wait for it instead of firing a second request
    if (prefetchRef.current) return prefetchRef.current;
    // If we already have data, skip the network call
    if (matches !== null) return;
    return _loadToday().catch(() => {});
  }, [_loadToday, matches]);

  const getMatchesByDate = async (date: string) => {
    try {
      const res = await store.getMatchesByDate(date);
      if (res.status === 'success') setMatches(res.matches);
    } catch {}
  };

  const getMatchDetail = async (id: string) => {
    setMatchDetail((prev: any | null) => (prev && String(prev.sportybet_id) === String(id) ? prev : null));
    try {
      const res = await store.getMatchDetail(id);
      if (res?.sportybet_id) setMatchDetail(res);
    } catch {
      setMatchDetail(null);
    }
  };

  const getTeamById = async (_id: string) => undefined;

  const mergeLiveMatches = useCallback((liveMatches: any[]) => {
    setMatches(prev => {
      const current = prev || [];
      const byId = new Map(current.map(m => [String(m.sportybet_id), m]));
      for (const live of liveMatches || []) {
        byId.set(String(live.sportybet_id), { ...(byId.get(String(live.sportybet_id)) || {}), ...live });
      }
      return Array.from(byId.values());
    });
  }, []);

  return (
    <FootballContext.Provider value={{
      getTodayMatches, getMatchesByDate, getMatchDetail, mergeLiveMatches, prefetchToday,
      matches, matchDetail, currentMatch: matchDetail, team: matchDetail?.home_team || null, getTeamById,
      loading: store.loading,
      error: store.error,
    }}>
      {children}
    </FootballContext.Provider>
  );
};

export const useFootballContext = () => {
  const context = useContext(FootballContext);
  if (!context) throw new Error('useFootballContext must be used within a FootballProvider');
  return context;
};
