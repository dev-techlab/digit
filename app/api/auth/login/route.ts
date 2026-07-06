import { NextResponse } from 'next/server';
import { verifyUserLogin, createUserSession, getUserProfile } from '@/lib/user-service';
import { USER_SESSION_COOKIE, USER_SESSION_TTL_S, sessionCookieOptions } from '@/lib/auth-tokens';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/auth/login — { username, password } → sets the session cookie. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
  }

  const userId = await verifyUserLogin(username, password);
  if (!userId) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

  const { token } = await createUserSession(userId, {
    userAgent: req.headers.get('user-agent') ?? undefined,
  });
  const res = NextResponse.json({ ok: true, user: await getUserProfile(userId) });
  res.cookies.set(USER_SESSION_COOKIE, token, sessionCookieOptions(USER_SESSION_TTL_S));
  return res;
}
