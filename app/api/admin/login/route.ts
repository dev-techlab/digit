import { NextResponse } from 'next/server';
import { verifyAdminLogin, createAdminSession } from '@/lib/admin-service';
import { effectivePermissions } from '@/lib/rbac-core';
import { ADMIN_SESSION_COOKIE, ADMIN_SESSION_TTL_S, sessionCookieOptions } from '@/lib/auth-tokens';
import { checkLoginRateLimit, recordLoginFailure, recordLoginSuccess } from '@/lib/rate-limit';
import { clientIp, logAdminAction } from '@/lib/audit-log';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email address').transform(s => s.toLowerCase().trim()),
  password: z.string().min(1, 'Password is required')
});

/** POST /api/admin/login — { email, password } → sets the admin_session cookie. */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const parseResult = loginSchema.safeParse(body);
    
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }
  
    const { email, password } = parseResult.data;
  
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
  } catch (err: any) {
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
    console.error('POST /api/admin/login', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
