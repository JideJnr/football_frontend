import { createContext, useContext, ReactNode } from 'react';

interface PredictionContextType {

}

const PredictionContext = createContext<PredictionContextType | undefined>(undefined);

export const PredictionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
 
  return (
    <PredictionContext.Provider value={{
    }}>
      {children}
    </PredictionContext.Provider>
  );
};

export const usePredictions = () => {
  const context = useContext(PredictionContext);
  if (!context) throw new Error('usePrediction must be used within an PredictionsProvider');
  return context;
};
