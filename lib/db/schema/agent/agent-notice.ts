import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { agents } from './agent';

/** Platform → agent announcements (bell dropdown + "My Notices" page). */
export const agentNotices = pgTable('agent_notices', {
  id: uuid('id').primaryKey().defaultRandom(),
  // NULL = broadcast to every store.
  storeId: uuid('store_id').references(() => agents.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content'),
  noticeType: text('notice_type').notNull().default('General'),
  noticeLevel: text('notice_level').notNull().default('Normal'),
  publisher: text('publisher').notNull().default('Platform'),
  publishedAt: timestamp('published_at', { withTimezone: true }).notNull().defaultNow(),
});
