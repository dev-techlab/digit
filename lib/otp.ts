import { createHmac, randomInt } from 'node:crypto';
import { and, eq, gt, desc, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as s from '@/lib/db/schema';

export type OtpPurpose = (typeof s.otpPurposeEnum.enumValues)[number];

const OTP_TTL_S = 5 * 60; // 5 minutes
const MAX_ATTEMPTS = 5; // lock a code after this many wrong guesses
const RESEND_WINDOW_S = 60; // min seconds between codes to one destination

// A 6-digit code is only a 1,000,000-value space — an unkeyed hash is
// reversible via a precomputed table if `otp_codes` is ever exposed. HMAC
// with a server-side secret defeats that; falls back to a well-known dev
// value outside production (warns instead of failing so `pnpm dev` keeps working).
const OTP_HASH_SECRET = process.env.OTP_HASH_SECRET ?? 'dev-only-otp-secret-change-me';
if (process.env.NODE_ENV === 'production' && !process.env.OTP_HASH_SECRET) {
  console.warn(
    '[otp] OTP_HASH_SECRET is not set in production — codes are hashed with a well-known dev secret. Set OTP_HASH_SECRET.'
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[1-9]\d{6,14}$/;

/** Accepts only destinations that look like an email or an E.164-ish phone number. */
export function isValidOtpDestination(destination: string): boolean {
  return EMAIL_RE.test(destination) || PHONE_RE.test(destination);
}

/** Codes are stored hashed at rest — the plaintext only exists in transit. */
function hashCode(code: string, destination: string): string {
  return createHmac('sha256', OTP_HASH_SECRET).update(`${destination}:${code}`).digest('hex');
}

/**
 * Issue a 6-digit OTP for a destination (phone/email). Rate-limited per
 * destination. Returns the PLAINTEXT code for the caller to deliver (SMS);
 * only the hash is persisted.
 */
export async function requestOtp(
  destination: string,
  purpose: OtpPurpose,
  userId?: string | null
): Promise<{ ok: true; code: string } | { ok: false; error: string }> {
  if (!isValidOtpDestination(destination)) {
    return { ok: false, error: 'Enter a valid phone number or email address' };
  }

  const since = new Date(Date.now() - RESEND_WINDOW_S * 1000);
  const recent = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(s.otpCodes)
    .where(and(eq(s.otpCodes.destination, destination), gt(s.otpCodes.createdAt, since)));
  if ((recent[0]?.c ?? 0) >= 1) {
    return { ok: false, error: 'Please wait before requesting another code' };
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  await db.insert(s.otpCodes).values({
    userId: userId ?? null,
    destination,
    code: hashCode(code, destination),
    purpose,
    expiresAt: new Date(Date.now() + OTP_TTL_S * 1000),
  });
  return { ok: true, code };
}

/**
 * Verify a code for a destination+purpose. Enforces expiry, single-use, and a
 * per-code attempt lockout. Runs inside a transaction with the row locked so
 * two concurrent requests for the same code can't both pass the `consumed`
 * check before either UPDATE commits.
 */
export async function verifyOtp(
  destination: string,
  purpose: OtpPurpose,
  code: string
): Promise<{ ok: true; userId: string | null } | { ok: false; error: string }> {
  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(s.otpCodes)
      .where(
        and(
          eq(s.otpCodes.destination, destination),
          eq(s.otpCodes.purpose, purpose),
          eq(s.otpCodes.consumed, false)
        )
      )
      .orderBy(desc(s.otpCodes.createdAt))
      .limit(1)
      .for('update');

    const row = rows[0];
    if (!row) return { ok: false, error: 'No code requested' };
    if (row.expiresAt < new Date()) return { ok: false, error: 'Code expired' };
    if (row.attempts >= MAX_ATTEMPTS) return { ok: false, error: 'Too many attempts' };

    // Count this attempt before checking, so brute force is bounded.
    await tx.update(s.otpCodes).set({ attempts: row.attempts + 1 }).where(eq(s.otpCodes.id, row.id));

    if (row.code !== hashCode(code, destination)) return { ok: false, error: 'Invalid code' };

    await tx.update(s.otpCodes).set({ consumed: true }).where(eq(s.otpCodes.id, row.id));
    return { ok: true, userId: row.userId };
  });
}
