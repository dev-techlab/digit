import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// drizzle-kit runs outside Next.js, so it doesn't get Next's automatic env
// loading. Load the same files Next would, most-specific first (dotenv never
// overwrites an already-set var, so earlier files win).
config({ path: '.env.local' });
config({ path: '.env.development' });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set — add it to .env.local or .env.development');
}

export default defineConfig({
  schema: './lib/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
});
