import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { getAdminIdFromRequest } from '@/lib/admin-auth';
import { setPassword } from '@/lib/admin-service';
import { ADMIN_SESSION_COOKIE } from '@/lib/auth-tokens';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

  const admin = await db.admins.findUnique({ where: { id: adminId } });
  if (!admin || !(await bcrypt.compare(currentPassword, admin.password_hash))) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
  }

  await setPassword(adminId, newPassword);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_SESSION_COOKIE, '', { path: '/', maxAge: 0 });
  return res;
}
