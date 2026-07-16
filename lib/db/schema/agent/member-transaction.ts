import { pgTable, uuid, numeric, timestamp, index } from 'drizzle-orm/pg-core';
import { agents } from './agent';
import { members } from './member';
import { gamePlatforms } from './game-platform';
import { memberTxTypeEnum, memberTxChannelEnum, agentTxStatusEnum } from './enums';

/** Member recharge/redeem/bonus ledger — feeds the dashboard and all reports. */
export const memberTransactions = pgTable(
  'member_transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storeId: uuid('store_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id').references(() => members.id, { onDelete: 'set null' }),
    platformId: uuid('platform_id').references(() => gamePlatforms.id, { onDelete: 'set null' }),
    type: memberTxTypeEnum('type').notNull(),
    channel: memberTxChannelEnum('channel').notNull().default('online'),
    amount: numeric('amount', { precision: 14, scale: 2 }).notNull().default('0'),
    onlineScChange: numeric('online_sc_change', { precision: 14, scale: 2 })
      .notNull()
      .default('0'),
    storeBalanceVary: numeric('store_balance_vary', { precision: 14, scale: 2 })
      .notNull()
      .default('0'),
    inScore: numeric('in_score', { precision: 14, scale: 2 }).notNull().default('0'),
    outScore: numeric('out_score', { precision: 14, scale: 2 }).notNull().default('0'),
    bonusScore: numeric('bonus_score', { precision: 14, scale: 2 }).notNull().default('0'),
    gameDepositFee: numeric('game_deposit_fee', { precision: 14, scale: 2 })
      .notNull()
      .default('0'),
    platformFee: numeric('platform_fee', { precision: 14, scale: 2 }).notNull().default('0'),
    status: agentTxStatusEnum('status').notNull().default('completed'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storeTimeIdx: index('member_tx_store_time_idx').on(t.storeId, t.createdAt),
    storePlatformIdx: index('member_tx_store_platform_idx').on(t.storeId, t.platformId),
  })
);
