import React from 'react';
import { AuthProvider } from './AuthContext';
import { DarkModeProvider } from './DarkModeContext';
import { DataProvider } from './DataContext';

export const ContextProvider:  React.FC<{ children: React.ReactNode }> = ({ children }) => {


  return (
    
    <AuthProvider>
        <DarkModeProvider>
            <DataProvider>

                {children}

            </DataProvider>
        </DarkModeProvider>
    </AuthProvider>
  );
};


