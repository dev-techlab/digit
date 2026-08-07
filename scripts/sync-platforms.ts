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
  await syncGamePlatforms();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
