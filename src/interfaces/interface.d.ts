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

interface BasketballState {
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

interface TennisState {
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

interface FootballState {
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

export interface Competition {
  key: string;
  name: string;
  unique_tournament_id: number;
  enabled?: boolean;
}

export interface CompetitionSettings {
  key: string;
  name: string;
  enabled: boolean;
  unique_tournament_id: number;
  season_id: number | null;
  start_date: string;
  end_date: string;
  metadata: Record<string, any>;
  updated_at: string;
}

export interface CompetitionBufferSummary {
  total: number;
  enriched: number;
  predicted: number;
  live: number;
  finished: number;
  high_importance: number;
  critical_importance: number;
  groups: string[];
}

export interface CompetitionBufferStatus {
  total: number;
  enriched: number;
  predicted: number;
  first_match_date: string | null;
  last_match_date: string | null;
  last_enriched_at: string | null;
  last_predicted_at: string | null;
}

export interface CompetitionMatch {
  competition_key: string;
  match_id: string;
  competition_match_id: string;
  sofascore_id: string;
  match_date: string;
  group: string;
  round: string;
  match: string;
  start_time: number;
  status: string;
  score: { home: string; away: string };
  match_state: Record<string, any>;
  enriched: boolean;
  predicted: boolean;
  enriched_at: string | null;
  predicted_at: string | null;
  prediction: Record<string, any> | null;
  readiness: Record<string, any> | null;
  importance_context: Record<string, any>;
  competition_intelligence: Record<string, any> | null;
  event: Record<string, any>;
}

export interface CompetitionAnalysis {
  id: number;
  competition_key: string;
  round_name: string;
  analysis_text: string;
  model_used: string;
  match_count: number;
  matchday_date: string;
  generated_at: string;
}

export interface CompetitionDashboardItem {
  key: string;
  name: string;
  enabled: boolean;
  unique_tournament_id: number;
  settings: CompetitionSettings;
  buffer_summary: CompetitionBufferSummary;
  buffer_status: CompetitionBufferStatus;
  latest_analysis: CompetitionAnalysis | null;
  match_count: number;
  error: string | null;
}

export interface CompetitionDashboardResponse {
  status: string;
  total_tracked: number;
  enabled_count: number;
  competitions: CompetitionDashboardItem[];
  errors: Array<{ key: string; error: string }>;
  generated_at: string;
}

export interface CompetitionPageResponse {
  status: string;
  competition_key: string;
  settings: CompetitionSettings;
  buffer_summary: CompetitionBufferSummary;
  buffer_status: CompetitionBufferStatus;
  matches: CompetitionMatch[];
  latest_analysis: CompetitionAnalysis | null;
  analysis_history: CompetitionAnalysis[];
}

export {};
