import { inArray, like, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as s from '@/lib/db/schema';

/** All test-created admins use this email prefix so cleanup is reliable. */
export const TEST_PREFIX = 'vitest-';

export async function cleanupTestAdmins() {
  const rows = await db
    .select({ id: s.admins.id })
    .from(s.admins)
    .where(like(s.admins.email, `${TEST_PREFIX}%`));
  const ids = rows.map((r) => r.id);
  if (ids.length) await db.delete(s.admins).where(inArray(s.admins.id, ids)); // cascades
}

export async function permIdByKey(key: string): Promise<string> {
  const p = await db.query.permissions.findFirst({ where: (t, { eq }) => eq(t.key, key) });
  if (!p) throw new Error(`permission ${key} missing — run pnpm db:seed`);
  return p.id;
}

export async function allPermissionKeys(): Promise<string[]> {
  return (await db.select({ key: s.permissions.key }).from(s.permissions)).map((r) => r.key);
}

/** True if the seed data is present (tests are integration tests, they need it). */
export async function requireSeed() {
  const player = await db.query.users.findFirst({
    where: (t) => eq(t.username, 'player_2481'),
  });
  if (!player) {
    throw new Error('Seed data missing — run `pnpm db:migrate && pnpm db:seed` before testing.');
  }
}
