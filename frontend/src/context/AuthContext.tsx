import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import * as api from '../api/client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<User>;
  signup: (data: { name: string; email: string; password: string }) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async (): Promise<User | null> => {
    try {
      const currentUser = await api.getMe();
      setUser(currentUser);
      return currentUser;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
    const expired = () => setUser(null);
    window.addEventListener('stocksense:session-expired', expired);
    return () => window.removeEventListener('stocksense:session-expired', expired);
  }, [refreshUser]);

  const handleLogin = async (credentials: { email: string; password: string }): Promise<User> => {
    const loggedInUser = await api.login(credentials);
    window.location.hash = 'dashboard';
    setUser(loggedInUser);
    return loggedInUser;
  };

  const handleSignup = async (data: { name: string; email: string; password: string }): Promise<User> => {
    const newUser = await api.signup(data);
    window.location.hash = 'dashboard';
    setUser(newUser);
    return newUser;
  };

  const handleLogout = async (): Promise<void> => {
    try {
      await api.logout();
      setUser(null);
    } catch {
      window.alert('Sign out failed. Check your connection and try again.');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login: handleLogin,
        signup: handleSignup,
        logout: handleLogout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
