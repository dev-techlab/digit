import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as s from '@/lib/db/schema';
import { getAdminIdFromRequest } from '@/lib/admin-auth';
import { isSuperAdmin } from '@/lib/rbac-core';
import bcrypt from 'bcryptjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const adminId = await getAdminIdFromRequest(req);
  if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Only super admins can update system admins
  if (!(await isSuperAdmin(adminId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const targetId = params.id;
  const body = await req.json().catch(() => ({}));

  // Ensure we don't accidentally let a user lock themselves out if it's the only super admin
  // For safety, we allow it but ideally there should be more checks for deleting/suspending the last super admin.

  const updateData: any = {};
  if (body.email) updateData.email = body.email;
  if (body.status) {
    if (['active', 'suspended', 'invited'].includes(body.status)) {
      updateData.status = body.status;
    }
  }
  if (body.password) {
    updateData.passwordHash = await bcrypt.hash(body.password, 12);
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No valid fields provided to update' }, { status: 400 });
  }

  try {
    const [updated] = await db
      .update(s.admins)
      .set(updateData)
      .where(eq(s.admins.id, targetId))
      .returning({
        id: s.admins.id,
        username: s.admins.username,
        email: s.admins.email,
        status: s.admins.status,
      });

    if (!updated) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    // Log the update
    const changesToLog = { ...updateData };
    delete changesToLog.passwordHash; // Don't log passwords
    
    await db.insert(s.adminAuditLogs).values({
      adminId,
      action: 'update_admin',
      entityType: 'admin',
      entityId: targetId,
      changes: changesToLog,
    });

    return NextResponse.json({ admin: updated });
  } catch (e: any) {
    if (e.code === '23505') {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: 'Failed to update admin' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const adminId = await getAdminIdFromRequest(req);
  if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!(await isSuperAdmin(adminId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const targetId = params.id;

  if (adminId === targetId) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
  }

  try {
    const [deleted] = await db
      .delete(s.admins)
      .where(eq(s.admins.id, targetId))
      .returning({ id: s.admins.id });

    if (!deleted) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    await db.insert(s.adminAuditLogs).values({
      adminId,
      action: 'delete_admin',
      entityType: 'admin',
      entityId: targetId,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to delete admin. They may have dependent records.' }, { status: 500 });
  }
}
