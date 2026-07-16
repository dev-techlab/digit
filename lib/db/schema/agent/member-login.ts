import { pgTable, uuid, text, timestamp, inet, index } from 'drizzle-orm/pg-core';
import { members } from './member';

/** Member login history (time, IP, device) shown in member detail. */
export const memberLogins = pgTable(
  'member_logins',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    ipAddress: inet('ip_address'),
    device: text('device'), // e.g. "macOS - Safari (Mobile)"
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    memberIdx: index('member_logins_member_idx').on(t.memberId),
  })
);
