import { pgTable, uuid, text, boolean, timestamp, integer } from 'drizzle-orm/pg-core';

/**
 * Game platform catalog (Orion Stars, Juwa, Fire Kirin, ...).
 * Synced from the live provider API (admin-managed `provider.api_base_url`
 * setting) via `pnpm platforms:sync` — see scripts/sync-platforms.ts.
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
  // Soft delete — admin removal hides the platform from every catalog/config
  // view (agent Game Setting, admin list) without touching linked
  // store_platform_accounts / member_platform_accounts / transactions /
  // redemption_audits, so historical reports keep the real platform name.
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
