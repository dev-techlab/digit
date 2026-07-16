import {
  pgTable,
  uuid,
  text,
  boolean,
  numeric,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { agents } from './agent';
import { gamePlatforms } from './game-platform';

/** Store × game platform POS/kiosk account (Game Setting screen). */
export const storePlatformAccounts = pgTable(
  'store_platform_accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storeId: uuid('store_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    platformId: uuid('platform_id')
      .notNull()
      .references(() => gamePlatforms.id, { onDelete: 'cascade' }),
    enabled: boolean('enabled').notNull().default(false),
    kioskId: text('kiosk_id'),
    posAccount: text('pos_account'),
    posPassword: text('pos_password'),
    moneyBox: text('money_box'),
    remark: text('remark'),
    scoreCostPct: numeric('score_cost_pct', { precision: 6, scale: 2 }).notNull().default('20'),
    minDeposit: numeric('min_deposit', { precision: 12, scale: 2 }).notNull().default('10'),
    minRedemption: numeric('min_redemption', { precision: 12, scale: 2 }).notNull().default('10'),
    redeemDailyLimit: numeric('redeem_daily_limit', { precision: 12, scale: 2 })
      .notNull()
      .default('3000'),
    minDepositToUnlock: numeric('min_deposit_to_unlock', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    score: numeric('score', { precision: 14, scale: 2 }),
    scoreSyncedAt: timestamp('score_synced_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storePlatformUq: uniqueIndex('spa_store_platform_uq').on(t.storeId, t.platformId),
  })
);
