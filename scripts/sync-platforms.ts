/**
 * Sync the `game_platforms` catalog from the live Digit Link provider API
 * (`PROVIDER_API_BASE_URL`, both SC and GC lists). Falls back to the committed
 * snapshots in data/providers.{sc,gc}.json when the API is unreachable.
 *
 * Matching is by normalized name (case/punctuation-insensitive) so the rows
 * seeded from the Game Setting screenshots are enriched in place — real icon
 * URLs, provider codes, launch URLs, types and sort order — instead of being
 * duplicated. Providers not yet in the DB are inserted.
 *
 *   pnpm platforms:sync
 */
import './load-env';
import fs from 'node:fs/promises';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as s from '@/lib/db/schema';

interface ApiProvider {
  id: number;
  name: string;
  providerCode: string;
  launchUrlTemplate: string | null;
  iconUrl: string | null;
  status: number;
  sort: number;
  providerType: 'SC' | 'GC';
}

const ENDPOINT =
  process.env.PROVIDER_API_BASE_URL ??
  'https://digitlink.mobi/prod-api/member/game/available-providers';

const normalize = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '');
const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

async function fetchProviders(type: 'SC' | 'GC'): Promise<ApiProvider[]> {
  try {
    const res = await fetch(`${ENDPOINT}?inviteCode=&providerType=${type}`, {
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as { data?: ApiProvider[] };
    const list = json.data ?? [];
    console.log(`✓ live API: ${list.length} ${type} providers`);
    return list;
  } catch (err) {
    const file = path.join(process.cwd(), 'data', `providers.${type.toLowerCase()}.json`);
    const list = JSON.parse(await fs.readFile(file, 'utf8')) as ApiProvider[];
    console.log(
      `! live API unavailable (${(err as Error).message}) → cached ${file} (${list.length} ${type})`
    );
    return list;
  }
}

async function main() {
  const [sc, gc] = await Promise.all([fetchProviders('SC'), fetchProviders('GC')]);

  // SC entries win on duplicate providerCode (agent panel deals in SC platforms).
  const byCode = new Map<string, ApiProvider>();
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
        .set({ ...values, name: p.name }) // adopt the API's canonical name
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
  console.log(`✓ synced: ${updated} updated, ${inserted} inserted, ${total.length} total`);
  console.log(
    `  (${existing.length - updated} pre-seeded rows had no API match and were left untouched)`
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
