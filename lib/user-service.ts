import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { newSessionToken, USER_SESSION_TTL_S } from '@/lib/auth-tokens';
import { Prisma } from '../lib/generated/prisma/client';

/** 409-style error for duplicate username/registration conflicts. */
export class UserConflictError extends Error {
  status = 409;
  constructor(message: string) {
    super(message);
    this.name = 'UserConflictError';
  }
}

export async function verifyUserLogin(username: string, password: string): Promise<string | null> {
  const user = await db.users.findFirst({ where: { username } });
  if (!user || user.status !== 'active') return null;
  // if (user.email && !user.emailVerified) return null;
  if (user.phone && !user.phone_bound) return null;
  return (await bcrypt.compare(password, user.password_hash)) ? user.id : null;
}

export interface RegisterUserInput {
  username?: string;
  password?: string;
  email?: string;
  phone?: string;
  inviteCode?: string;
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

  const existing = await db.users.findFirst({ where: { username } });
  if (existing) throw new UserConflictError('Username already taken');

  let agentId = null;
  let usedInviteCode = null;
  if (input.inviteCode?.trim()) {
    const agent = await db.agents.findFirst({
      where: { invite_code: input.inviteCode.trim() },
      select: { id: true, invite_code: true },
    });
    if (!agent) throw new UserConflictError('Invalid invite code');
    agentId = agent.id;
    usedInviteCode = agent.invite_code;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  let user: any;
  try {
    user = await db.users.create({
      data: {
        username,
        nickname: username,
        password_hash: passwordHash,
        email: input.email ?? null,
        phone: input.phone ?? null,
        phone_bound: !!input.phone,
        invite_code: `DL${randomBytes(4).toString('hex').toUpperCase()}`,
        agent_invite_code: usedInviteCode,
      },
    });
  } catch (err: any) {
    if (err.code === 'P2002') throw new UserConflictError('Username already taken');
    throw err;
  }
  
  try {
    await db.wallets.create({ data: { user_id: user.id } });
  } catch (e: any) {
    // Ignore P2002 unique constraint error if wallet somehow exists
  }

  // Background player creation for Blackmamba
  const bmKeyAgent = process.env.BLACKMAMBA_KEY_AGENT;
  const bmApiKey = process.env.BLACKMAMBA_API_KEY;

  if (bmKeyAgent && bmApiKey) {
    import('./blackmamba-api').then(({ createBlackmambaPlayer }) => {
      createBlackmambaPlayer(
        {
          // Fall back to keyAgent if no specific agent code was used
          agent: usedInviteCode || bmKeyAgent,
          userPwd: password,
        },
        bmKeyAgent,
        bmApiKey
      )
        .then(async (bmRes) => {
          if (bmRes.success && bmRes.account) {
            try {
              // 18 is the Black Mamba provider ID from providers.sc.json
              await db.user_provider_accounts.upsert({
                where: {
                  user_id_provider_id: {
                    user_id: user.id,
                    provider_id: 18,
                  },
                },
                update: {
                  game_username: bmRes.account,
                  game_password_enc: bmRes.password || password,
                  initialized: true,
                },
                create: {
                  user_id: user.id,
                  provider_id: 18,
                  game_username: bmRes.account,
                  game_password_enc: bmRes.password || password,
                  balance: 0,
                  initialized: true,
                },
              });
            } catch (dbErr) {
              console.error(`[Blackmamba] Failed to save DB account for user ${user.id}:`, dbErr);
            }
          }
        })
        .catch((err) => {
          console.error(`[Blackmamba] Background player creation failed for user ${user.id}:`, err);
        });
    });
  }

  return { id: user.id, username, password, generated };
}

/** Create a user session and return the opaque token. */
export async function createUserSession(userId: string, meta?: { userAgent?: string }) {
  const token = newSessionToken();
  const expiresAt = new Date(Date.now() + USER_SESSION_TTL_S * 1000);
  await db.sessions.create({
    data: { user_id: userId, token, expires_at: expiresAt, user_agent: meta?.userAgent ?? null },
  });
  return { token, expiresAt };
}

/** Resolve a session token to a user id (unexpired, not revoked, account active). */
export async function userIdForToken(token: string): Promise<string | null> {
  const session = await db.sessions.findFirst({
    where: {
      token,
      expires_at: { gt: new Date() },
      revoked_at: null,
      users: { status: 'active' },
    },
    select: { user_id: true },
  });
  return session?.user_id ?? null;
}

/** Revoke a single session (logout). */
export async function revokeUserSession(token: string) {
  await db.sessions.updateMany({
    where: { token },
    data: { revoked_at: new Date() },
  });
}

export interface UserProfile {
  id: string;
  username: string;
  nickname: string;
  avatarEmoji: string;
  avatarUrl: string | null;
  phoneBound: boolean;
  kycStatus: string;
  pwaInstalled: boolean;
  usedInviteCode: string | null;
}

/** Public-safe profile for the authenticated user (never returns the hash). */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const u = await db.users.findFirst({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      nickname: true,
      avatar_emoji: true,
      avatar_url: true,
      phone_bound: true,
      kyc_status: true,
      pwa_installed: true,
    },
  });
  
  if (!u) return null;
  
  return {
    id: u.id,
    username: u.username,
    nickname: u.nickname,
    avatarEmoji: u.avatar_emoji,
    avatarUrl: u.avatar_url,
    phoneBound: u.phone_bound,
    kycStatus: u.kyc_status,
    pwaInstalled: u.pwa_installed,
    usedInviteCode: null,
  };
}

/** Find a user id by bound phone (for phone-OTP login). */
export async function userIdByPhone(phone: string): Promise<string | null> {
  const u = await db.users.findFirst({
    where: { phone },
    select: { id: true },
  });
  return u?.id ?? null;
}

/** Set a new password (post OTP-verified reset). Revokes existing sessions. */
export async function setUserPassword(userId: string, newPassword: string): Promise<void> {
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.users.update({
    where: { id: userId },
    data: { password_hash: passwordHash },
  });
  await revokeUserSessions(userId);
}

/** Revoke every active session for a user (immediate logout everywhere). */
export async function revokeUserSessions(userId: string): Promise<void> {
  await db.sessions.updateMany({
    where: { user_id: userId, revoked_at: null },
    data: { revoked_at: new Date() },
  });
}

/** Block a player account: prevents new logins AND kills existing sessions. */
export async function blockUser(userId: string): Promise<void> {
  await db.users.update({
    where: { id: userId },
    data: { status: 'blocked' },
  });
  await revokeUserSessions(userId);
}

/** Re-activate a blocked player account (does not restore revoked sessions). */
export async function unblockUser(userId: string): Promise<void> {
  await db.users.update({
    where: { id: userId },
    data: { status: 'active' },
  });
}
