import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/types';
import { apiRequest } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('hadir_token');
    if (token) {
      apiRequest('/auth/me')
        .then(data => {
          if (data.success) {
            setUser(data.user);
          } else {
            localStorage.removeItem('hadir_token');
          }
        })
        .catch(() => {
          localStorage.removeItem('hadir_token');
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (identifier: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);

    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password }),
      });

      if (data.success) {
        setUser(data.user);
        localStorage.setItem('hadir_token', data.token);
        localStorage.setItem('hadir_user', JSON.stringify(data.user));
        setIsLoading(false);
        return { success: true };
      } else {
        setIsLoading(false);
        return { success: false, error: data.message || 'فشل تسجيل الدخول' };
      }
    } catch (error: any) {
      setIsLoading(false);
      // apiRequest throws the parsed error JSON on non-ok (4xx/5xx) responses
      if (error && typeof error === 'object' && error.message) {
        return { success: false, error: error.message };
      }
      return { success: false, error: 'خطأ في الشبكة، تأكد من أن الخادم يعمل وحاول مرة أخرى' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('hadir_user');
    localStorage.removeItem('hadir_token');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
