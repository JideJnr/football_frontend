import { createContext, useContext, ReactNode, useState } from 'react';
import { useFootballStore } from '../stores/footballStore/useFootballStore';

interface FootballContextType {
  fetchLiveMatches: () => Promise<void>;
  fetchMatchesByDate: (date: string) => Promise<void>;
  getMatchById: (id: string) => Promise<void>;
  getAllCountries: () => Promise<void>;
  getCountryById: (id: string) => Promise<void>;
  getTeamById: (id: string) => Promise<void>;
  getPlayerById: (id: string) => Promise<void>;
  matches: any[] | null;
  liveMatches: any[] | null;
  currentMatch: any | null;
  countries: any[] | null;
  currentCountry: any | null;
  team: any | null;
  player: any | null;
  loading: boolean;
  error: string | null;
}

const FootballContext = createContext<FootballContextType | undefined>(undefined);

export const FootballProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const {
    fetchLiveMatches: storeFetchLiveMatches,
    fetchMatchesByDate: storeFetchMatchesByDate,
    getMatchById: storeGetMatchById,
    getAllCountries: storeGetAllCountries,
    getCountryById: storeGetCountryById,
    getTeamById: storeGetTeamById,
    getPlayerById: storeGetPlayerById,
    error: storeError,
    loading: storeLoading
  } = useFootballStore();

  // Local context state
  const [matches, setMatches] = useState<any[] | null>(null);
  const [liveMatches, setLiveMatches] = useState<any[] | null>(null);
  const [currentMatch, setCurrentMatch] = useState<any | null>(null);
  const [countries, setCountries] = useState<any[] | null>(null);
  const [currentCountry, setCurrentCountry] = useState<any | null>(null);
  const [team, setTeam] = useState<any | null>(null);
  const [player, setPlayer] = useState<any | null>(null);

  // ---------- Wrapped calls ----------
  const fetchLiveMatches = async () => {
    try {
      const res = await storeFetchLiveMatches();
      if (res.success) setLiveMatches(res.data);
    } catch {
      // Do not change state if it fails
    }
  };

  const fetchMatchesByDate = async (date: string) => {
    try {
      const res = await storeFetchMatchesByDate(date);
      if (res.success) setMatches(res.matches);
    } catch {}
  };

  const getMatchById = async (id: string) => {
    try {
      const res = await storeGetMatchById(id);
      console.log("Fetched Match:", res);
      if (res.success) setCurrentMatch(res.data);
    } catch {}
  };

  const getAllCountries = async () => {
    try {
      const res = await storeGetAllCountries();
      if (res.success) setCountries(res.countries);
    } catch {}
  };

  const getCountryById = async (id: string) => {
    try {
      const res = await storeGetCountryById(id);
      if (res.success) setCurrentCountry(res.country);
    } catch {}
  };

  const getTeamById = async (id: string) => {
    try {
      const res = await storeGetTeamById(id);
      if (res.success) setTeam(res.team);
    } catch {}
  };

  const getPlayerById = async (id: string) => {
    try {
      const res = await storeGetPlayerById(id);
      if (res.success) setPlayer(res.player);
    } catch {}
  };

  return (
    <FootballContext.Provider
      value={{
        fetchLiveMatches,
        fetchMatchesByDate,
        getMatchById,
        getAllCountries,
        getCountryById,
        getTeamById,
        getPlayerById,
        matches,
        liveMatches,
        currentMatch,
        countries,
        currentCountry,
        team,
        player,
        loading: storeLoading,
        error: storeError
      }}
    >
      {children}
    </FootballContext.Provider>
  );
};

export const useFootballContext = () => {
  const context = useContext(FootballContext);
  if (!context) {
    throw new Error('useFootballContext must be used within a FootballProvider');
  }
  return context;
};
