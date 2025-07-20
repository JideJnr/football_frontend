import { createContext, useContext, ReactNode } from 'react';
import { useIonRouter } from '@ionic/react';
import { useAuthStore } from '../stores/useAuthStore';



const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const router = useIonRouter();
  const { user, login, logout, loading, error, signup } = useAuthStore();

  const wrappedLogin = async (email: string, password: string) => {
    try {
      const response = await login(email, password); 
  
      if (response.success) {
        router.push('/main', 'forward', 'replace');}

    } catch (error) {
      console.error('Login error:', error);
    }
  };
   
  const wrappedLogout = async () => {
    await logout();

    router.push('/login', 'forward', 'replace');
  };

  const wrappedSignup = async (payload:any) => {
    await signup(payload);
    router.push('/main', 'forward', 'replace');
  };

  return (
    <AuthContext.Provider value={{
      user,
      login: wrappedLogin,
      signup: wrappedSignup,
      logout: wrappedLogout,
      isAuthenticated: !!user,
      loading,
      error
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
