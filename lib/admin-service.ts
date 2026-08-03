import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { isSuperAdmin, can, SUPER_ADMIN_ROLE } from '@/lib/rbac-core';
import { newSessionToken, ADMIN_SESSION_TTL_S } from '@/lib/auth-tokens';

/**
 * Dynamic admin/user management — create admins and assign roles at runtime.
 * Nothing here depends on env vars: super-admin is just the `super_admin` role
 * assigned through assignRole(). Use from the admin panel, the seed, or the
 * `pnpm admin:create` CLI.
 */

export interface CreateAdminInput {
  username: string;
  email: string;
  password: string;
  roleSlugs?: string[];
  createdByAdminId?: string | null;
  /** When the email already exists, rotate its password to `password`. */
  resetPasswordIfExists?: boolean;
}

/** 403-style error for privilege/authorization failures in this layer. */
export class AuthzError extends Error {
  status = 403;
  constructor(message: string) {
    super(message);
    this.name = 'AuthzError';
  }
}

async function roleLevel(roleSlug: string): Promise<number> {
  const role = await db.roles.findFirst({ where: { slug: roleSlug } });
  return role?.level ?? 0;
}

async function maxRoleLevel(adminId: string): Promise<number> {
  const rows = await db.admin_roles.findMany({
    where: { admin_id: adminId },
    include: { roles: { select: { level: true } } },
  });
  return rows.reduce((m: number, r: any) => Math.max(m, r.roles?.level ?? 0), 0);
}

/**
 * Guard a role grant performed *by* an actor (skip for trusted server/seed/CLI
 * contexts that pass no actor). Prevents privilege escalation: a non-super
 * actor needs `roles.manage`, can never grant `super_admin`, and can never
 * grant a role at or above their own highest role level.
 */
async function guardRoleGrant(actorId: string, roleSlug: string): Promise<void> {
  if (await isSuperAdmin(actorId)) return;
  if (!(await can(actorId, 'roles.manage'))) {
    throw new AuthzError('Forbidden: "roles.manage" is required to assign roles');
  }
  if (roleSlug === SUPER_ADMIN_ROLE) {
    throw new AuthzError('Forbidden: only a super admin can grant super_admin');
  }
  if ((await roleLevel(roleSlug)) >= (await maxRoleLevel(actorId))) {
    throw new AuthzError('Forbidden: cannot assign a role at or above your own level');
  }
}

export async function roleIdBySlug(slug: string): Promise<string> {
  const role = await db.roles.findFirst({ where: { slug } });
  if (!role) throw new Error(`Role "${slug}" does not exist`);
  return role.id;
}

/** Create an admin (idempotent on email or username) and assign the given roles. */
export async function createAdmin(input: CreateAdminInput) {
  const existing = await db.admins.findFirst({
    where: {
      OR: [{ email: input.email }, { username: input.username }],
    },
  });

  let adminId: string;
  if (existing) {
    adminId = existing.id;
    if (input.resetPasswordIfExists) await setPassword(adminId, input.password);
  } else {
    const passwordHash = await bcrypt.hash(input.password, 10);
    const row = await db.admins.create({
      data: {
        username: input.username,
        email: input.email,
        password_hash: passwordHash,
        created_by_admin_id: input.createdByAdminId ?? null,
      },
    });
    adminId = row.id;
  }

  for (const slug of input.roleSlugs ?? []) {
    await assignRole(adminId, slug, input.createdByAdminId ?? undefined);
  }
  return { id: adminId, created: !existing };
}

/**
 * Assign a role to an admin (idempotent). When `assignedByAdminId` is provided,
 * the grant is authorization-checked (guardRoleGrant); calls with no actor are
 * trusted (server bootstrap / seed / CLI).
 */
export async function assignRole(adminId: string, roleSlug: string, assignedByAdminId?: string) {
  if (assignedByAdminId) await guardRoleGrant(assignedByAdminId, roleSlug);
  const roleId = await roleIdBySlug(roleSlug);
  
  try {
    await db.admin_roles.create({
      data: { admin_id: adminId, role_id: roleId, assigned_by_admin_id: assignedByAdminId ?? null },
    });
  } catch (e: any) {
    if (e.code !== 'P2002') throw e; // Ignore unique constraint if role is already assigned
  }
}

