import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';

/** Slug of the built-in role that grants full access. */
export const SUPER_ADMIN_ROLE = 'super_admin';

/**
 * Is this admin a super admin? Derived purely from having the `super_admin`
 * role assigned (admin_roles) — no static column. Assign/remove the role to
 * grant/revoke, via lib/admin-service.
 */
export async function isSuperAdmin(adminId: string): Promise<boolean> {
  const rows = await db.execute<{ ok: boolean }>(sql`
    SELECT EXISTS (
      SELECT 1 FROM admin_roles ar
      JOIN roles r ON r.id = ar.role_id
      JOIN admins a ON a.id = ar.admin_id
      WHERE ar.admin_id = ${adminId} AND a.status = 'active' AND r.slug = ${SUPER_ADMIN_ROLE}
    ) AS ok
  `);
  return rows[0]?.ok === true;
}

/**
 * Effective-permission check for a back-office admin (DB_DIAGRAM §7.2).
 * A member of the `super_admin` role → always true (implicit `*`). Otherwise:
 * granted by a role OR a direct allow, and NOT directly denied (deny wins).
 */
export async function can(adminId: string, permKey: string): Promise<boolean> {
  const rows = await db.execute<{ ok: boolean }>(sql`
    SELECT EXISTS (
      SELECT 1 FROM admins a WHERE a.id = ${adminId} AND a.status = 'active' AND (
        EXISTS (
          SELECT 1 FROM admin_roles ar
          JOIN roles r ON r.id = ar.role_id
          WHERE ar.admin_id = a.id AND r.slug = ${SUPER_ADMIN_ROLE}
        )
        OR (
          (
            EXISTS (
              SELECT 1 FROM admin_roles ar
              JOIN role_permissions rp ON rp.role_id = ar.role_id
              JOIN permissions p ON p.id = rp.permission_id
              WHERE ar.admin_id = a.id AND p.key = ${permKey}
            ) OR EXISTS (
              SELECT 1 FROM admin_permissions ap
              JOIN permissions p ON p.id = ap.permission_id
              WHERE ap.admin_id = a.id AND ap.effect = 'allow' AND p.key = ${permKey}
            )
          ) AND NOT EXISTS (
            SELECT 1 FROM admin_permissions ap
            JOIN permissions p ON p.id = ap.permission_id
            WHERE ap.admin_id = a.id AND ap.effect = 'deny' AND p.key = ${permKey}
          )
        )
      )
    ) AS ok
  `);
  return rows[0]?.ok === true;
}

/** Throw (→ 403 in a route handler) unless the admin holds the permission. */
export async function requirePermission(adminId: string, permKey: string): Promise<void> {
  if (!(await can(adminId, permKey))) {
    throw new PermissionError(permKey);
  }
}

export class PermissionError extends Error {
  status = 403;
  constructor(public permKey: string) {
    super(`Forbidden: missing permission "${permKey}"`);
    this.name = 'PermissionError';
  }
}

/** All effective permission keys for an admin (for building the UI / a token). */
export async function effectivePermissions(adminId: string): Promise<string[]> {
  const rows = await db.execute<{ key: string }>(sql`
    WITH me AS (
      SELECT
        EXISTS (
          SELECT 1 FROM admins a WHERE a.id = ${adminId} AND a.status = 'active'
        ) AS is_active,
        EXISTS (
          SELECT 1 FROM admin_roles ar
          JOIN roles r ON r.id = ar.role_id
          WHERE ar.admin_id = ${adminId} AND r.slug = ${SUPER_ADMIN_ROLE}
        ) AS is_super
    )
    SELECT p.key
    FROM permissions p
    WHERE (SELECT is_active FROM me) AND (
       (SELECT is_super FROM me)
       OR (
         (
           p.id IN (
             SELECT rp.permission_id FROM admin_roles ar
             JOIN role_permissions rp ON rp.role_id = ar.role_id
             WHERE ar.admin_id = ${adminId}
           ) OR p.id IN (
             SELECT ap.permission_id FROM admin_permissions ap
             WHERE ap.admin_id = ${adminId} AND ap.effect = 'allow'
           )
         ) AND p.id NOT IN (
           SELECT ap.permission_id FROM admin_permissions ap
           WHERE ap.admin_id = ${adminId} AND ap.effect = 'deny'
         )
       )
    )
  `);
  return rows.map((r) => r.key);
}
