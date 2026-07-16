import { pgTable, uuid, text, numeric, timestamp, index } from 'drizzle-orm/pg-core';
import { agents } from './agent';
import { members } from './member';
import { gamePlatforms } from './game-platform';
import { auditStatusEnum } from './enums';

/** Redemption review queue (Transaction List → Redemption Audit tab). */
export const redemptionAudits = pgTable(
  'redemption_audits',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storeId: uuid('store_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id').references(() => members.id, { onDelete: 'set null' }),
    platformId: uuid('platform_id').references(() => gamePlatforms.id, { onDelete: 'set null' }),
    txRef: text('tx_ref'),
    amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
    status: auditStatusEnum('status').notNull().default('pending'),
    reviewedByAgentId: uuid('reviewed_by_agent_id').references(() => agents.id),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storeStatusIdx: index('redemption_audits_store_status_idx').on(t.storeId, t.status),
  })
);
