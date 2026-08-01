import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '@/lib/env';

const connectionString = env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

// Reuse a single postgres client across dev HMR reloads so we don't exhaust
// connections; in production a fresh module instance is fine.
const globalForDb = globalThis as unknown as { client?: ReturnType<typeof postgres> };

const client =
  globalForDb.client ??
  postgres(connectionString, {
    max: env.NODE_ENV === 'production' ? 10 : 1,
    prepare: false,
  });
if (env.NODE_ENV !== 'production') globalForDb.client = client;

export const db = drizzle(client, { schema });
export { schema };
export type Database = typeof db;
