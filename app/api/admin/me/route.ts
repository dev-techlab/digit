import { NextResponse } from 'next/server';
import { getAdminIdFromRequest } from '@/lib/admin-auth';
import { effectivePermissions, isSuperAdmin } from '@/lib/rbac-core';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/admin/me — current admin id, super flag, and effective permissions. */
export async function GET(req: Request) {
  const adminId = await getAdminIdFromRequest(req);
  if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const [permissions, superAdmin] = await Promise.all([
    effectivePermissions(adminId),
    isSuperAdmin(adminId),
  ]);
  return NextResponse.json({ adminId, isSuperAdmin: superAdmin, permissions });
}
