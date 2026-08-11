import { NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { db } from '@/lib/db';
import { getAdminIdFromRequest } from '@/lib/admin-auth';
import { isSuperAdmin } from '@/lib/rbac-core';
import bcrypt from 'bcryptjs';


const putSchema = z.object({
  email: z.string().email().optional(),
  status: z.enum(['active', 'suspended', 'invited']).optional(),
  password: z.string().min(6).optional(),
});

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const adminId = await getAdminIdFromRequest(req);
  if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!(await isSuperAdmin(adminId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const targetId = params.id;

  try {
    const body = await req.json();
    const data = putSchema.parse(body);

    const updateData: any = {};
    if (data.email) updateData.email = data.email;
    if (data.status) updateData.status = data.status;
    if (data.password) {
      updateData.password_hash = await bcrypt.hash(data.password, 12);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields provided to update' }, { status: 400 });
    }

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
    if (e && (e.digest === 'DYNAMIC_SERVER_USAGE' || e.message?.includes('NEXT_'))) throw e;
    if (e instanceof ZodError) {
      return NextResponse.json({ error: e.issues[0].message }, { status: 400 });
    }
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
    if (e && (e.digest === 'DYNAMIC_SERVER_USAGE' || e.message?.includes('NEXT_'))) throw e;
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
