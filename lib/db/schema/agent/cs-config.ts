import { pgTable, uuid, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { agents } from './agent';

/** Customer-service widget configuration per store (CS Config screen). */
export const csConfigs = pgTable('cs_configs', {
  storeId: uuid('store_id')
    .primaryKey()
    .references(() => agents.id, { onDelete: 'cascade' }),
  enabled: boolean('enabled').notNull().default(true),
  contactPhoneEnabled: boolean('contact_phone_enabled').notNull().default(false),
  contactPhone: text('contact_phone'),
  platform: text('platform').notNull().default('Custom JS Widget'),
  jsUrl: text('js_url'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
