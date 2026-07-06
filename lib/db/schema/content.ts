import { pgTable, uuid, smallint, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import {
  helpTabEnum,
  helpSectionIconEnum,
  helpItemIconEnum,
  settingTypeEnum,
  socialPlatformEnum,
} from './enums';

export const contentPages = pgTable('content_pages', {
  slug: text('slug').primaryKey(), // terms, privacy, sweeps-rules, ...
  title: text('title').notNull(),
  body: text('body').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const banners = pgTable('banners', {
  id: uuid('id').primaryKey().defaultRandom(),
  imageUrl: text('image_url').notNull(),
  linkUrl: text('link_url'),
  active: boolean('active').notNull().default(true),
  sort: smallint('sort').notNull().default(0),
});

export const helpSections = pgTable('help_sections', {
  id: uuid('id').primaryKey().defaultRandom(),
  tab: helpTabEnum('tab').notNull(),
  key: text('key').notNull(),
  label: text('label').notNull(),
  icon: helpSectionIconEnum('icon').notNull(),
  sort: smallint('sort').notNull().default(0),
});

export const helpItems = pgTable('help_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  sectionId: uuid('section_id')
    .notNull()
    .references(() => helpSections.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  icon: helpItemIconEnum('icon'),
  body: text('body'),
  sort: smallint('sort').notNull().default(0),
});

export const helpSteps = pgTable('help_steps', {
  id: uuid('id').primaryKey().defaultRandom(),
  itemId: uuid('item_id')
    .notNull()
    .references(() => helpItems.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description').notNull(),
  sort: smallint('sort').notNull().default(0),
});

export const siteSettings = pgTable('site_settings', {
  key: text('key').primaryKey(), // site.name, support.email, ...
  value: text('value').notNull(),
  type: settingTypeEnum('type').notNull().default('string'),
  group: text('group').notNull().default('general'),
  label: text('label'),
  // Fail-closed: a setting is only exposed to the public site (getSettings)
  // when explicitly marked public. New settings default to NOT public.
  isPublic: boolean('is_public').notNull().default(false),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const socialLinks = pgTable('social_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  platform: socialPlatformEnum('platform').notNull().unique(),
  label: text('label').notNull(),
  url: text('url').notNull(),
  icon: text('icon'),
  active: boolean('active').notNull().default(true),
  sort: smallint('sort').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
