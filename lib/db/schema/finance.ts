import { pgTable, uuid, text, boolean, numeric, timestamp } from 'drizzle-orm/pg-core';
import {
  orderStatusEnum,
  feeModeEnum,
  paymentMethodEnum,
  txStatusEnum,
  txTypeEnum,
} from './enums';
import { users } from './users';

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderNo: text('order_no').notNull().unique(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  amount: numeric('amount', { precision: 18, scale: 2 }).notNull(),
  payAmount: numeric('pay_amount', { precision: 18, scale: 2 }).notNull(),
  actualDepositAmount: numeric('actual_deposit_amount', { precision: 18, scale: 2 })
    .notNull()
    .default('0'),
  paymentMethod: text('payment_method').notNull(),
  fee: numeric('fee', { precision: 18, scale: 2 }).notNull().default('0'),
  feeMode: feeModeEnum('fee_mode').notNull(),
  feeWaived: boolean('fee_waived').notNull().default(false),
  scBonus: numeric('sc_bonus', { precision: 18, scale: 2 }).notNull().default('0'),
  status: orderStatusEnum('status').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
});

export const transactions = pgTable('transactions', {
  id: text('id').primaryKey(), // upstream id, e.g. TX20260627001
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  address: text('address').notNull(),
  methodLabel: text('method_label').notNull(),
  method: paymentMethodEnum('method').notNull(),
  status: txStatusEnum('status').notNull(),
  amount: numeric('amount', { precision: 18, scale: 2 }).notNull(),
  type: txTypeEnum('type').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
});
