/**
 * Load env vars the same way Next.js does, for tools that run outside Next
 * (drizzle-kit, and the seed/worker/admin-create/test-mail scripts) — most-
 * specific file first, since dotenv never overwrites an already-set var:
 *   .env.<mode>.local  (gitignored secrets for that mode, e.g. production)
 *   .env.local         (gitignored secrets, all modes)
 *   .env.<mode>        (committed defaults for that mode)
 * A real env var already exported in the shell/deploy environment always
 * wins over all of these.
 */
import { config } from 'dotenv';

const mode = process.env.NODE_ENV ?? 'development';
if (mode === 'production') config({ path: '.env.production.local' });
config({ path: '.env.local' });
config({ path: `.env.${mode}` });
