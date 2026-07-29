import { NextResponse } from 'next/server';
import { desc, or, ilike, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as s from '@/lib/db/schema';
import { getAdminIdFromRequest } from '@/lib/admin-auth';
import { isSuperAdmin } from '@/lib/rbac-core';
import bcrypt from 'bcryptjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const adminId = await getAdminIdFromRequest(req);
  if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Only super admins can manage system admins
  if (!(await isSuperAdmin(adminId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const search = url.searchParams.get('search') || '';
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') || '20', 10)));
  const offset = (page - 1) * pageSize;

  let whereClause = sql`1=1`;
  if (search) {
    const q = `%${search}%`;
    whereClause = or(ilike(s.admins.username, q), ilike(s.admins.email, q)) as any;
  }

  const [countRes] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(s.admins)
    .where(whereClause);

  const results = await db
    .select({
      id: s.admins.id,
      username: s.admins.username,
      email: s.admins.email,
      status: s.admins.status,
      lastLoginAt: s.admins.lastLoginAt,
      createdAt: s.admins.createdAt,
    })
    .from(s.admins)
    .where(whereClause)
    .orderBy(desc(s.admins.createdAt))
    .limit(pageSize)
    .offset(offset);

  return NextResponse.json({
    admins: results,
    total: countRes?.count ?? 0,
  });
}

export async function POST(req: Request) {
  const adminId = await getAdminIdFromRequest(req);
  if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Only super admins can create new system admins
  if (!(await isSuperAdmin(adminId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { username, email, password } = body;

  if (!username || !email || !password) {
    return NextResponse.json({ error: 'Username, email, and password are required' }, { status: 400 });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const [newAdmin] = await db.insert(s.admins).values({
      username,
      email,
      passwordHash,
      createdByAdminId: adminId,
    }).returning({
      id: s.admins.id,
      username: s.admins.username,
      email: s.admins.email,
    });

    // Log the creation
    await db.insert(s.adminAuditLogs).values({
      adminId,
      action: 'create_admin',
      entityType: 'admin',
      entityId: newAdmin.id,
      changes: { username, email },
    });

    return NextResponse.json({ admin: newAdmin });
  } catch (e: any) {
    if (e.code === '23505') { // Unique violation
      return NextResponse.json({ error: 'Username or email already exists' }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: 'Failed to create admin' }, { status: 500 });
  }
}
