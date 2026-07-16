import { pgTable, uuid, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { members } from './member';
import { gamePlatforms } from './game-platform';

/** Member ↔ game platform binding (game username/password per platform). */
export const memberPlatformAccounts = pgTable(
  'member_platform_accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    platformId: uuid('platform_id')
      .notNull()
      .references(() => gamePlatforms.id, { onDelete: 'cascade' }),
    gameUsername: text('game_username'),
    gamePassword: text('game_password'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    memberPlatformUq: uniqueIndex('mpa_member_platform_uq').on(t.memberId, t.platformId),
  })
);
