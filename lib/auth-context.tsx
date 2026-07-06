'use client';

import { createContext, useContext, useMemo, useState, ReactNode } from 'react';

export interface MockUser {
  username: string;
  nickname: string;
  avatarUrl: string | null;
  avatarEmoji: string;
  phoneBound: boolean;
  kycStatus: 'unverified' | 'pending' | 'verified' | 'rejected';
  pwaInstalled: boolean;
}

interface AuthContextValue {
  isAuthenticated: boolean;
  user: MockUser | null;
  login: () => void;
  logout: () => void;
  updateProfile: (patch: Partial<MockUser>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const DEMO_USER: MockUser = {
  username: 'player_2481',
  nickname: 'Lucky Player',
  avatarUrl: null,
  avatarEmoji: '🎰',
  phoneBound: false,
  kycStatus: 'unverified',
  pwaInstalled: false,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<MockUser>(DEMO_USER);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated,
      user: isAuthenticated ? user : null,
      login: () => setIsAuthenticated(true),
      logout: () => setIsAuthenticated(false),
      updateProfile: (patch) => setUser((prev) => ({ ...prev, ...patch })),
    }),
    [isAuthenticated, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
