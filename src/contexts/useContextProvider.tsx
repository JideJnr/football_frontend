import React from 'react';
import { AuthProvider } from './useAuthContext';
import { DarkModeProvider } from './useDarkModeContext';
import { DataProvider } from './useDataContext';
import { ControlProvider } from './useControlContext';
import { AnalyticProvider } from './useAnalyticContext';


export const ContextProvider:  React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    
      <AuthProvider>
        <DataProvider>
          <ControlProvider>
            <AnalyticProvider>
            <DarkModeProvider>
              {children}
            </DarkModeProvider>
            </AnalyticProvider>
          </ControlProvider>
        </DataProvider>
      </AuthProvider>
    
  );
};


