import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createAdmin,
  assignRole,
  removeRole,
  rolesForAdmin,
  setPassword,
  verifyAdminLogin,
} from '@/lib/admin-service';
import { isSuperAdmin } from '@/lib/rbac-core';
import { db } from '@/lib/db';
import * as s from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { cleanupTestAdmins } from './helpers';

const EMAIL = 'vitest-svc@test.local';

beforeAll(cleanupTestAdmins);
afterAll(cleanupTestAdmins);

describe('createAdmin', () => {
  it('creates an admin and assigns roles', async () => {
    const { id, created } = await createAdmin({
      username: 'vitest_svc',
      email: EMAIL,
      password: 'secret123',
      roleSlugs: ['finance', 'support'],
    });
    expect(created).toBe(true);
    expect(await rolesForAdmin(id)).toEqual(expect.arrayContaining(['finance', 'support']));
  });

  it('is idempotent on email (adds missing roles, does not duplicate)', async () => {
    const { id, created } = await createAdmin({
      username: 'vitest_svc',
      email: EMAIL,
      password: 'secret123',
      roleSlugs: ['content'],
    });
    expect(created).toBe(false);
    const roles = await rolesForAdmin(id);
    expect(new Set(roles)).toEqual(new Set(['finance', 'support', 'content']));
    // exactly one admin row for this email
    const rows = await db.select().from(s.admins).where(eq(s.admins.email, EMAIL));
    expect(rows).toHaveLength(1);
  });
});

describe('assignRole / removeRole', () => {
  it('assign is idempotent and remove works', async () => {
    const admin = await db.query.admins.findFirst({ where: (t, { eq }) => eq(t.email, EMAIL) });
    const id = admin!.id;
    await assignRole(id, 'admin');
    await assignRole(id, 'admin'); // no duplicate row
    expect((await rolesForAdmin(id)).filter((r) => r === 'admin')).toHaveLength(1);
    await removeRole(id, 'admin');
    expect(await rolesForAdmin(id)).not.toContain('admin');
  });

  it('assigning an unknown role throws', async () => {
    const admin = await db.query.admins.findFirst({ where: (t, { eq }) => eq(t.email, EMAIL) });
    await expect(assignRole(admin!.id, 'nope')).rejects.toThrow(/does not exist/);
  });
});

describe('super_admin role → isSuperAdmin', () => {
  it('grants and revokes super status dynamically', async () => {
    const { id } = await createAdmin({
      username: 'vitest_svc_super',
      email: 'vitest-svc-super@test.local',
      password: 'secret123',
    });
    expect(await isSuperAdmin(id)).toBe(false);
    await assignRole(id, 'super_admin');
    expect(await isSuperAdmin(id)).toBe(true);
    await removeRole(id, 'super_admin');
    expect(await isSuperAdmin(id)).toBe(false);
  });
});

describe('password + login', () => {
  it('verifyAdminLogin succeeds with correct password, fails otherwise', async () => {
    const admin = await db.query.admins.findFirst({ where: (t, { eq }) => eq(t.email, EMAIL) });
    const id = admin!.id;
    await setPassword(id, 'newpass456');
    expect(await verifyAdminLogin(EMAIL, 'newpass456')).toBe(id);
    expect(await verifyAdminLogin(EMAIL, 'wrong')).toBeNull();
    expect(await verifyAdminLogin('nobody@test.local', 'x')).toBeNull();
  });

  it('suspended admins cannot log in', async () => {
    const admin = await db.query.admins.findFirst({ where: (t, { eq }) => eq(t.email, EMAIL) });
    await db.update(s.admins).set({ status: 'suspended' }).where(eq(s.admins.id, admin!.id));
    expect(await verifyAdminLogin(EMAIL, 'newpass456')).toBeNull();
    await db.update(s.admins).set({ status: 'active' }).where(eq(s.admins.id, admin!.id));
  });
});
