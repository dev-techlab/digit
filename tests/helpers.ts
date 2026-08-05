import { db } from '@/lib/db';

/** All test-created admins use this email prefix so cleanup is reliable. */
export const TEST_PREFIX = 'vitest-';

export async function cleanupTestAdmins() {
  await db.admins.deleteMany({
    where: { email: { startsWith: TEST_PREFIX } },
  });
}

export async function permIdByKey(key: string): Promise<string> {
  const p = await db.permissions.findFirst({ where: { key } });
  if (!p) throw new Error(`permission ${key} missing — run pnpm db:seed`);
  return p.id;
}

export async function allPermissionKeys(): Promise<string[]> {
  const perms = await db.permissions.findMany({ select: { key: true } });
  return perms.map((r: any) => r.key);
}

/** True if the seed data is present (tests are integration tests, they need it). */
export async function requireSeed() {
  const player = await db.users.findFirst({
    where: { username: 'player_2481' },
  });
  if (!player) {
    throw new Error('Seed data missing — run `pnpm db:migrate && pnpm db:seed` before testing.');
  }
}
