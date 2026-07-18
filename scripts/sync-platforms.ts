/**
 * Sync the `game_platforms` catalog from the live Digit Link provider API
 * (admin-managed `provider.api_base_url` setting, both SC and GC lists).
 * Falls back to the committed snapshots in data/providers.{sc,gc}.json when
 * the API is unreachable.
 *
 * Matching is by normalized name (case/punctuation-insensitive) so the rows
 * seeded from the Game Setting screenshots are enriched in place — real icon
 * URLs, provider codes, launch URLs, types and sort order — instead of being
 * duplicated. Providers not yet in the DB are inserted.
 *
 * The actual sync logic lives in lib/provider-api.ts (shared with the
 * providers.sync cron job) — this is just the CLI wrapper.
 *
 *   pnpm platforms:sync
 */
import './load-env';
import { syncGamePlatforms } from '@/lib/provider-api';

async function main() {
  const result = await syncGamePlatforms();
  console.log(`✓ SC: ${result.sources.sc}`);
  console.log(`✓ GC: ${result.sources.gc}`);
  console.log(`✓ synced: ${result.updated} updated, ${result.inserted} inserted, ${result.total} total`);
  console.log(`  (${result.unmatchedExisting} pre-seeded rows had no API match and were left untouched)`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
