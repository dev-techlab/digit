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
  /** Platform names present in both the SC and GC catalogs — only one mapping can be
   * stored per row (`game_platforms.name` is unique), so these are reported instead
   * of being silently dropped. */
  crossTypeConflicts: string[];
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

  const existing = await db.select().from(s.gamePlatforms);
  const byName = new Map(existing.map((row) => [normalize(row.name), row]));
  const now = new Date();

  // De-dupe within each type by providerCode first (defensive against a
  // single feed repeating a code), then group by normalized name so a name
  // present in BOTH catalogs is detected instead of one entry silently
  // overwriting the other (`game_platforms` can only hold one mapping per
  // row — name is DB-unique).
  const dedupeByCode = (list: ApiProvider[]) => {
    const byCode = new Map<string, ApiProvider>();
    for (const p of list) byCode.set(p.providerCode, p);
    return [...byCode.values()];
  };
  const byNormalizedName = new Map<string, ApiProvider[]>();
  for (const p of [...dedupeByCode(gc.list), ...dedupeByCode(sc.list)]) {
    const key = normalize(p.name);
    const candidates = byNormalizedName.get(key) ?? [];
    candidates.push(p);
    byNormalizedName.set(key, candidates);
  }

  let updated = 0;
  let inserted = 0;
  const crossTypeConflicts: string[] = [];

  for (const candidates of byNormalizedName.values()) {
    const match = byName.get(normalize(candidates[0].name));
    // Sticky: prefer whichever candidate matches the row's current mapping
    // type, so a name in both catalogs doesn't flip type on every sync.
    // New rows default to the first (GC) candidate.
    let chosen = candidates[0];
    if (candidates.length > 1) {
      crossTypeConflicts.push(`${chosen.name} (${candidates.map((c) => c.providerType).join('/')})`);
      if (match?.providerType) {
        chosen = candidates.find((c) => c.providerType === match.providerType) ?? chosen;
      }
    }

    const values = {
      iconUrl: chosen.iconUrl,
      externalId: chosen.id,
      providerCode: chosen.providerCode,
      providerType: chosen.providerType,
      launchUrl: chosen.launchUrlTemplate,
      sort: chosen.sort,
      isActive: chosen.status === 1,
      syncedAt: now,
    };
    if (match) {
      await db
        .update(s.gamePlatforms)
        .set({ ...values, name: chosen.name }) // adopt the API's canonical name
        .where(eq(s.gamePlatforms.id, match.id));
      updated++;
    } else {
      await db
        .insert(s.gamePlatforms)
        .values({ name: chosen.name, slug: slugify(chosen.name), ...values })
        .onConflictDoNothing();
      inserted++;
    }
  }

  if (crossTypeConflicts.length) {
    console.warn(`[providers.sync] name collision across SC/GC catalogs (one mapping kept per row): ${crossTypeConflicts.join(', ')}`);
  }

  const total = await db.select({ n: s.gamePlatforms.id }).from(s.gamePlatforms);
  return {
    updated,
    inserted,
    total: total.length,
    unmatchedExisting: existing.length - updated,
    sources: { sc: sc.source, gc: gc.source },
    crossTypeConflicts,
  };
}
