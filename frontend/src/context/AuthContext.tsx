import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, UserRole } from '../types/index.js';
import { api } from '../api/client.js';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('wrs_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('wrs_access_token');
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (token && !user) {
      api
        .get('/auth/me')
        .then((res) => {
          if (res.data.success && res.data.data) {
            setUser(res.data.data);
            localStorage.setItem('wrs_user', JSON.stringify(res.data.data));
          }
        })
        .catch(() => {
          logout();
        });
    }
  }, [token]);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.post('/auth/login', { username, password });
      if (res.data.success) {
        const { access_token, user: userData } = res.data;
        setToken(access_token);
        setUser(userData);
        localStorage.setItem('wrs_access_token', access_token);
        localStorage.setItem('wrs_user', JSON.stringify(userData));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('wrs_access_token');
    localStorage.removeItem('wrs_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
