import { NextResponse } from 'next/server';
import { verifyAdminLogin, createAdminSession } from '@/lib/admin-service';
import { effectivePermissions } from '@/lib/rbac-core';
import { ADMIN_SESSION_COOKIE, ADMIN_SESSION_TTL_S, sessionCookieOptions } from '@/lib/auth-tokens';
import { checkLoginRateLimit, recordLoginFailure, recordLoginSuccess } from '@/lib/rate-limit';
import { clientIp, logAdminAction } from '@/lib/audit-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/admin/login — { email, password } → sets the admin_session cookie. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const email = typeof body.email === 'string' ? body.email : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }

  const ip = clientIp(req);
  const rateLimitKey = `${email.toLowerCase()}:${ip ?? 'unknown'}`;
  const { allowed, retryAfterMs } = checkLoginRateLimit(rateLimitKey);
  if (!allowed) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${Math.ceil(retryAfterMs / 60000)} minute(s).` },
      { status: 429 }
    );
  }

  const adminId = await verifyAdminLogin(email, password);
  if (!adminId) {
    recordLoginFailure(rateLimitKey);
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }
  recordLoginSuccess(rateLimitKey);

  const { token } = await createAdminSession(adminId, {
    userAgent: req.headers.get('user-agent') ?? undefined,
  });
  const permissions = await effectivePermissions(adminId);
  await logAdminAction({ adminId, action: 'admin.login', ipAddress: ip });

  const res = NextResponse.json({ ok: true, adminId, permissions });
  res.cookies.set(ADMIN_SESSION_COOKIE, token, sessionCookieOptions(ADMIN_SESSION_TTL_S));
  return res;
}
