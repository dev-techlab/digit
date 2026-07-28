import { pgTable, uuid, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { agents } from './agent';
import { gamePlatforms } from './game-platform';

/** Agent-level platform access catalog. */
export const agentPlatforms = pgTable('agent_platforms', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id')
    .notNull()
    .references(() => agents.id, { onDelete: 'cascade' }),
  platformId: uuid('platform_id')
    .notNull()
    .references(() => gamePlatforms.id, { onDelete: 'cascade' }),
  availableFromTime: text('available_from_time'),
  availableToTime: text('available_to_time'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  agentPlatformUq: uniqueIndex('agent_platforms_agent_platform_uq').on(t.agentId, t.platformId),
}));

/** Agent ↔ platform assignment relationship. */
export const agentPlatformMappings = pgTable('agent_platform_mappings', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id')
    .notNull()
    .references(() => agents.id, { onDelete: 'cascade' }),
  platformId: uuid('platform_id')
    .notNull()
    .references(() => gamePlatforms.id, { onDelete: 'cascade' }),
  availableFromTime: text('available_from_time'),
  availableToTime: text('available_to_time'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  agentPlatformMappingUq: uniqueIndex('agent_platform_mappings_agent_platform_uq').on(t.agentId, t.platformId),
}));
