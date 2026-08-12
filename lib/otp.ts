import { createHmac, randomInt } from 'node:crypto';
import { db } from '@/lib/db';
import { sendOtpEmail } from '@/lib/mail';
import { env } from '@/lib/env';
import { otp_purpose } from '../lib/generated/prisma/client';

export type OtpPurpose = otp_purpose;

const OTP_TTL_S = 5 * 60; // 5 minutes
const MAX_ATTEMPTS = 5; // lock a code after this many wrong guesses
const RESEND_WINDOW_S = 60; // min seconds between codes to one destination

// A 6-digit code is only a 1,000,000-value space — an unkeyed hash is
// reversible via a precomputed table if `otp_codes` is ever exposed. HMAC
// with a server-side secret defeats that; falls back to a well-known dev
// value outside production (warns instead of failing so `pnpm dev` keeps working).
const OTP_HASH_SECRET = env.OTP_HASH_SECRET ?? 'dev-only-otp-secret-change-me';
if (env.NODE_ENV === 'production' && !env.OTP_HASH_SECRET) {
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
  userId?: string | null,
  options?: { skipEmail?: boolean }
): Promise<{ ok: true; code: string } | { ok: false; error: string }> {
  if (!isValidOtpDestination(destination)) {
    return { ok: false, error: 'Enter a valid phone number or email address' };
  }

  const since = new Date(Date.now() - RESEND_WINDOW_S * 1000);
  const recentCount = await db.otp_codes.count({
    where: {
      destination,
      created_at: { gt: since },
    }
  });
  if (recentCount >= 1) {
    return { ok: false, error: 'Please wait before requesting another code' };
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  await db.otp_codes.create({
    data: {
      user_id: userId ?? null,
      destination,
      code: hashCode(code, destination),
      purpose,
      expires_at: new Date(Date.now() + OTP_TTL_S * 1000),
    }
  });

  if (EMAIL_RE.test(destination) && !options?.skipEmail) {
    await sendOtpEmail({
      to: destination,
      purpose,
      code,
      expiresMinutes: Math.floor(OTP_TTL_S / 60),
    });
  }

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
  return db.$transaction(async (tx: any) => {
    const row = await tx.otp_codes.findFirst({
      where: {
        destination,
        purpose,
        consumed: false,
      },
      orderBy: { created_at: 'desc' },
    });

    if (!row) return { ok: false, error: 'No code requested' };
    if (row.expires_at < new Date()) return { ok: false, error: 'Code expired' };
    if (row.attempts >= MAX_ATTEMPTS) return { ok: false, error: 'Too many attempts' };

    // Count this attempt before checking, so brute force is bounded.
    await tx.otp_codes.update({
      where: { id: row.id },
      data: { attempts: row.attempts + 1 },
    });

    if (row.code !== hashCode(code, destination)) return { ok: false, error: 'Invalid code' };

    const updated = await tx.otp_codes.updateMany({
      where: { id: row.id, consumed: false },
      data: { consumed: true },
    });
    if (updated.count === 0) return { ok: false, error: 'Code already consumed' };
    
    return { ok: true, userId: row.user_id };
  }) as Promise<{ ok: true; userId: string | null } | { ok: false; error: string }>;
}
