import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { agents } from './agent';
import { agentStatusEnum } from './enums';

/** Physical kiosk terminals registered to a store (Kiosk List screen). */
export const kiosks = pgTable('kiosks', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id')
    .notNull()
    .references(() => agents.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  code: text('code').notNull(),
  status: agentStatusEnum('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
