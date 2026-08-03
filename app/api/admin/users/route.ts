import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAdminIdFromRequest } from '@/lib/admin-auth';
import { requirePermission, PermissionError } from '@/lib/rbac-core';
import { clientIp, logAdminAction } from '@/lib/audit-log';
import { blockUser, unblockUser } from '@/lib/user-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function authorize(
  req: Request,
  permKey: string
): Promise<{ adminId: string; error: undefined } | { adminId: undefined; error: NextResponse }> {
  const adminId = await getAdminIdFromRequest(req);
  if (!adminId)
    return {
      adminId: undefined,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  try {
    await requirePermission(adminId, permKey);
  } catch (e) {
    if (e instanceof PermissionError) {
      return {
        adminId: undefined,
        error: NextResponse.json({ error: e.message }, { status: e.status }),
      };
    }
    throw e;
  }
  return { adminId, error: undefined };
}

export async function GET(req: Request) {
  const { error } = await authorize(req, 'users.read');
  if (error) return error;

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize')) || 20));
  const search = url.searchParams.get('search')?.trim();
  const status = url.searchParams.get('status');

  const where: any = {};
  if (status === 'active' || status === 'blocked') {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { username: { contains: search, mode: 'insensitive' } },
      { nickname: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [rows, count] = await Promise.all([
    db.users.findMany({
      where,
      select: {
        id: true,
        username: true,
        nickname: true,
        email: true,
        phone: true,
        phone_bound: true,
        kyc_status: true,
        status: true,
        invite_code: true,
        created_at: true,
        wallets: {
          select: {
            gold_coin: true,
            online_sc: true,
          }
        }
      },
      orderBy: { created_at: 'desc' },
      take: pageSize,
      skip: (page - 1) * pageSize,
    }),
    db.users.count({ where }),
  ]);

  const formattedRows = rows.map(r => ({
    id: r.id,
    username: r.username,
    nickname: r.nickname,
    email: r.email,
    phone: r.phone,
    phoneBound: r.phone_bound,
    kycStatus: r.kyc_status,
    status: r.status,
    inviteCode: r.invite_code,
    createdAt: r.created_at,
    goldCoin: r.wallets?.gold_coin,
    onlineSc: r.wallets?.online_sc,
  }));

  return NextResponse.json({ users: formattedRows, total: count });
}

export async function PUT(req: Request) {
  const { error, adminId } = await authorize(req, 'users.write');
  if (error) return error;

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const id = typeof body.id === 'string' ? body.id : '';
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  if (body.status !== 'active' && body.status !== 'blocked') {
    return NextResponse.json({ error: 'status must be "active" or "blocked"' }, { status: 400 });
  }

  const existing = await db.users.findUnique({ where: { id }, select: { id: true } });
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
