import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  numeric,
  smallint,
  inet,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { kycStatusEnum, otpPurposeEnum, postalStatusEnum, ticketStatusEnum } from './enums';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').notNull().unique(),
  nickname: text('nickname').notNull(),
  passwordHash: text('password_hash').notNull(),
  phone: text('phone'),
  phoneBound: boolean('phone_bound').notNull().default(false),
  email: text('email'),
  avatarUrl: text('avatar_url'),
  avatarEmoji: text('avatar_emoji').notNull().default('🎰'),
  kycStatus: kycStatusEnum('kyc_status').notNull().default('unverified'),
  pwaInstalled: boolean('pwa_installed').notNull().default(false),
  inviteCode: text('invite_code').notNull().unique(),
  referredByUserId: uuid('referred_by_user_id').references((): AnyPgColumn => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const wallets = pgTable('wallets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  goldCoin: numeric('gold_coin', { precision: 18, scale: 2 }).notNull().default('0'),
  onlineSc: numeric('online_sc', { precision: 18, scale: 2 }).notNull().default('0'),
  storeSc: numeric('store_sc', { precision: 18, scale: 2 }).notNull().default('0'),
  kioskSc: numeric('kiosk_sc', { precision: 18, scale: 2 }).notNull().default('0'),
  unwagered: numeric('unwagered', { precision: 18, scale: 2 }).notNull().default('0'),
  freeBonus: numeric('free_bonus', { precision: 18, scale: 2 }).notNull().default('0'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  userAgent: text('user_agent'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  // Session validation MUST check `revoked_at IS NULL` (parity with
  // admin_sessions) so logout / password-reset can invalidate live sessions.
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const otpCodes = pgTable('otp_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  destination: text('destination').notNull(),
  // SECURITY: store a HASH of the code (e.g. sha256), never the plaintext, and
  // when a verify flow is built it MUST increment `attempts` and lock out after
  // a small max (e.g. 5) + rate-limit issuance per destination.
  code: text('code').notNull(),
  attempts: smallint('attempts').notNull().default(0),
  purpose: otpPurposeEnum('purpose').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  consumed: boolean('consumed').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const postalRequests = pgTable('postal_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  code: text('code').notNull(),
  status: postalStatusEnum('status').notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const supportTickets = pgTable('support_tickets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  email: text('email'),
  message: text('message').notNull(),
  status: ticketStatusEnum('status').notNull().default('open'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
