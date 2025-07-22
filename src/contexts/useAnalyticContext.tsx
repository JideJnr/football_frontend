import { createContext, useContext, ReactNode, useState } from 'react';
import { useMatchStore } from '../stores/useMatchStore';


const AnalyticContext = createContext<AnalyticContextType | undefined>(undefined);

export const AnalyticProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { fetchMatchesByDate, getMatchById, getAllCountries, getTeamById, getPlayerById, error , loading:apiLoading } = useMatchStore();

  const [loading , setLoading] = useState(false)

  const bot = null;
  const bots = null;


  const wrappedGetAllBots = async () => {
    try {
      const response = await fetchMatchesByDate(date); 
  
    

    } catch (error) {
      console.error('Login error:', error);
    }
  };
   
  const wrappedGetBotId = async (id:string) => {
    try {
      const response = await getMatchById(id); 
  
      if (response.success) {
        
      }

    } catch (error) {
      console.error('Login error:', error);
    }
  };
   

  return (
    <AnalyticContext.Provider value={{
      getAll: wrappedGetAllBots,
      getBotById: wrappedGetBotId,
      bot, bots,
      loading,
      error
    }}>
      {children}
    </AnalyticContext.Provider>
  );
};

export const useAnalytic = () => {
  const context = useContext(AnalyticContext);
  if (!context) throw new Error('useAnalytic must be used within an AnalyticProvider');
  return context;
};
