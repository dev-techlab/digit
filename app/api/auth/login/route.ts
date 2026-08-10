import { NextResponse } from 'next/server';
import { verifyUserLogin, createUserSession, getUserProfile } from '@/lib/user-service';
import { USER_SESSION_COOKIE, USER_SESSION_TTL_S, sessionCookieOptions } from '@/lib/auth-tokens';
import { z } from 'zod';

const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required')
});


/** POST /api/auth/login — { username, password } → sets the session cookie. */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const parseResult = loginSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error.issues[0]?.message || 'Invalid input' }, { status: 400 });
    }

    const { username, password } = parseResult.data;

    const userId = await verifyUserLogin(username, password);
    if (!userId) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

    const { token } = await createUserSession(userId, {
      userAgent: req.headers.get('user-agent') ?? undefined,
    });
    const res = NextResponse.json({ ok: true, user: await getUserProfile(userId) });
    res.cookies.set(USER_SESSION_COOKIE, token, sessionCookieOptions(USER_SESSION_TTL_S));
    return res;
  } catch (err: any) {
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
    console.error('POST /api/auth/login', err);
    return NextResponse.json({ error: (err as any)?.message || 'Internal server error' }, { status: 500 });
  }
}
