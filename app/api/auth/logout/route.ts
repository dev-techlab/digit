import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { revokeUserSession } from '@/lib/user-service';
import { USER_SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth-tokens';

/** POST /api/auth/logout — revoke the current session + clear the cookie. */
export async function POST() {
  try {
    const token = cookies().get(USER_SESSION_COOKIE)?.value;
    if (token) await revokeUserSession(token);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(USER_SESSION_COOKIE, '', sessionCookieOptions(0));
    return res;
  } catch (err: any) {
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
    console.error('POST /api/auth/logout', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
