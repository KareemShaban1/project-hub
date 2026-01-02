import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '@/lib/api-client';

interface User {
  id: string;
  email: string;
  tenantId: string;
  profile?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
  tenant?: {
    id: string;
    name: string;
    plan: string;
    status: string;
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string, tenantName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      const userData = await apiClient.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Failed to load user:', error);
      localStorage.removeItem('auth_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const signUp = async (email: string, password: string, name: string, tenantName?: string) => {
    try {
      const { user: newUser } = await apiClient.signUp(email, password, name, tenantName);
      setUser(newUser);
      return { error: null };
    } catch (error: any) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { user: signedInUser } = await apiClient.signIn(email, password);
      setUser(signedInUser);
      await loadUser(); // Refresh full user data
      return { error: null };
    } catch (error: any) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    try {
      await apiClient.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setUser(null);
    }
  };

  const refreshUser = async () => {
    await loadUser();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
