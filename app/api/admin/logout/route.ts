import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { revokeAdminSessionByToken } from '@/lib/admin-service';
import { ADMIN_SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth-tokens';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/admin/logout — revoke the current admin session + clear the cookie. */
export async function POST() {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  if (token) await revokeAdminSessionByToken(token);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_SESSION_COOKIE, '', sessionCookieOptions(0));
  return res;
}
