import React from 'react';
import { AuthProvider } from './useAuthContext';
import { DarkModeProvider } from './useDarkModeContext';
import { FootballProvider } from './useFootballContext';
import { PredictionProvider } from './usePredictionContext';

export const ContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthProvider>
      <FootballProvider>
        <PredictionProvider>
          <DarkModeProvider>
            {children}
          </DarkModeProvider>
        </PredictionProvider>
      </FootballProvider>
    </AuthProvider>
  );
};

