/**
 * Background-job worker entry point. Run alongside the Next.js server:
 *   pnpm worker
 * Registers all cron schedules + queue handlers from lib/jobs.
 */
import { startWorker } from '@/lib/jobs';

startWorker().catch((err) => {
  console.error('Worker failed to start:', err);
  process.exit(1);
});