/**
 * Guard an admin-lifecycle action (suspend/reactivate/reset password) performed
 * *by* an actor (skip for trusted server/seed/CLI contexts that pass no actor).
 * Mirrors guardRoleGrant: a non-super actor needs `admins.manage` and can never
 * act on an admin at or above their own highest role level.
 */
async function guardAdminAction(actorAdminId: string, targetAdminId: string): Promise<void> {
  if (await isSuperAdmin(actorAdminId)) return;
  if (!(await can(actorAdminId, 'admins.manage'))) {
    throw new AuthzError('Forbidden: "admins.manage" is required to manage admins');
  }
  if ((await maxRoleLevel(targetAdminId)) >= (await maxRoleLevel(actorAdminId))) {
    throw new AuthzError('Forbidden: cannot act on an admin at or above your own level');
  }
}

/** Remove a role from an admin. When `actorAdminId` is provided, the removal is authorization-checked (guardRoleGrant), same as assignRole. */
export async function removeRole(adminId: string, roleSlug: string, actorAdminId?: string) {
  if (actorAdminId) await guardRoleGrant(actorAdminId, roleSlug);
  const roleId = await roleIdBySlug(roleSlug);
  await db.admin_roles.deleteMany({
    where: { admin_id: adminId, role_id: roleId },
  });
}

/** The slugs of every role an admin holds. */
export async function rolesForAdmin(adminId: string): Promise<string[]> {
  const rows = await db.admin_roles.findMany({
    where: { admin_id: adminId },
    include: { roles: { select: { slug: true } } },
  });
  return rows.map((r: any) => r.roles?.slug).filter(Boolean) as string[];
}

/** Reset an admin's password and revoke their active sessions. */
export async function setPassword(adminId: string, password: string, actorAdminId?: string) {
  if (actorAdminId) await guardAdminAction(actorAdminId, adminId);
  const passwordHash = await bcrypt.hash(password, 10);
  await db.admins.update({
    where: { id: adminId },
    data: { password_hash: passwordHash },
  });
  await revokeAdminSessions(adminId);
}

/** Revoke every active session for an admin (immediate logout everywhere). */
export async function revokeAdminSessions(adminId: string) {
  await db.admin_sessions.updateMany({
    where: { admin_id: adminId, revoked_at: null },
    data: { revoked_at: new Date() },
  });
}

/** Suspend an admin: blocks new logins AND kills existing sessions. */
export async function suspendAdmin(adminId: string, actorAdminId?: string) {
  if (actorAdminId) await guardAdminAction(actorAdminId, adminId);
  await db.admins.update({
    where: { id: adminId },
    data: { status: 'suspended' },
  });
  await revokeAdminSessions(adminId);
}

/** Re-activate a suspended admin (does not restore revoked sessions). */
export async function reactivateAdmin(adminId: string, actorAdminId?: string) {
  if (actorAdminId) await guardAdminAction(actorAdminId, adminId);
  await db.admins.update({
    where: { id: adminId },
    data: { status: 'active' },
  });
}

/** Verify credentials for admin login; returns the admin id or null. */
export async function verifyAdminLogin(email: string, password: string): Promise<string | null> {
  const admin = await db.admins.findFirst({ where: { email } });
  if (!admin || admin.status !== 'active') return null;
  return (await bcrypt.compare(password, admin.password_hash)) ? admin.id : null;
}

/** Create an admin session (opaque token) and stamp last_login_at. */
export async function createAdminSession(adminId: string, meta?: { userAgent?: string }) {
  const token = newSessionToken();
  const expiresAt = new Date(Date.now() + ADMIN_SESSION_TTL_S * 1000);
  await db.admin_sessions.create({
    data: { admin_id: adminId, token, expires_at: expiresAt, user_agent: meta?.userAgent ?? null },
  });
  await db.admins.update({
    where: { id: adminId },
    data: { last_login_at: new Date() },
  });
  return { token, expiresAt };
}

/** Revoke a single admin session by its token (logout). */
export async function revokeAdminSessionByToken(token: string) {
  await db.admin_sessions.updateMany({
    where: { token },
    data: { revoked_at: new Date() },
  });
}
