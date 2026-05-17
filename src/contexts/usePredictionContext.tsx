import { createContext, useContext, useState, ReactNode } from 'react';

interface Selection {
  match_id: string;
  match: string;
  selection: string;
  odds: number;
  confidence?: number;
}

interface PredictionContextType {
  selections: Selection[];
  addSelection: (s: Selection) => void;
  removeSelection: (match_id: string) => void;
  clearSelections: () => void;
}

const PredictionContext = createContext<PredictionContextType | undefined>(undefined);

export const PredictionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selections, setSelections] = useState<Selection[]>([]);

  const addSelection = (s: Selection) =>
    setSelections(prev => prev.some(x => x.match_id === s.match_id) ? prev : [...prev, s]);

  const removeSelection = (match_id: string) =>
    setSelections(prev => prev.filter(x => x.match_id !== match_id));

  const clearSelections = () => setSelections([]);

  return (
    <PredictionContext.Provider value={{ selections, addSelection, removeSelection, clearSelections }}>
      {children}
    </PredictionContext.Provider>
  );
};

export const usePredictionContext = () => {
  const ctx = useContext(PredictionContext);
  if (!ctx) throw new Error('usePredictionContext must be used within PredictionProvider');
  return ctx;
};
