import { randomBytes } from 'node:crypto';

/** Session cookie names + lifetimes shared by the admin and user auth flows. */
export const ADMIN_SESSION_COOKIE = 'admin_session';
export const USER_SESSION_COOKIE = 'session';
export const ADMIN_SESSION_TTL_S = 7 * 24 * 60 * 60; // 7 days
export const USER_SESSION_TTL_S = 30 * 24 * 60 * 60; // 30 days

/** High-entropy, URL-safe opaque session token (not a UUID). */
export function newSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Hardened cookie attributes. `maxAge` in seconds (0 clears). */
export function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}
