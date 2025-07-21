import { createContext, useContext, ReactNode, useState } from 'react';
import { useBotStore } from '../stores/useBotStore';
import { getBotStatus } from '../services/api';


const ControlContext = createContext<EngineState | undefined>(undefined);

export const ControlProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  
  const {startEngine, stopEngine, getAllBot, startBotById,getStatusById,   error , loading:apiLoading } = useBotStore();
  
  const [loading , setLoading] = useState(false)

  const engineStatus = false;
  const botStatus = false;
  const bot = null
  const bots = null




  const wrappedStartEngine = async () => {
    try {
      const response = await startEngine(); 
  
      if (response.success) {
        
      }

    } catch (error) {
      console.error('Login error:', error);
    }
  };
   
  const wrappedStopEngine = async () => {
    try {
      const response = await stopEngine(); 
  
      if (response.success) {
        
      }

    } catch (error) {
      console.error('Login error:', error);
    }
  };
   
  const WrappedGetAllBot = async () => {
    try {
      const response = await getAllBot(); 
  
      if (response.success) {
        
      }

    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const wrappedStartBotById = async (id:string) => {
    try {
      const response = await startBotById(id); 
  
      if (response.success) {
        
      }

    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const wrappedGetBotStatusById = async (id:string) => {
    try {
      const response = await  getBotStatus(id);
  
      if (response.success) {
        
      }

    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const wrappedStopBotById = async (id:string) => {
    try {
      const response = await getStatusById(id); 
  
      if (response.success) {
        
      }

    } catch (error) {
      console.error('Login error:', error);
    }
  };
  
  return (
    <ControlContext.Provider value={{
      toggleEngine: engineStatus ? wrappedStartEngine : wrappedStopEngine,
      getAllBot: WrappedGetAllBot,
      getBotById: wrappedGetBotStatusById,
      startBot: wrappedStartBotById,
      stopBot: wrappedStopBotById,
      bot,
      bots,
      botStatus,
      engineStatus,
      loading,
      error
    }}>
      {children}
    </ControlContext.Provider>
  );
};

export const useControl = () => {
  const context = useContext(ControlContext);
  if (!context) throw new Error('useControl must be used within an ControlProvider');
  return context;
};
