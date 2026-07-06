import { NextResponse } from 'next/server';
import { verifyOtp, type OtpPurpose } from '@/lib/otp';
import { createUserSession, getUserProfile, userIdByPhone } from '@/lib/user-service';
import { otpPurposeEnum } from '@/lib/db/schema';
import { USER_SESSION_COOKIE, USER_SESSION_TTL_S, sessionCookieOptions } from '@/lib/auth-tokens';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PURPOSES = new Set<string>(otpPurposeEnum.enumValues);

/**
 * POST /api/auth/otp/verify — { destination, purpose, code }.
 * For a `login` purpose that resolves to a phone-bound user, also starts a
 * session and sets the cookie.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const destination = typeof body.destination === 'string' ? body.destination.trim() : '';
  const purpose = typeof body.purpose === 'string' ? body.purpose : '';
  const code = typeof body.code === 'string' ? body.code : '';
  if (!destination || !PURPOSES.has(purpose) || !code) {
    return NextResponse.json({ error: 'destination, purpose and code are required' }, { status: 400 });
  }

  const result = await verifyOtp(destination, purpose as OtpPurpose, code);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  // Phone-OTP login: resolve the phone to a user and start a session.
  if (purpose === 'login') {
    const userId = result.userId ?? (await userIdByPhone(destination));
    if (userId) {
      const { token } = await createUserSession(userId, {
        userAgent: req.headers.get('user-agent') ?? undefined,
      });
      const res = NextResponse.json({ ok: true, user: await getUserProfile(userId) });
      res.cookies.set(USER_SESSION_COOKIE, token, sessionCookieOptions(USER_SESSION_TTL_S));
      return res;
    }
  }

  return NextResponse.json({ ok: true, userId: result.userId });
}
