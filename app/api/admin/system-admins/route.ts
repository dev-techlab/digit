import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAdminIdFromRequest } from '@/lib/admin-auth';
import { isSuperAdmin } from '@/lib/rbac-core';
import bcrypt from 'bcryptjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const adminId = await getAdminIdFromRequest(req);
  if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!(await isSuperAdmin(adminId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const search = url.searchParams.get('search') || '';
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get('pageSize') || '20', 10))
  );

  const where: any = {};
  if (search) {
    where.OR = [
      { username: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [results, count] = await Promise.all([
    db.admins.findMany({
      where,
      select: {
        id: true,
        username: true,
        email: true,
        status: true,
        last_login_at: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
      take: pageSize,
      skip: (page - 1) * pageSize,
    }),
    db.admins.count({ where }),
  ]);

  const formatted = results.map(r => ({
    id: r.id,
    username: r.username,
    email: r.email,
    status: r.status,
    lastLoginAt: r.last_login_at,
    createdAt: r.created_at,
  }));

  return NextResponse.json({
    admins: formatted,
    total: count,
  });
}

export async function POST(req: Request) {
  const adminId = await getAdminIdFromRequest(req);
  if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!(await isSuperAdmin(adminId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { username, email, password } = body;

  if (!username || !email || !password) {
    return NextResponse.json(
      { error: 'Username, email, and password are required' },
      { status: 400 }
    );
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const newAdmin = await db.admins.create({
      data: {
        username,
        email,
        password_hash: passwordHash,
        created_by_admin_id: adminId,
      },
      select: {
        id: true,
        username: true,
        email: true,
      }
    });

    await db.admin_audit_logs.create({
      data: {
        admin_id: adminId,
        action: 'create_admin',
        entity_type: 'admin',
        entity_id: newAdmin.id,
        changes: { username, email },
      }
    });

    return NextResponse.json({ admin: newAdmin });
  } catch (e: any) {
    if (e.code === 'P2002') {
      return NextResponse.json({ error: 'Username or email already exists' }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: 'Failed to create admin' }, { status: 500 });
  }
}
