import { createContext, useContext, ReactNode, useState } from 'react';
import { useMatchStore } from '../stores/useMatchStore';


const DataContext = createContext<MatchState | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { fetchMatchesByDate, getMatchById, getAllCountries, getTeamById, getPlayerById, error , loading:apiLoading } = useMatchStore();

  const [loading , setLoading] = useState(false)

  const countries = ['america'];
  const league = ['america'];
  const country = ['america'];
  const team = ['america'];
  const match = ['america'];

  const wrappedFetchMatchesByDate = async (date:string) => {
    try {
      const response = await fetchMatchesByDate(date); 
  
      if (response.success) {
        
      }

    } catch (error) {
      console.error('Login error:', error);
    }
  };
   
  const wrappedGetMatchById = async (date:string) => {
    try {
      const response = await fetchMatchesByDate(date); 
  
      if (response.success) {
        
      }

    } catch (error) {
      console.error('Login error:', error);
    }
  };
   
  const wrappedGetAllCountries = async (date:string) => {
    try {
      const response = await fetchMatchesByDate(date); 
  
      if (response.success) {
        
      }

    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const wrappedGetCountryById = async (date:string) => {
    try {
      const response = await fetchMatchesByDate(date); 
  
      if (response.success) {
        
      }

    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const wrappedGetTeamById = async (date:string) => {
    try {
      const response = await fetchMatchesByDate(date); 
  
      if (response.success) {
        
      }

    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const wrappedGetPlayerById = async (date:string) => {
    try {
      const response = await fetchMatchesByDate(date); 
  
      if (response.success) {
        
      }

    } catch (error) {
      console.error('Login error:', error);
    }
  };
  
  return (
    <DataContext.Provider value={{
      fetchMatchesByDate: wrappedFetchMatchesByDate,
      getMatchById: wrappedGetMatchById,
      getAllCountries: wrappedGetAllCountries,
      getCountryById: wrappedGetCountryById,
      getTeamById: wrappedGetTeamById,
      getPlayerById: wrappedGetPlayerById,
      getLeagueById: wrappedGetPlayerById,
      team,
      league,
      match,
      country,
      countries,
      loading,
      error
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within an DataProvider');
  return context;
};
