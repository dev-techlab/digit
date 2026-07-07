import path from 'node:path';
import { config as dotenv } from 'dotenv';
import { defineConfig } from 'vitest/config';

// Load env before anything imports lib/db (which reads DATABASE_URL at module
// init). Same precedence as drizzle.config: .env.local first, then .env.development.
dotenv({ path: '.env.local' });
dotenv({ path: '.env.development' });

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Integration tests share one database — never run test files in parallel.
    fileParallelism: false,
    testTimeout: 30_000, // Neon round-trips
    hookTimeout: 30_000,
    reporters: 'verbose',
  },
  resolve: {
    alias: {
      // `server-only` throws outside RSC; stub it so server modules are testable.
      'server-only': path.resolve(__dirname, 'tests/stubs/server-only.ts'),
      // `next/headers` cookies() throws outside a request scope; stub it so
      // lib/data.ts exercises its "no session" fallback path under test.
      'next/headers': path.resolve(__dirname, 'tests/stubs/next-headers.ts'),
      '@': path.resolve(__dirname),
    },
  },
});
