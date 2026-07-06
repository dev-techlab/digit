import { PgBoss } from 'pg-boss';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not set (required by pg-boss)');

// pg-boss owns and migrates its own `pgboss` schema in this same database.
const globalForBoss = globalThis as unknown as { boss?: PgBoss };

export function getBoss(): PgBoss {
  if (!globalForBoss.boss) {
    globalForBoss.boss = new PgBoss({ connectionString });
  }
  return globalForBoss.boss;
}
