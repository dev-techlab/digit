/**
 * Seed / refresh the `game_platforms` catalog from the committed snapshots in
 * data/providers.{sc,gc}.json — no network, no live API dependency. Use this to
 * populate the platform catalog offline; the Agent Panel's "Game Platforms"
 * screen then manages it dynamically from the DB.
 *
 * Idempotent — upserts by normalized name (case/punctuation-insensitive), so
 * re-running enriches existing rows in place instead of duplicating them.
 *
 *   pnpm platforms:seed
 */
import './load-env';
import fs from 'node:fs/promises';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as s from '@/lib/db/schema';

interface SnapshotProvider {
  id: number;
  name: string;
  providerCode: string;
  launchUrlTemplate: string | null;
  iconUrl: string | null;
  status: number;
  sort: number;
  providerType: 'SC' | 'GC';
}

const normalize = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '');
const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

async function readSnapshot(type: 'SC' | 'GC'): Promise<SnapshotProvider[]> {
  const file = path.join(process.cwd(), 'data', `providers.${type.toLowerCase()}.json`);
  const list = JSON.parse(await fs.readFile(file, 'utf8')) as SnapshotProvider[];
  console.log(`✓ snapshot ${file}: ${list.length} ${type} providers`);
  return list;
}

async function main() {
  const [sc, gc] = await Promise.all([readSnapshot('SC'), readSnapshot('GC')]);

  // SC entries win on duplicate providerCode (agent panel deals in SC platforms).
  const byCode = new Map<string, SnapshotProvider>();
  for (const p of [...gc, ...sc]) byCode.set(p.providerCode, p);
  const providers = [...byCode.values()];

  const existing = await db.select().from(s.gamePlatforms);
  const byName = new Map(existing.map((row) => [normalize(row.name), row]));
  const now = new Date();

  let updated = 0;
  let inserted = 0;
  for (const p of providers) {
    const values = {
      iconUrl: p.iconUrl,
      externalId: p.id,
      providerCode: p.providerCode,
      providerType: p.providerType,
      launchUrl: p.launchUrlTemplate,
      sort: p.sort,
      isActive: p.status === 1,
      syncedAt: now,
    };
    const match = byName.get(normalize(p.name));
    if (match) {
      await db
        .update(s.gamePlatforms)
        .set({ ...values, name: p.name })
        .where(eq(s.gamePlatforms.id, match.id));
      updated++;
    } else {
      await db
        .insert(s.gamePlatforms)
        .values({ name: p.name, slug: slugify(p.name), ...values })
        .onConflictDoNothing();
      inserted++;
    }
  }

  const total = await db.select({ n: s.gamePlatforms.id }).from(s.gamePlatforms);
  console.log(`✓ seeded from snapshots: ${updated} updated, ${inserted} inserted, ${total.length} total`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
