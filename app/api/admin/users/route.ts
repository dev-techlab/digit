import { NextResponse } from 'next/server';
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as s from '@/lib/db/schema';
import { getAdminIdFromRequest } from '@/lib/admin-auth';
import { requirePermission, PermissionError } from '@/lib/rbac-core';
import { clientIp, logAdminAction } from '@/lib/audit-log';
import { blockUser, unblockUser } from '@/lib/user-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Resolve + permission-check the caller; returns the adminId or a ready-to-return error response. */
async function authorize(
  req: Request,
  permKey: string
): Promise<{ adminId: string; error: undefined } | { adminId: undefined; error: NextResponse }> {
  const adminId = await getAdminIdFromRequest(req);
  if (!adminId)
    return { adminId: undefined, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  try {
    await requirePermission(adminId, permKey);
  } catch (e) {
    if (e instanceof PermissionError) {
      return { adminId: undefined, error: NextResponse.json({ error: e.message }, { status: e.status }) };
    }
    throw e;
  }
  return { adminId, error: undefined };
}

/**
 * GET /api/admin/users?page=&pageSize=&search=&status= — every player who
 * self-registered on the site (home page / game lobby "Quick Register" or
 * manual sign-up), with their wallet balances.
 */
export async function GET(req: Request) {
  const { error } = await authorize(req, 'users.read');
  if (error) return error;

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize')) || 20));
  const search = url.searchParams.get('search')?.trim();
  const status = url.searchParams.get('status');

  const where = and(
    search
      ? or(
          ilike(s.users.username, `%${search}%`),
          ilike(s.users.nickname, `%${search}%`),
          ilike(s.users.email, `%${search}%`),
          ilike(s.users.phone, `%${search}%`)
        )
      : undefined,
    status === 'active' || status === 'blocked' ? eq(s.users.status, status) : undefined
  );

  const [rows, [{ count }]] = await Promise.all([
    db
      .select({
        id: s.users.id,
        username: s.users.username,
        nickname: s.users.nickname,
        email: s.users.email,
        phone: s.users.phone,
        phoneBound: s.users.phoneBound,
        kycStatus: s.users.kycStatus,
        status: s.users.status,
        inviteCode: s.users.inviteCode,
        createdAt: s.users.createdAt,
        goldCoin: s.wallets.goldCoin,
        onlineSc: s.wallets.onlineSc,
      })
      .from(s.users)
      .leftJoin(s.wallets, eq(s.wallets.userId, s.users.id))
      .where(where)
      .orderBy(desc(s.users.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ count: sql<number>`count(*)::int` }).from(s.users).where(where),
  ]);

  return NextResponse.json({ users: rows, total: count });
}

/** PUT /api/admin/users — { id, status: 'active'|'blocked' } toggle a player's access. */
export async function PUT(req: Request) {
  const { error, adminId } = await authorize(req, 'users.write');
  if (error) return error;

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const id = typeof body.id === 'string' ? body.id : '';
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  if (body.status !== 'active' && body.status !== 'blocked') {
    return NextResponse.json({ error: 'status must be "active" or "blocked"' }, { status: 400 });
  }

  const [existing] = await db.select({ id: s.users.id }).from(s.users).where(eq(s.users.id, id));
  if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 });

  if (body.status === 'blocked') await blockUser(id);
  else await unblockUser(id);

  await logAdminAction({
    adminId,
    action: body.status === 'blocked' ? 'user.block' : 'user.unblock',
    entityType: 'user',
    entityId: id,
    ipAddress: clientIp(req),
  });
  return NextResponse.json({ ok: true });
}
