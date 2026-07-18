import { NextResponse } from 'next/server';
import {
  registerUser,
  createUserSession,
  getUserProfile,
  UserConflictError,
} from '@/lib/user-service';
import { USER_SESSION_COOKIE, USER_SESSION_TTL_S, sessionCookieOptions } from '@/lib/auth-tokens';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/register — { username?, password? }.
 * Omit both for Quick Register (server generates + returns them once).
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const username = typeof body.username === 'string' ? body.username : undefined;
  const password = typeof body.password === 'string' ? body.password : undefined;
  const inviteCode = typeof body.inviteCode === 'string' ? body.inviteCode : undefined;
  if (password != null && password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
  }

  try {
    const created = await registerUser({ username, password, inviteCode });
    const { token } = await createUserSession(created.id, {
      userAgent: req.headers.get('user-agent') ?? undefined,
    });
    const res = NextResponse.json(
      {
        ok: true,
        user: await getUserProfile(created.id),
        // Only surface generated credentials (Quick Register shows them once).
        credentials: created.generated
          ? { username: created.username, password: created.password }
          : undefined,
      },
      { status: 201 }
    );
    res.cookies.set(USER_SESSION_COOKIE, token, sessionCookieOptions(USER_SESSION_TTL_S));
    return res;
  } catch (err) {
    if (err instanceof UserConflictError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error('POST /api/auth/register', err);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
