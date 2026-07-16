import { pgTable, uuid, text, numeric, timestamp } from 'drizzle-orm/pg-core';
import { agents } from './agent';

/** 1:1 store-scoped settings (My Wallet → Basic form). */
export const storeSettings = pgTable('store_settings', {
  storeId: uuid('store_id')
    .primaryKey()
    .references(() => agents.id, { onDelete: 'cascade' }),
  storeName: text('store_name').notNull().default(''),
  dailyMaxRedeem: numeric('daily_max_redeem', { precision: 12, scale: 2 })
    .notNull()
    .default('5000'),
  dailyMaxWithdraw: numeric('daily_max_withdraw', { precision: 12, scale: 2 })
    .notNull()
    .default('500'),
  phoneBindRewardSc: numeric('phone_bind_reward_sc', { precision: 10, scale: 2 })
    .notNull()
    .default('3'),
  logoUrl: text('logo_url'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
