import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyOtp, type OtpPurpose, isValidOtpDestination } from '@/lib/otp';
import { createUserSession, getUserProfile, userIdByPhone } from '@/lib/user-service';
import { db } from '@/lib/db';
import { USER_SESSION_COOKIE, USER_SESSION_TTL_S, sessionCookieOptions } from '@/lib/auth-tokens';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PURPOSES = new Set<string>(['login', 'register', 'reset_password']);

const verifySchema = z.object({
  destination: z.string().min(1, 'Destination (email/phone) is required').trim(),
  purpose: z.string().refine(val => PURPOSES.has(val), { message: 'Invalid OTP purpose' }),
  code: z.string().min(6, 'Verification code must be exactly 6 digits').max(6, 'Verification code must be exactly 6 digits'),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  
  const parseResult = verifySchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json({ error: parseResult.error.issues[0].message }, { status: 400 });
  }

  const { destination, purpose, code } = parseResult.data;

  const result = await verifyOtp(destination, purpose as OtpPurpose, code);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

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
  } else if (purpose === 'register' && result.userId) {
    const user = await db.users.findUnique({
      where: { id: result.userId! }
    });
    if (user) {
      if (user.phone === destination) {
        await db.users.update({
          where: { id: user.id },
          data: { phone_bound: true }
        });
      }
      const { token } = await createUserSession(user.id, {
        userAgent: req.headers.get('user-agent') ?? undefined,
      });
      const res = NextResponse.json({ ok: true, user: await getUserProfile(user.id) });
      res.cookies.set(USER_SESSION_COOKIE, token, sessionCookieOptions(USER_SESSION_TTL_S));
      return res;
    }
  }

  return NextResponse.json({ ok: true, userId: result.userId });
}
