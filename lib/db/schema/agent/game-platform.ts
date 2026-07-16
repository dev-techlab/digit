import { pgTable, uuid, text, boolean, timestamp, integer } from 'drizzle-orm/pg-core';

/** Game platform catalog (Orion Stars, Juwa, Fire Kirin, ...). */
export const gamePlatforms = pgTable('game_platforms', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  iconUrl: text('icon_url'),
  sort: integer('sort').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
