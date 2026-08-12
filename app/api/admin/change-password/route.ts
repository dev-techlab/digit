import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getAdminIdFromRequest } from '@/lib/admin-auth';
import { setPassword } from '@/lib/admin-service';
import { ADMIN_SESSION_COOKIE } from '@/lib/auth-tokens';
const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

export async function POST(req: Request) {
  try {
    const adminId = await getAdminIdFromRequest(req);
    if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const parseResult = passwordSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = parseResult.data;

    const admin = await db.admins.findUnique({ where: { id: adminId } });
    if (!admin || !(await bcrypt.compare(currentPassword, admin.password_hash))) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    }

    await setPassword(adminId, newPassword);

    const res = NextResponse.json({ ok: true });
    res.cookies.set(ADMIN_SESSION_COOKIE, '', { path: '/', maxAge: 0 });
    return res;
  } catch (err: any) {
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
    console.error('POST /api/admin/change-password', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
