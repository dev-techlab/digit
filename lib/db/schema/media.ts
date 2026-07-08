import { pgTable, uuid, integer, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { mediaKindEnum } from './enums';
import { admins } from './rbac';
import { users } from './users';

export const mediaAssets = pgTable('media_assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  r2Key: text('r2_key').notNull().unique(),
  bucket: text('bucket').notNull().default('octanlink-media'),
  kind: mediaKindEnum('kind').notNull(),
  contentType: text('content_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  width: integer('width'),
  height: integer('height'),
  originalName: text('original_name'),
  uploadedByAdminId: uuid('uploaded_by_admin_id').references(() => admins.id, {
    onDelete: 'set null',
  }),
  uploadedByUserId: uuid('uploaded_by_user_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  isPrivate: boolean('is_private').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
