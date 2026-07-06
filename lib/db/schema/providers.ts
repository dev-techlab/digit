import {
  pgTable,
  uuid,
  integer,
  smallint,
  text,
  boolean,
  numeric,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';
import { providerTypeEnum } from './enums';
import { users } from './users';

export const gameProviders = pgTable('game_providers', {
  id: integer('id').primaryKey(), // provider id from upstream API (not uuid)
  name: text('name').notNull(),
  providerCode: text('provider_code').notNull(),
  launchUrlTemplate: text('launch_url_template').notNull(),
  iconUrl: text('icon_url').notNull(),
  status: smallint('status').notNull(),
  sort: smallint('sort').notNull().default(0),
  createType: smallint('create_type').notNull(),
  operate: smallint('operate').notNull(),
  needInitBalance: smallint('need_init_balance').notNull(),
  canManualInput: smallint('can_manual_input').notNull(),
  providerType: providerTypeEnum('provider_type').notNull(),
  iframeSupported: boolean('iframe_supported').notNull(),
  isMachineSupported: smallint('is_machine_supported').notNull(),
  redeemField: smallint('redeem_field').notNull(),
  invalidPasswordState: smallint('invalid_password_state').notNull(),
  canChangePassword: smallint('can_change_password').notNull(),
  syncedAt: timestamp('synced_at', { withTimezone: true }).notNull().defaultNow(),
});

export const providerDepositTiers = pgTable('provider_deposit_tiers', {
  id: uuid('id').primaryKey().defaultRandom(),
  providerId: integer('provider_id')
    .notNull()
    .references(() => gameProviders.id, { onDelete: 'cascade' }),
  amount: numeric('amount', { precision: 18, scale: 2 }).notNull(),
  bonusAmount: numeric('bonus_amount', { precision: 18, scale: 2 }).notNull().default('0'),
  sort: smallint('sort').notNull().default(0),
});

export const userProviderAccounts = pgTable(
  'user_provider_accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    providerId: integer('provider_id')
      .notNull()
      .references(() => gameProviders.id, { onDelete: 'cascade' }),
    gameUsername: text('game_username').notNull(),
    gamePasswordEnc: text('game_password_enc').notNull(),
    balance: numeric('balance', { precision: 18, scale: 2 }).notNull().default('0'),
    initialized: boolean('initialized').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userProviderUnique: unique().on(t.userId, t.providerId),
  })
);
