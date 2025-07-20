
interface Match {
  id: string;
  number: string;
  type: string;
  price: number;
  capacity: number;
  amenities: string[];
  isAvailable: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface MatchState {
  Matches: Match[];
  availableMatches: Match[];
  currentMatch: Match | null;
  loading: boolean;
  error: string | null;
  
  fetchMatchesByDate: (date: string,) => Promise<void>;
  getMatchById: (id: string) => Promise<void>;
  getAllCountries: () => Promise<void>;
  getCountryById: (id: string) => Promise<void>;
  getTeamById: (id: string) => Promise<void>;
  getPlayerById: (id: string) => Promise<void>; 
}

interface AuthContextType {
  user: any;
  login: (email: string, password: string) => Promise<void>;
  signup: (payload: any) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}