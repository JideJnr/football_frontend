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

interface AnalyticsState {
  analytics: [];
  bot: [];
  loading: boolean;
  error: string | null;
  
  getOverview: () => Promise<void>;
  getBotMetrics: (id:string) => Promise<void>;
  getBotPredictions: (id:string) => Promise<void>;
}

interface DataContextType {
  currentCountry: any;
  league :any;
  countries : any;
  team:any;
  matches: any;
  currentMatch: Match | null;
  loading: boolean;
  error: string |null;
  
  fetchMatchesByDate: (date: string,) => Promise<void>;
  getMatchById: (id: string) => Promise<void>;
  getAllCountries: () => Promise<void>;
  getCountryById: (id: string) => Promise<void>;
  getTeamById: (id: string) => Promise<void>;
  getPlayerById: (id: string) => Promise<void>;
  getLeagueById: (id: string) => Promise<void>;
}

interface AnalyticContextType {
  bot: any;
  bots :any;
  loading: boolean;
  error: string |null;
  

  getAll: () => Promise<void>;
  getBotById: (id: string) => Promise<void>;
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

interface EngineState {
  bot: [];
  bots:[];
  engineStatus:false;

  availableMatches: Match[];
  currentMatch: Match | null;
  loading: boolean;
  error: string | null;
  
  toggleEngine: () => Promise<void>;
  stopEngine: () => Promise<void>;
  getAllBot: () => Promise<void>;
  startBotById: () => Promise<void>;
  stopBotById: () => Promise<void>;
  getBotById: () => Promise<void>;
  getPlayerById: () => Promise<void>; 
}


