import React from 'react';
import { AuthProvider } from './useAuthContext';
import { DarkModeProvider } from './useDarkModeContext';
import { DataProvider } from './useDataContext';
import { ControlProvider } from './useControlContext';


export const ContextProvider:  React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <DarkModeProvider>
      <AuthProvider>
        <DataProvider>
          <ControlProvider>
              {children}
          </ControlProvider>
        </DataProvider>
      </AuthProvider>
    </DarkModeProvider>
  );
};


