import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import * as s from '@/lib/db/schema';
import { getAdminIdFromRequest } from '@/lib/admin-auth';
import { setPassword } from '@/lib/admin-service';
import { ADMIN_SESSION_COOKIE } from '@/lib/auth-tokens';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/admin/change-password — { currentPassword, newPassword }. Self-service; requires the current password. */
export async function POST(req: Request) {
  const adminId = await getAdminIdFromRequest(req);
  if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';
  if (!currentPassword || newPassword.length < 6) {
    return NextResponse.json(
      { error: 'Current password and a new password (6+ characters) are required' },
      { status: 400 }
    );
  }

  const admin = await db.query.admins.findFirst({ where: (t, { eq }) => eq(t.id, adminId) });
  if (!admin || !(await bcrypt.compare(currentPassword, admin.passwordHash))) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
  }

  // Self-service: proving the current password IS the authorization, so no actor
  // param (that guard is for one admin changing another's password).
  await setPassword(adminId, newPassword);

  const res = NextResponse.json({ ok: true });
  // setPassword revoked every session including this request's — clear the cookie
  // so the client doesn't keep sending a dead token.
  res.cookies.set(ADMIN_SESSION_COOKIE, '', { path: '/', maxAge: 0 });
  return res;
}
