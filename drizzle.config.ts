import './scripts/load-env';
import { defineConfig } from 'drizzle-kit';

if (!process.env.DATABASE_URL) {
  const mode = process.env.NODE_ENV ?? 'development';
  throw new Error(
    mode === 'production'
      ? 'DATABASE_URL is not set — export it in the deploy environment, or add it to .env.production.local (gitignored)'
      : 'DATABASE_URL is not set — add it to .env.local or .env.development'
  );
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
