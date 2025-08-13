import React from 'react';
import { AuthProvider } from './useAuthContext';
import { DarkModeProvider } from './useDarkModeContext';
import { FootballProvider } from './useFootballContext';


export const ContextProvider:  React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    
      <AuthProvider>
        <FootballProvider>
          
            <DarkModeProvider>
              {children}
            </DarkModeProvider>
           
        </FootballProvider>
      </AuthProvider>
    
  );
};


