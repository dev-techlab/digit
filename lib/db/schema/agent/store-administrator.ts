import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { agents } from './agent';
import { agentStatusEnum } from './enums';

/** Extra staff logins for a store (Store Administrator screen). */
export const storeAdministrators = pgTable('store_administrators', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id')
    .notNull()
    .references(() => agents.id, { onDelete: 'cascade' }),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  nickname: text('nickname'),
  email: text('email'),
  status: agentStatusEnum('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
