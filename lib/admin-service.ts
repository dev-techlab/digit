import { and, eq, isNull } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import * as s from '@/lib/db/schema';
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
  const role = await db.query.roles.findFirst({ where: (t, { eq }) => eq(t.slug, roleSlug) });
  return role?.level ?? 0;
}

async function maxRoleLevel(adminId: string): Promise<number> {
  const rows = await db
    .select({ level: s.roles.level })
    .from(s.adminRoles)
    .innerJoin(s.roles, eq(s.roles.id, s.adminRoles.roleId))
    .where(eq(s.adminRoles.adminId, adminId));
  return rows.reduce((m, r) => Math.max(m, r.level), 0);
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
  const role = await db.query.roles.findFirst({ where: (t, { eq }) => eq(t.slug, slug) });
  if (!role) throw new Error(`Role "${slug}" does not exist`);
  return role.id;
}

/** Create an admin (idempotent on email or username) and assign the given roles. */
export async function createAdmin(input: CreateAdminInput) {
  const existing = await db.query.admins.findFirst({
    where: (t, { eq, or }) => or(eq(t.email, input.email), eq(t.username, input.username)),
  });

  let adminId: string;
  if (existing) {
    adminId = existing.id;
    if (input.resetPasswordIfExists) await setPassword(adminId, input.password);
  } else {
    const passwordHash = await bcrypt.hash(input.password, 10);
    const [row] = await db
      .insert(s.admins)
      .values({
        username: input.username,
        email: input.email,
        passwordHash,
        createdByAdminId: input.createdByAdminId ?? null,
      })
      .returning();
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
  await db
    .insert(s.adminRoles)
    .values({ adminId, roleId, assignedByAdminId: assignedByAdminId ?? null })
    .onConflictDoNothing();
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
  await db
    .delete(s.adminRoles)
    .where(and(eq(s.adminRoles.adminId, adminId), eq(s.adminRoles.roleId, roleId)));
}

/** The slugs of every role an admin holds. */
export async function rolesForAdmin(adminId: string): Promise<string[]> {
  const rows = await db
    .select({ slug: s.roles.slug })
    .from(s.adminRoles)
    .innerJoin(s.roles, eq(s.roles.id, s.adminRoles.roleId))
    .where(eq(s.adminRoles.adminId, adminId));
  return rows.map((r) => r.slug);
}

/** Reset an admin's password and revoke their active sessions. */
export async function setPassword(adminId: string, password: string, actorAdminId?: string) {
  if (actorAdminId) await guardAdminAction(actorAdminId, adminId);
  const passwordHash = await bcrypt.hash(password, 10);
  await db.update(s.admins).set({ passwordHash }).where(eq(s.admins.id, adminId));
  await revokeAdminSessions(adminId);
}

/** Revoke every active session for an admin (immediate logout everywhere). */
export async function revokeAdminSessions(adminId: string) {
  await db
    .update(s.adminSessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(s.adminSessions.adminId, adminId), isNull(s.adminSessions.revokedAt)));
}

/** Suspend an admin: blocks new logins AND kills existing sessions. */
export async function suspendAdmin(adminId: string, actorAdminId?: string) {
  if (actorAdminId) await guardAdminAction(actorAdminId, adminId);
  await db.update(s.admins).set({ status: 'suspended' }).where(eq(s.admins.id, adminId));
  await revokeAdminSessions(adminId);
}

/** Re-activate a suspended admin (does not restore revoked sessions). */
export async function reactivateAdmin(adminId: string, actorAdminId?: string) {
  if (actorAdminId) await guardAdminAction(actorAdminId, adminId);
  await db.update(s.admins).set({ status: 'active' }).where(eq(s.admins.id, adminId));
}

/** Verify credentials for admin login; returns the admin id or null. */
export async function verifyAdminLogin(email: string, password: string): Promise<string | null> {
  const admin = await db.query.admins.findFirst({ where: (t, { eq }) => eq(t.email, email) });
  if (!admin || admin.status !== 'active') return null;
  return (await bcrypt.compare(password, admin.passwordHash)) ? admin.id : null;
}

/** Create an admin session (opaque token) and stamp last_login_at. */
export async function createAdminSession(adminId: string, meta?: { userAgent?: string }) {
  const token = newSessionToken();
  const expiresAt = new Date(Date.now() + ADMIN_SESSION_TTL_S * 1000);
  await db
    .insert(s.adminSessions)
    .values({ adminId, token, expiresAt, userAgent: meta?.userAgent ?? null });
  await db.update(s.admins).set({ lastLoginAt: new Date() }).where(eq(s.admins.id, adminId));
  return { token, expiresAt };
}

/** Revoke a single admin session by its token (logout). */
export async function revokeAdminSessionByToken(token: string) {
  await db.update(s.adminSessions).set({ revokedAt: new Date() }).where(eq(s.adminSessions.token, token));
}
