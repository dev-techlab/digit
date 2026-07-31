'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
  ReactNode,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';

/** Player profile as returned by /api/auth/{me,login,register,otp/verify} (lib/user-service.ts#getUserProfile). */
export interface MockUser {
  username: string;
  nickname: string;
  avatarUrl: string | null;
  avatarEmoji: string;
  phoneBound: boolean;
  kycStatus: 'unverified' | 'pending' | 'verified' | 'rejected';
  pwaInstalled: boolean;
  usedInviteCode: string | null;
}

interface AuthContextValue {
  isAuthenticated: boolean;
  /** True until the initial /api/auth/me check resolves. */
  isLoading: boolean;
  user: MockUser | null;
  /** Called by Login/Register/OTP-verify modals with the profile the API just returned. */
  setUser: (user: MockUser) => void;
  logout: () => Promise<void>;
  /**
   * Local-only optimistic patch (avatar edit, bind-phone, KYC/PWA completion
   * flows aren't wired to a persistence endpoint yet — this matches their
   * prior mock behavior). A page refresh reflects real DB state, not this.
   */
  updateProfile: (patch: Partial<MockUser>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUserState] = useState<MockUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetched = useRef(false);

  useEffect(() => {
    // Only fetch player auth on player-facing routes
    if (pathname.startsWith('/admin') || pathname.startsWith('/agent')) {
      setIsLoading(false);
      return;
    }

    if (fetched.current) return;
    fetched.current = true;

    let cancelled = false;
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setUserState(data?.user ?? null);
      })
      .catch(() => {
        if (!cancelled) setUserState(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  // Login/register/OTP-verify hand us the freshly-authenticated profile, but
  // wallet/orders/bonus/etc. are Server-Component data keyed off the session
  // cookie — refresh() re-renders them now that the cookie is actually set,
  // instead of leaving them showing whatever an anonymous visitor sees until
  // the next full navigation.
  const setUser = useCallback(
    (u: MockUser) => {
      setUserState(u);
      router.refresh();
    },
    [router]
  );

  const logout = useCallback(async () => {
    setUserState(null);
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    router.refresh();
  }, [router]);

  const updateProfile = useCallback((patch: Partial<MockUser>) => {
    setUserState((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: !!user,
      isLoading,
      user,
      setUser,
      logout,
      updateProfile,
    }),
    [user, isLoading, setUser, logout, updateProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
