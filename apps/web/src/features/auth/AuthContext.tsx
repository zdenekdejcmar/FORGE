import { createContext, useContext, useEffect, useMemo, useState } from 'react';

type AuthContextValue = {
  token: string | null;
  user: { id: string; email: string } | null;
  login: (token: string, user: { id: string; email: string }) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const storage = typeof window !== 'undefined' ? window.localStorage : undefined;
  const [token, setToken] = useState<string | null>(storage?.getItem('forge-token') ?? null);
  const [user, setUser] = useState<{ id: string; email: string } | null>(() => {
    const value = storage?.getItem('forge-user');
    return value ? JSON.parse(value) : null;
  });

  useEffect(() => {
    if (storage && token) {
      storage.setItem('forge-token', token);
    } else if (storage) {
      storage.removeItem('forge-token');
    }
  }, [storage, token]);

  useEffect(() => {
    if (storage && user) {
      storage.setItem('forge-user', JSON.stringify(user));
    } else if (storage) {
      storage.removeItem('forge-user');
    }
  }, [storage, user]);

  const value = useMemo<AuthContextValue>(() => ({
    token,
    user,
    login: (nextToken, nextUser) => {
      setToken(nextToken);
      setUser(nextUser);
    },
    logout: () => {
      setToken(null);
      setUser(null);
    },
  }), [token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
