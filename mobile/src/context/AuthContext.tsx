import React, { createContext, useContext, useEffect, useState } from 'react';
import { getUser, setUser as persistUser, type StoredUser } from '../storage';

type AuthState = {
  user: StoredUser | null;
  isLoading: boolean;
  error: string | null;
};

type AuthContextValue = AuthState & {
  setUser: (user: StoredUser | null) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<StoredUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getUser()
      .then((u) => {
        if (!cancelled) setUserState(u);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setUser = async (u: StoredUser | null) => {
    await persistUser(u);
    setUserState(u);
    setError(null);
  };

  const signOut = async () => {
    try {
      await persistUser(null);
    } finally {
      setUserState(null);
      setError(null);
    }
  };

  const clearError = () => setError(null);

  const value: AuthContextValue = {
    user,
    isLoading,
    error,
    setUser,
    signOut,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
