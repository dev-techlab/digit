/**
 * Live audit: exercises admin login + the RBAC matrix + probes suspected
 * loopholes against the real DB. Read-only except for temporary rows it cleans
 * up. Run: pnpm tsx --env-file=.env.development scripts/audit-live.ts
 */
import { and, eq, gt, isNull } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { db } from '@/lib/db';
import * as s from '@/lib/db/schema';
import { verifyAdminLogin } from '@/lib/admin-service';
import { isSuperAdmin, can } from '@/lib/rbac-core';

// Mirror of lib/admin-auth.ts getAdminIdFromRequest session lookup (that file
// imports `server-only`, which can't load under plain tsx) — including the
// status='active' join added by the suspended-admin fix.
async function adminIdForToken(token: string): Promise<string | null> {
  const rows = await db
    .select({ adminId: s.adminSessions.adminId })
    .from(s.adminSessions)
    .innerJoin(s.admins, eq(s.admins.id, s.adminSessions.adminId))
    .where(
      and(
        eq(s.adminSessions.token, token),
        gt(s.adminSessions.expiresAt, new Date()),
        isNull(s.adminSessions.revokedAt),
        eq(s.admins.status, 'active')
      )
    )
    .limit(1);
  return rows[0]?.adminId ?? null;
}

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail = '') {
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? '✓' : '✗ FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
}

async function main() {
  const admins = await db.select().from(s.admins);
  const roles = await db.select().from(s.roles);
  const perms = await db.select().from(s.permissions);
  console.log(`\nseed: admins=${admins.length} roles=${roles.length} permissions=${perms.length}`);
  if (admins.length === 0) {
    console.log('DB not seeded — run `pnpm db:seed` first.');
    process.exit(2);
  }

  console.log('\n— Admin login —');
  const superId = await verifyAdminLogin('admin@digitlink.mobi', 'admin1234');
  check('super admin login (correct pw)', !!superId);
  check(
    'login rejects wrong password',
    (await verifyAdminLogin('admin@digitlink.mobi', 'nope')) === null
  );
  check(
    'login rejects unknown email',
    (await verifyAdminLogin('ghost@x.com', 'admin1234')) === null
  );

  console.log('\n— Super admin authority (implicit *) —');
  check('isSuperAdmin(super)', await isSuperAdmin(superId!));
  check('super can admins.manage', await can(superId!, 'admins.manage'));
  check('super can settings.manage', await can(superId!, 'settings.manage'));

  console.log('\n— Role scoping (finance / support / admin) —');
  const finId = await verifyAdminLogin('finance@digitlink.mobi', 'admin1234');
  const supId = await verifyAdminLogin('support@digitlink.mobi', 'admin1234');
  const opsId = await verifyAdminLogin('ops@digitlink.mobi', 'admin1234');
  check('finance can orders.read', await can(finId!, 'orders.read'));
  check('finance CANNOT admins.manage', !(await can(finId!, 'admins.manage')));
  check('finance CANNOT settings.manage', !(await can(finId!, 'settings.manage')));
  check('finance CANNOT media.upload', !(await can(finId!, 'media.upload')));
  check('support can users.read', await can(supId!, 'users.read'));
  check('support CANNOT orders.write', !(await can(supId!, 'orders.write')));
  check('admin(ops) can media.upload', await can(opsId!, 'media.upload'));
  check(
    'admin(ops) CANNOT admins.manage (reserved for super)',
    !(await can(opsId!, 'admins.manage'))
  );

  console.log('\n— Deny-wins —');
  const ordersRead = perms.find((p) => p.key === 'orders.read')!;
  await db
    .insert(s.adminPermissions)
    .values({ adminId: finId!, permissionId: ordersRead.id, effect: 'deny' })
    .onConflictDoUpdate({
      target: [s.adminPermissions.adminId, s.adminPermissions.permissionId],
      set: { effect: 'deny' },
    });
  check('direct deny overrides role grant', !(await can(finId!, 'orders.read')));
  await db
    .delete(s.adminPermissions)
    .where(
      and(
        eq(s.adminPermissions.adminId, finId!),
        eq(s.adminPermissions.permissionId, ordersRead.id)
      )
    );

  console.log('\n— Suspended-admin fix (loophole must be CLOSED) —');
  const token = 'audit-' + randomUUID();
  await db.insert(s.adminSessions).values({
    adminId: finId!,
    token,
    expiresAt: new Date(Date.now() + 3600_000),
  });
  check('active admin session resolves before suspend', (await adminIdForToken(token)) === finId!);
  await db.update(s.admins).set({ status: 'suspended' }).where(eq(s.admins.id, finId!));
  try {
    const after = await adminIdForToken(token);
    const canAfter = await can(finId!, 'orders.write');
    check('suspended admin session is REJECTED', after === null, `resolves=${after ?? 'null'}`);
    check('suspended admin can() is DENIED', !canAfter, 'orders.write');
  } finally {
    await db.update(s.admins).set({ status: 'active' }).where(eq(s.admins.id, finId!));
    await db.delete(s.adminSessions).where(eq(s.adminSessions.token, token));
  }

  console.log('\n— User side —');
  const demo = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.username, 'player_2481'),
  });
  check('demo user seeded (player_2481)', !!demo);
  console.log('  NOTE: no user login service/route exists — user auth is the frontend mock.');

  console.log(
    `\n${fail === 0 ? '✓ all' : `✗ ${fail} of ${pass + fail}`} assertions ${fail === 0 ? 'passed' : 'FAILED'} (${pass} passed).`
  );
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('audit-live error:', err);
  process.exit(1);
});
