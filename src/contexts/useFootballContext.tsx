import { createContext, useContext, ReactNode, useCallback, useState } from 'react';
import { useFootballStore } from '../stores/footballStore/useFootballStore';

interface FootballContextType {
  getTodayMatches: () => Promise<void>;
  getMatchesByDate: (date: string) => Promise<void>;
  getMatchDetail: (id: string) => Promise<void>;
  mergeLiveMatches: (liveMatches: any[]) => void;
  matches: any[] | null;
  matchDetail: any | null;
  loading: boolean;
  error: string | null;
}

const FootballContext = createContext<FootballContextType | undefined>(undefined);

export const FootballProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const store = useFootballStore();
  const [matches, setMatches] = useState<any[] | null>(null);
  const [matchDetail, setMatchDetail] = useState<any | null>(null);

  const getTodayMatches = async () => {
    try {
      const res = await store.getTodayMatches();
      if (res.status === 'success') setMatches(res.matches);
    } catch {}
  };

  const getMatchesByDate = async (date: string) => {
    try {
      const res = await store.getMatchesByDate(date);
      if (res.status === 'success') setMatches(res.matches);
    } catch {}
  };

  const getMatchDetail = async (id: string) => {
    setMatchDetail(null);
    try {
      const res = await store.getMatchDetail(id);
      if (res?.sportybet_id) setMatchDetail(res);
    } catch {
      setMatchDetail(null);
    }
  };

  const mergeLiveMatches = useCallback((liveMatches: any[]) => {
    setMatches(prev => {
      const current = prev || [];
      const byId = new Map(current.map(match => [String(match.sportybet_id), match]));
      for (const live of liveMatches || []) {
        byId.set(String(live.sportybet_id), { ...(byId.get(String(live.sportybet_id)) || {}), ...live });
      }
      return Array.from(byId.values());
    });
  }, []);

  return (
    <FootballContext.Provider value={{
      getTodayMatches, getMatchesByDate, getMatchDetail, mergeLiveMatches,
      matches, matchDetail,
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
