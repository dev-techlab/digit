import { pgTable, uuid, text, timestamp, integer } from 'drizzle-orm/pg-core';
import { posterCategoryEnum } from './enums';

/** Marketing poster assets (Download posters screen). */
export const posters = pgTable('posters', {
  id: uuid('id').primaryKey().defaultRandom(),
  category: posterCategoryEnum('category').notNull(),
  title: text('title'),
  imageUrl: text('image_url').notNull(),
  sort: integer('sort').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
