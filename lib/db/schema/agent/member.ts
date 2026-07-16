import {
  pgTable,
  uuid,
  text,
  boolean,
  numeric,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { agents } from './agent';
import { agentStatusEnum } from './enums';

/** Players managed by a store (Member List screen). */
export const members = pgTable(
  'members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storeId: uuid('store_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    saleAgentId: uuid('sale_agent_id').references(() => agents.id, { onDelete: 'set null' }),
    subAgentId: uuid('sub_agent_id').references(() => agents.id, { onDelete: 'set null' }),
    username: text('username').notNull(),
    passwordHash: text('password_hash').notNull(),
    phone: text('phone'),
    onlineSc: numeric('online_sc', { precision: 14, scale: 2 }).notNull().default('0'),
    scRewardEnabled: boolean('sc_reward_enabled').notNull().default(true),
    remark: text('remark'),
    status: agentStatusEnum('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storeUsernameUq: uniqueIndex('members_store_username_uq').on(t.storeId, t.username),
    storeIdx: index('members_store_idx').on(t.storeId),
  })
);
