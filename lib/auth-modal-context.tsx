'use client';

import { createContext, useContext, useMemo, useState, ReactNode } from 'react';

export type AuthModalMode = 'login' | 'register' | 'reset' | null;

interface AuthModalContextValue {
  mode: AuthModalMode;
  open: (mode: Exclude<AuthModalMode, null>) => void;
  close: () => void;
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AuthModalMode>(null);

  const value = useMemo<AuthModalContextValue>(
    () => ({
      mode,
      open: (m) => setMode(m),
      close: () => setMode(null),
    }),
    [mode]
  );

  return <AuthModalContext.Provider value={value}>{children}</AuthModalContext.Provider>;
}

export function useAuthModal() {
  const ctx = useContext(AuthModalContext);
  if (!ctx) throw new Error('useAuthModal must be used within AuthModalProvider');
  return ctx;
}
