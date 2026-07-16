import { pgTable, uuid, text, boolean, numeric, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { agents } from './agent';
import { promotionTypeEnum, promotionStatusEnum } from './enums';

/** Deposit-match promotions (Promotion Config screen). */
export const promotions = pgTable('promotions', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id')
    .notNull()
    .references(() => agents.id, { onDelete: 'cascade' }),
  // NULL = store-level; otherwise the SALE/SUB agent the promo is assigned to.
  assignAgentId: uuid('assign_agent_id').references(() => agents.id, { onDelete: 'cascade' }),
  type: promotionTypeEnum('type').notNull(),
  hiddenFromAgentIds: jsonb('hidden_from_agent_ids').$type<string[]>().notNull().default([]),
  bonusPercent: numeric('bonus_percent', { precision: 6, scale: 2 }).notNull().default('100'),
  minDeposit: numeric('min_deposit', { precision: 12, scale: 2 }).notNull().default('20'),
  maxBonus: numeric('max_bonus', { precision: 12, scale: 2 }).notNull().default('100'),
  redemptionMultiplier: numeric('redemption_multiplier', { precision: 6, scale: 2 })
    .notNull()
    .default('2'),
  // 0=Sun … 6=Sat; empty array = every day.
  activeDays: jsonb('active_days').$type<number[]>().notNull().default([]),
  timezone: text('timezone').notNull().default('America/New_York'),
  hiddenFromPlayers: boolean('hidden_from_players').notNull().default(false),
  onlineOnly: boolean('online_only').notNull().default(false),
  status: promotionStatusEnum('status').notNull().default('enabled'),
  remark: text('remark'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
