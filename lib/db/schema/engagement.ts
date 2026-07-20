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
import {
  bannerTypeEnum,
  bannerBadgeIconEnum,
  scheduleIconEnum,
  bonusStatusEnum,
  referralStatusEnum,
  reviewStatusEnum,
} from './enums';
import { users } from './users';
import { gameProviders } from './providers';

export const bonuses = pgTable('bonuses', {
  id: text('id').primaryKey(), // slug, e.g. daily-checkin
  title: text('title').notNull(),
  description: text('description').notNull(),
  tags: text('tags').array().notNull().default([]),
  active: boolean('active').notNull().default(true),
  bannerType: bannerTypeEnum('banner_type').notNull(),
  bannerGradient: text('banner_gradient'),
  bannerBadgeIcon: bannerBadgeIconEnum('banner_badge_icon'),
  bannerBadgeText: text('banner_badge_text'),
  scheduleIcon: scheduleIconEnum('schedule_icon').notNull(),
  scheduleText: text('schedule_text').notNull().default(''),
  scheduleCountdownSeconds: integer('schedule_countdown_seconds'),
  sort: smallint('sort').notNull().default(0),
  // Soft delete — admin removal hides the bonus from the player Bonus Center
  // without touching linked user_bonus_claims, so claim history is kept.
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const userBonusClaims = pgTable(
  'user_bonus_claims',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    bonusId: text('bonus_id')
      .notNull()
      .references(() => bonuses.id, { onDelete: 'cascade' }),
    status: bonusStatusEnum('status').notNull().default('none'),
    claimedAt: timestamp('claimed_at', { withTimezone: true }),
    nextAvailableAt: timestamp('next_available_at', { withTimezone: true }),
  },
  (t) => ({
    userBonusUnique: unique().on(t.userId, t.bonusId),
  })
);

export const referralCommissions = pgTable('referral_commissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  referrerUserId: uuid('referrer_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  inviteeUserId: uuid('invitee_user_id').references(() => users.id, { onDelete: 'set null' }),
  inviteeDisplay: text('invitee_display').notNull(),
  reward: numeric('reward', { precision: 18, scale: 2 }).notNull().default('0'),
  status: referralStatusEnum('status').notNull().default('pending'),
  joinedAt: timestamp('joined_at', { withTimezone: true }).notNull(),
});

export const redemptionReviews = pgTable('redemption_reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderNo: text('order_no').notNull(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  providerId: integer('provider_id').references(() => gameProviders.id, {
    onDelete: 'set null',
  }),
  providerName: text('provider_name').notNull(),
  amount: numeric('amount', { precision: 18, scale: 2 }).notNull(),
  status: reviewStatusEnum('status').notNull().default('reviewing'),
  visible: boolean('visible').notNull().default(true),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull(),
});

export const profileTasks = pgTable('profile_tasks', {
  key: text('key').primaryKey(), // phone | kyc | pwa
  title: text('title').notNull(),
  description: text('description').notNull(),
  rewardGc: integer('reward_gc').notNull(),
  rewardSc: integer('reward_sc').notNull(),
  sort: smallint('sort').notNull().default(0),
});

export const userProfileTaskClaims = pgTable(
  'user_profile_task_claims',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    taskKey: text('task_key')
      .notNull()
      .references(() => profileTasks.key, { onDelete: 'cascade' }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    rewardClaimed: boolean('reward_claimed').notNull().default(false),
  },
  (t) => ({
    userTaskUnique: unique().on(t.userId, t.taskKey),
  })
);
