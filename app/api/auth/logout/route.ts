import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { revokeUserSession } from '@/lib/user-service';
import { USER_SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth-tokens';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/auth/logout — revoke the current session + clear the cookie. */
export async function POST() {
  const token = cookies().get(USER_SESSION_COOKIE)?.value;
  if (token) await revokeUserSession(token);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(USER_SESSION_COOKIE, '', sessionCookieOptions(0));
  return res;
}
