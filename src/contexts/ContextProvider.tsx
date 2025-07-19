import React from 'react';
import { AuthProvider } from './AuthContext';
import { DarkModeProvider } from './DarkModeContext';
import { DataProvider } from './DataContext';
import { MatchProvider } from './MatchContext';
import { PredictionProvider } from './PredictionContext';

export const ContextProvider:  React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <DarkModeProvider>
      <AuthProvider>
        <DataProvider>
          <MatchProvider>
            <PredictionProvider>
              {children}
            </PredictionProvider>
          </MatchProvider>
        </DataProvider>
      </AuthProvider>
    </DarkModeProvider>
  );
};


