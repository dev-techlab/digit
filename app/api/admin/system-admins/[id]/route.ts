import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAdminIdFromRequest } from '@/lib/admin-auth';
import { isSuperAdmin } from '@/lib/rbac-core';
import bcrypt from 'bcryptjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const adminId = await getAdminIdFromRequest(req);
  if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!(await isSuperAdmin(adminId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const targetId = params.id;
  const body = await req.json().catch(() => ({}));

  const updateData: any = {};
  if (body.email) updateData.email = body.email;
  if (body.status) {
    if (['active', 'suspended', 'invited'].includes(body.status)) {
      updateData.status = body.status;
    }
  }
  if (body.password) {
    updateData.password_hash = await bcrypt.hash(body.password, 12);
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No valid fields provided to update' }, { status: 400 });
  }

  try {
    const updated = await db.admins.update({
      where: { id: targetId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        status: true,
      }
    });

    const changesToLog = { ...updateData };
    delete changesToLog.password_hash;

    await db.admin_audit_logs.create({
      data: {
        admin_id: adminId,
        action: 'update_admin',
        entity_type: 'admin',
        entity_id: targetId,
        changes: changesToLog,
      }
    });

    return NextResponse.json({ admin: updated });
  } catch (e: any) {
    if (e.code === 'P2002') {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }
    if (e.code === 'P2025') {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
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
    const deleted = await db.admins.delete({
      where: { id: targetId },
      select: { id: true }
    });

    await db.admin_audit_logs.create({
      data: {
        admin_id: adminId,
        action: 'delete_admin',
        entity_type: 'admin',
        entity_id: targetId,
      }
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e.code === 'P2025') {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }
    console.error(e);
    return NextResponse.json(
      { error: 'Failed to delete admin. They may have dependent records.' },
      { status: 500 }
    );
  }
}
