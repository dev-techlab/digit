import { randomBytes } from 'node:crypto';
import { and, eq, gt, isNull } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import * as s from '@/lib/db/schema';
import { newSessionToken, USER_SESSION_TTL_S } from '@/lib/auth-tokens';

/** 409-style error for duplicate username/registration conflicts. */
export class UserConflictError extends Error {
  status = 409;
  constructor(message: string) {
    super(message);
    this.name = 'UserConflictError';
  }
}

/** Verify username + password; returns the user id or null. */
export async function verifyUserLogin(username: string, password: string): Promise<string | null> {
  const user = await db.query.users.findFirst({ where: (t, { eq }) => eq(t.username, username) });
  if (!user) return null;
  return (await bcrypt.compare(password, user.passwordHash)) ? user.id : null;
}

export interface RegisterUserInput {
  username?: string;
  password?: string;
  phone?: string;
}

/**
 * Register a player. Missing username/password are generated (Quick Register).
 * Creates the user + an empty wallet. Returns any generated credentials so the
 * UI can show them once.
 */
export async function registerUser(
  input: RegisterUserInput
): Promise<{ id: string; username: string; password: string; generated: boolean }> {
  const generated = !input.username || !input.password;
  const username = input.username?.trim() || `player_${randomBytes(3).toString('hex')}`;
  const password = input.password || randomBytes(6).toString('base64url');

  const existing = await db.query.users.findFirst({ where: (t, { eq }) => eq(t.username, username) });
  if (existing) throw new UserConflictError('Username already taken');

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db
    .insert(s.users)
    .values({
      username,
      nickname: username,
      passwordHash,
      phone: input.phone ?? null,
      phoneBound: !!input.phone,
      inviteCode: `DL${randomBytes(4).toString('hex').toUpperCase()}`,
    })
    .returning();
  await db.insert(s.wallets).values({ userId: user.id }).onConflictDoNothing();
  return { id: user.id, username, password, generated };
}

/** Create a user session and return the opaque token. */
export async function createUserSession(userId: string, meta?: { userAgent?: string }) {
  const token = newSessionToken();
  const expiresAt = new Date(Date.now() + USER_SESSION_TTL_S * 1000);
  await db.insert(s.sessions).values({ userId, token, expiresAt, userAgent: meta?.userAgent ?? null });
  return { token, expiresAt };
}

/** Resolve a session token to a user id (unexpired + not revoked). */
export async function userIdForToken(token: string): Promise<string | null> {
  const rows = await db
    .select({ userId: s.sessions.userId })
    .from(s.sessions)
    .where(
      and(
        eq(s.sessions.token, token),
        gt(s.sessions.expiresAt, new Date()),
        isNull(s.sessions.revokedAt)
      )
    )
    .limit(1);
  return rows[0]?.userId ?? null;
}

/** Revoke a single session (logout). */
export async function revokeUserSession(token: string) {
  await db.update(s.sessions).set({ revokedAt: new Date() }).where(eq(s.sessions.token, token));
}

export interface UserProfile {
  id: string;
  username: string;
  nickname: string;
  avatarEmoji: string;
  phoneBound: boolean;
  kycStatus: string;
}

/** Public-safe profile for the authenticated user (never returns the hash). */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const u = await db.query.users.findFirst({
    where: (t, { eq }) => eq(t.id, userId),
    columns: {
      id: true,
      username: true,
      nickname: true,
      avatarEmoji: true,
      phoneBound: true,
      kycStatus: true,
    },
  });
  return u ?? null;
}

/** Find a user id by bound phone (for phone-OTP login). */
export async function userIdByPhone(phone: string): Promise<string | null> {
  const u = await db.query.users.findFirst({
    where: (t, { eq }) => eq(t.phone, phone),
    columns: { id: true },
  });
  return u?.id ?? null;
}
