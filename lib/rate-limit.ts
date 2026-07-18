/**
 * In-memory login rate limiter. Per-process only (no shared store) — fine for
 * a single-instance deployment; a multi-instance deployment would need this
 * backed by Redis/DB instead.
 */
interface Bucket {
  count: number;
  firstAttemptAt: number;
  lockedUntil: number;
}

const WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const buckets = new Map<string, Bucket>();

export function checkLoginRateLimit(key: string): { allowed: boolean; retryAfterMs: number } {
  const bucket = buckets.get(key);
  if (!bucket) return { allowed: true, retryAfterMs: 0 };
  const now = Date.now();
  if (bucket.lockedUntil > now) return { allowed: false, retryAfterMs: bucket.lockedUntil - now };
  if (now - bucket.firstAttemptAt > WINDOW_MS) {
    buckets.delete(key);
    return { allowed: true, retryAfterMs: 0 };
  }
  return { allowed: true, retryAfterMs: 0 };
}

export function recordLoginFailure(key: string): void {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now - bucket.firstAttemptAt > WINDOW_MS) {
    buckets.set(key, { count: 1, firstAttemptAt: now, lockedUntil: 0 });
    return;
  }
  bucket.count += 1;
  if (bucket.count >= MAX_ATTEMPTS) bucket.lockedUntil = now + LOCKOUT_MS;
}

export function recordLoginSuccess(key: string): void {
  buckets.delete(key);
}
