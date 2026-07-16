import { pgTable, uuid, text, boolean, timestamp, integer } from 'drizzle-orm/pg-core';

/**
 * Game platform catalog (Orion Stars, Juwa, Fire Kirin, ...).
 * Synced from the live provider API (`PROVIDER_API_BASE_URL`) via
 * `pnpm platforms:sync` — see scripts/sync-platforms.ts.
 */
export const gamePlatforms = pgTable('game_platforms', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  iconUrl: text('icon_url'),
  // Fields mirrored from the upstream provider API.
  externalId: integer('external_id'),
  providerCode: text('provider_code'),
  providerType: text('provider_type'), // 'SC' | 'GC'
  launchUrl: text('launch_url'),
  sort: integer('sort').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  syncedAt: timestamp('synced_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
