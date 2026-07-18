// No `server-only` import here (unlike lib/settings.ts) — this is also used
// by standalone CLI scripts (scripts/sync-platforms.ts, fetch-providers.ts)
// that run via `tsx` outside the Next.js module graph, which can't resolve
// that package.
import fs from 'node:fs/promises';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as s from '@/lib/db/schema';

const DEFAULT_PROVIDER_API_BASE_URL =
  'https://digitlink.mobi/prod-api/member/game/available-providers';

/**
 * The upstream provider-catalog API base URL — an admin-managed integration
 * setting (`site_settings` key `provider.api_base_url`), not an env var, so
 * it can be repointed without a redeploy. Not public (queried directly,
 * bypassing getSettings()'s is_public filter) since it's server-only.
 */
export async function getProviderApiBaseUrl(): Promise<string> {
  const [row] = await db
    .select({ value: s.siteSettings.value })
    .from(s.siteSettings)
    .where(eq(s.siteSettings.key, 'provider.api_base_url'));
  return row?.value || DEFAULT_PROVIDER_API_BASE_URL;
}

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

const normalize = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '');
const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

async function fetchProviders(type: 'SC' | 'GC'): Promise<{ list: ApiProvider[]; source: string }> {
  try {
    const endpoint = await getProviderApiBaseUrl();
    const res = await fetch(`${endpoint}?inviteCode=&providerType=${type}`, {
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as { data?: ApiProvider[] };
    return { list: json.data ?? [], source: 'live API' };
  } catch (err) {
    const file = path.join(process.cwd(), 'data', `providers.${type.toLowerCase()}.json`);
    const list = JSON.parse(await fs.readFile(file, 'utf8')) as ApiProvider[];
    return { list, source: `cached ${file} (live API unavailable: ${(err as Error).message})` };
  }
}

export interface SyncGamePlatformsResult {
  updated: number;
  inserted: number;
  total: number;
  unmatchedExisting: number;
  sources: { sc: string; gc: string };
}

/**
 * Sync the `game_platforms` catalog from the live Digit Link provider API
 * (both SC and GC lists), falling back to the committed snapshots in
 * data/providers.{sc,gc}.json when the API is unreachable. Matching is by
 * normalized name (case/punctuation-insensitive) so pre-seeded rows are
 * enriched in place — real icon URLs, provider codes, launch URLs, types and
 * sort order — instead of being duplicated. Unmatched providers are inserted.
 *
 * Shared by `scripts/sync-platforms.ts` (manual/CLI run) and the
 * `providers.sync` cron job (lib/jobs) — this does no process-lifecycle
 * management (no `process.exit`) so it's safe to call from a long-lived
 * worker.
 */
export async function syncGamePlatforms(): Promise<SyncGamePlatformsResult> {
  const [sc, gc] = await Promise.all([fetchProviders('SC'), fetchProviders('GC')]);

  // SC entries win on duplicate providerCode (agent panel deals in SC platforms).
  const byCode = new Map<string, ApiProvider>();
  for (const p of [...gc.list, ...sc.list]) byCode.set(p.providerCode, p);
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
  return {
    updated,
    inserted,
    total: total.length,
    unmatchedExisting: existing.length - updated,
    sources: { sc: sc.source, gc: gc.source },
  };
}
