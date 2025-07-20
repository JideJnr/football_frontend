import React from 'react';
import { AuthProvider } from './useAuthContext';
import { DarkModeProvider } from './useDarkModeContext';
import { DataProvider } from './useDataContext';


export const ContextProvider:  React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <DarkModeProvider>
      <AuthProvider>
        <DataProvider>
              {children}
        </DataProvider>
      </AuthProvider>
    </DarkModeProvider>
  );
};


