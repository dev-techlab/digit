/**
 * Load .env for tools that run outside Next (drizzle-kit, and the
 * seed/worker/admin-create/test-mail scripts) — Next's own dev/build/start
 * loads it automatically; these standalone scripts need it done manually.
 * A real env var already exported in the shell/deploy environment always
 * wins over the file (dotenv never overwrites an already-set var).
 */
import { config } from 'dotenv';

config();
