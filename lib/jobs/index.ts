import type { Job } from 'pg-boss';
import { and, eq, isNotNull, lt, lte, or } from 'drizzle-orm';
import { getBoss } from './boss';
import { deliver } from '@/lib/mail/deliver';
import type { MailPayload } from '@/lib/mail/types';
import { syncGamePlatforms } from '@/lib/provider-api';
import { db } from '@/lib/db';
import * as s from '@/lib/db/schema';

// Referral commissions mature this long after signup before they're settled
// (pending -> claimed) — gives a window to reverse fraudulent signups.
const REFERRAL_SETTLE_DELAY_MS = 24 * 60 * 60 * 1000;

/**
 * Job registry. Cron-scheduled jobs from DB_DIAGRAM §9 plus on-demand queues.
 * `cron` present → registered with boss.schedule(); handlers are stubs to fill in.
 */
export interface JobDef {
  name: string;
  cron?: string; // omit for on-demand (enqueue via enqueue())
  handler: (job: Job) => Promise<void>;
}

export const JOBS: JobDef[] = [
  // --- Scheduled (cron) ---
  {
    name: 'providers.sync',
    cron: '0 */6 * * *',
    handler: async () => {
      const result = await syncGamePlatforms();
      console.log(
        `[providers.sync] ${result.updated} updated, ${result.inserted} inserted, ${result.total} total`
      );
    },
  },
  {
    name: 'bonus.daily-reset',
    cron: '0 0 * * *',
    handler: async () => {
      await db
        .update(s.userBonusClaims)
        .set({ status: 'claimable', nextAvailableAt: null })
        .where(
          and(
            eq(s.userBonusClaims.status, 'claimed'),
            isNotNull(s.userBonusClaims.nextAvailableAt),
            lte(s.userBonusClaims.nextAvailableAt, new Date())
          )
        );
    },
  },
  {
    name: 'otp.purge',
    cron: '*/15 * * * *',
    handler: async () => {
      await db
        .delete(s.otpCodes)
        .where(or(lt(s.otpCodes.expiresAt, new Date()), eq(s.otpCodes.consumed, true)));
    },
  },
  {
    name: 'sessions.purge',
    cron: '0 * * * *',
    handler: async () => {
      const now = new Date();
      await db
        .delete(s.sessions)
        .where(or(lt(s.sessions.expiresAt, now), isNotNull(s.sessions.revokedAt)));
      await db
        .delete(s.adminSessions)
        .where(or(lt(s.adminSessions.expiresAt, now), isNotNull(s.adminSessions.revokedAt)));
    },
  },
  {
    name: 'referral.settle',
    cron: '0 1 * * *',
    handler: async () => {
      const cutoff = new Date(Date.now() - REFERRAL_SETTLE_DELAY_MS);
      await db
        .update(s.referralCommissions)
        .set({ status: 'claimed' })
        .where(and(eq(s.referralCommissions.status, 'pending'), lte(s.referralCommissions.joinedAt, cutoff)));
    },
  },
  {
    name: 'media.gc',
    cron: '0 3 * * *',
    handler: async () => {
      // TODO: delete orphaned R2 objects with no media_assets reference
    },
  },
  {
    name: 'audit.archive',
    cron: '0 4 * * 0',
    handler: async () => {
      // TODO: archive old admin_audit_logs
    },
  },
  // --- On-demand (enqueue with enqueue(name, data)) ---
  {
    name: 'email.send',
    handler: async (job) => {
      await deliver(job.data as MailPayload);
    },
  },
  { name: 'image.process', handler: async () => {} },
  { name: 'order.reconcile', handler: async () => {} },
  { name: 'kyc.review', handler: async () => {} },
];

/** Enqueue an on-demand job from an API route/server action. */
export async function enqueue<T extends object>(name: string, data: T) {
  const boss = getBoss();
  await boss.start();
  await boss.send(name, data);
}

/** Long-lived worker: create queues, register schedules + handlers. */
export async function startWorker() {
  const boss = getBoss();
  boss.on('error', (err: Error) => console.error('[pg-boss]', err));
  await boss.start();

  for (const job of JOBS) {
    await boss.createQueue(job.name);
    if (job.cron) await boss.schedule(job.name, job.cron);
    await boss.work(job.name, async (jobs: Job[]) => {
      for (const j of jobs) {
        try {
          await job.handler(j);
        } catch (err) {
          console.error(`[pg-boss] job "${job.name}" failed`, err);
          throw err; // rethrow so pg-boss still applies its own retry/failure tracking
        }
      }
    });
    console.log(`[pg-boss] registered ${job.name}${job.cron ? ` (${job.cron})` : ''}`);
  }
  console.log(`[pg-boss] worker ready — ${JOBS.length} jobs`);
}
