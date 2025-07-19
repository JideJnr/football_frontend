import { createContext, useContext, ReactNode } from 'react';

interface MatchContextType {

}

const MatchContext = createContext<MatchContextType | undefined>(undefined);

export const MatchProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
 
  return (
    <MatchContext.Provider value={{
    }}>
      {children}
    </MatchContext.Provider>
  );
};

export const useMatchs = () => {
  const context = useContext(MatchContext);
  if (!context) throw new Error('useMatch must be used within an MatchsProvider');
  return context;
};
