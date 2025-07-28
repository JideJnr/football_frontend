import React from 'react';
import { AuthProvider } from './useAuthContext';
import { DarkModeProvider } from './useDarkModeContext';
import { DataProvider } from './useFootballContext';


export const ContextProvider:  React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    
      <AuthProvider>
        <DataProvider>
          
            <DarkModeProvider>
              {children}
            </DarkModeProvider>
           
        </DataProvider>
      </AuthProvider>
    
  );
};


