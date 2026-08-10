import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { revokeAdminSessionByToken } from '@/lib/admin-service';
import { ADMIN_SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth-tokens';


/** POST /api/admin/logout — revoke the current admin session + clear the cookie. */
export async function POST() {
  try {
    const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
    if (token) await revokeAdminSessionByToken(token);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(ADMIN_SESSION_COOKIE, '', sessionCookieOptions(0));
    return res;
  } catch (err: any) {
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
    console.error('POST /api/admin/logout', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
