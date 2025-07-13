import { createContext, useContext, ReactNode } from 'react';

interface DataContextType {

}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
 
  return (
    <DataContext.Provider value={{
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
