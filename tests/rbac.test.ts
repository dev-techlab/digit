import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '@/lib/db';
import * as s from '@/lib/db/schema';
import { can, effectivePermissions, isSuperAdmin } from '@/lib/rbac-core';
import { createAdmin, assignRole, removeRole } from '@/lib/admin-service';
import { cleanupTestAdmins, permIdByKey, allPermissionKeys } from './helpers';

const set = (a: string[]) => new Set(a);

let allKeys: string[];
const id: Record<string, string> = {};

const EXPECT: Record<string, string[]> = {
  finance: [
    'orders.read', 'orders.write', 'transactions.read', 'transactions.write',
    'redemption_reviews.read', 'redemption_reviews.write', 'users.read', 'wallets.read',
    'audit_logs.read',
  ],
  content: [
    'content_pages.read', 'content_pages.write', 'banners.read', 'banners.write',
    'banners.delete', 'media.upload', 'media.delete', 'settings.read', 'social_links.manage',
  ],
  support: [
    'users.read', 'kyc.read', 'support_tickets.read', 'support_tickets.write',
    'postal_requests.read', 'postal_requests.write', 'orders.read',
  ],
};

beforeAll(async () => {
  await cleanupTestAdmins();
  allKeys = await allPermissionKeys();
  EXPECT.admin = allKeys.filter(
    (k) => !['admins.manage', 'roles.manage', 'permissions.manage'].includes(k)
  );
  for (const role of ['finance', 'content', 'support', 'admin', 'super_admin']) {
    const { id: adminId } = await createAdmin({
      username: `vitest_rbac_${role}`,
      email: `vitest-rbac-${role}@test.local`,
      password: 'x',
      roleSlugs: [role],
    });
    id[role] = adminId;
  }
});

afterAll(cleanupTestAdmins);

describe('effective permissions match the seed design (§7.5)', () => {
  it('finance → 9 perms', async () =>
    expect(set(await effectivePermissions(id.finance))).toEqual(set(EXPECT.finance)));
  it('content → 9 perms', async () =>
    expect(set(await effectivePermissions(id.content))).toEqual(set(EXPECT.content)));
  it('support → 7 perms', async () =>
    expect(set(await effectivePermissions(id.support))).toEqual(set(EXPECT.support)));
  it('admin → everything except the 3 access-mgmt perms', async () =>
    expect(set(await effectivePermissions(id.admin))).toEqual(set(EXPECT.admin)));
});

describe('super admin is the super_admin ROLE (dynamic, not a flag)', () => {
  it('resolves ALL permissions', async () =>
    expect(set(await effectivePermissions(id.super_admin))).toEqual(set(allKeys)));
  it('isSuperAdmin() true', async () =>
    expect(await isSuperAdmin(id.super_admin)).toBe(true));
  it('can("admins.manage") + can("permissions.manage")', async () => {
    expect(await can(id.super_admin, 'admins.manage')).toBe(true);
    expect(await can(id.super_admin, 'permissions.manage')).toBe(true);
  });
  it('removing the role revokes super access; re-adding restores it', async () => {
    await removeRole(id.super_admin, 'super_admin');
    expect(await isSuperAdmin(id.super_admin)).toBe(false);
    expect(await can(id.super_admin, 'admins.manage')).toBe(false);
    await assignRole(id.super_admin, 'super_admin');
    expect(await can(id.super_admin, 'admins.manage')).toBe(true);
  });
});

describe('can() allows granted, denies ungranted', () => {
  it('finance', async () => {
    expect(await can(id.finance, 'orders.write')).toBe(true);
    expect(await can(id.finance, 'banners.delete')).toBe(false);
    expect(await can(id.finance, 'admins.manage')).toBe(false);
  });
  it('admin', async () => {
    expect(await can(id.admin, 'bonuses.delete')).toBe(true);
    expect(await can(id.admin, 'roles.manage')).toBe(false);
  });
});

describe('direct per-admin overrides (allow adds, deny wins)', () => {
  let ovId: string;
  beforeAll(async () => {
    const { id: adminId } = await createAdmin({
      username: 'vitest_rbac_override',
      email: 'vitest-rbac-override@test.local',
      password: 'x',
      roleSlugs: ['support'],
    });
    ovId = adminId;
    await db.insert(s.adminPermissions).values({
      adminId: ovId,
      permissionId: await permIdByKey('bonuses.write'),
      effect: 'allow',
    });
    await db.insert(s.adminPermissions).values({
      adminId: ovId,
      permissionId: await permIdByKey('users.read'), // support HAS this via role
      effect: 'deny',
    });
  });

  it('direct allow grants a new permission', async () =>
    expect(await can(ovId, 'bonuses.write')).toBe(true));
  it('direct deny removes a role-granted permission (deny wins)', async () =>
    expect(await can(ovId, 'users.read')).toBe(false));
  it('unrelated role permission is unaffected', async () =>
    expect(await can(ovId, 'kyc.read')).toBe(true));
  it('effective set = support ∪ {allow} − {deny}', async () => {
    const expected = [...EXPECT.support.filter((k) => k !== 'users.read'), 'bonuses.write'];
    expect(set(await effectivePermissions(ovId))).toEqual(set(expected));
  });
});
