import {
  pgTable,
  uuid,
  text,
  numeric,
  timestamp,
  index,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { agentTypeEnum, agentStatusEnum } from './enums';

/** Agent hierarchy: store → sale/sub agents (storeId = root store, self for stores). */
export const agents = pgTable(
  'agents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    type: agentTypeEnum('type').notNull(),
    username: text('username').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    nickname: text('nickname'),
    email: text('email'),
    // Root store this agent belongs to (self for type='store').
    storeId: uuid('store_id').references((): AnyPgColumn => agents.id, { onDelete: 'cascade' }),
    parentAgentId: uuid('parent_agent_id').references((): AnyPgColumn => agents.id),
    ratioPct: numeric('ratio_pct', { precision: 6, scale: 2 }).notNull().default('0'),
    inviteCode: text('invite_code').notNull().unique(),
    onlineBalance: numeric('online_balance', { precision: 14, scale: 2 }).notNull().default('0'),
    tipsBalance: numeric('tips_balance', { precision: 14, scale: 2 }).notNull().default('0'),
    status: agentStatusEnum('status').notNull().default('active'),
    remark: text('remark'),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storeIdx: index('agents_store_idx').on(t.storeId),
  })
);
