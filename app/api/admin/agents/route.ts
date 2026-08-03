import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { db } from '@/lib/db';
import { getAdminIdFromRequest } from '@/lib/admin-auth';
import { requirePermission, PermissionError } from '@/lib/rbac-core';
import { clientIp, logAdminAction } from '@/lib/audit-log';

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
  const { error } = await authorize(req, 'agents.read');
  if (error) return error;

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize')) || 20));
  const search = url.searchParams.get('search')?.trim();

  const where: any = { type: 'store', last_login_at: { not: null } };
  if (search) {
    where.OR = [
      { username: { contains: search, mode: 'insensitive' } },
      { nickname: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [rows, count] = await Promise.all([
    db.agents.findMany({
      where,
      select: {
        id: true,
        username: true,
        nickname: true,
        email: true,
        invite_code: true,
        commission_per: true,
        online_balance: true,
        status: true,
        remark: true,
        last_login_at: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
      take: pageSize,
      skip: (page - 1) * pageSize,
    }),
    db.agents.count({ where }),
  ]);

  const formattedRows = rows.map(r => ({
    id: r.id,
    username: r.username,
    nickname: r.nickname,
    email: r.email,
    inviteCode: r.invite_code,
    commissionPer: r.commission_per,
    onlineBalance: r.online_balance,
    status: r.status,
    remark: r.remark,
    lastLoginAt: r.last_login_at,
    createdAt: r.created_at,
  }));

  return NextResponse.json({ agents: formattedRows, total: count });
}

export async function POST(req: Request) {
  const { error, adminId } = await authorize(req, 'agents.write');
  if (error) return error;

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const nickname = typeof body.nickname === 'string' ? body.nickname.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const remark = typeof body.remark === 'string' ? body.remark.slice(0, 300) : null;

  if (!username || username.length < 4) {
    return NextResponse.json({ error: 'Username must be at least 4 characters' }, { status: 400 });
  }
  if (!password || password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
  }

  try {
    const created = await db.agents.create({
      data: {
        type: 'store',
        username,
        password_hash: await bcrypt.hash(password, 10),
        nickname: nickname || username,
        email: email || null,
        commission_per: Number.isFinite(Number(body.commissionPer))
          ? String(body.commissionPer)
          : '0',
        invite_code: `MC${randomBytes(8).toString('hex').toUpperCase()}`,
        remark,
      }
    });

    await db.agents.update({
      where: { id: created.id },
      data: { store_id: created.id }
    });

    await db.store_settings.create({ data: { store_id: created.id } });

    const platformIds = Array.isArray(body.platformIds)
      ? body.platformIds.filter((id: unknown): id is string => typeof id === 'string')
      : [];
    if (platformIds.length > 0) {
      await db.agent_platform_mappings.createMany({
        data: platformIds.map((platformId: string) => ({ agent_id: created.id, platform_id: platformId }))
      });
    }

    await logAdminAction({
      adminId,
      action: 'agent.create',
      entityType: 'agent',
      entityId: created.id,
      changes: { username, nickname: nickname || username, email: email || null },
      ipAddress: clientIp(req),
    });
    return NextResponse.json(
      { agent: { id: created.id, username, password }, ok: true },
      { status: 201 }
    );
  } catch (err: any) {
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
    }
    console.error('POST /api/admin/agents', err);
    return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const { error, adminId } = await authorize(req, 'agents.write');
  if (error) return error;

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const id = typeof body.id === 'string' ? body.id : '';
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const set: any = {};
  if (body.status === 'active' || body.status === 'disabled') set.status = body.status;
  if (body.commissionPer != null && Number.isFinite(Number(body.commissionPer)))
    set.commission_per = String(body.commissionPer);
  if (typeof body.password === 'string' && body.password.length >= 6) {
    set.password_hash = await bcrypt.hash(body.password, 10);
  }
  if (typeof body.nickname === 'string') set.nickname = body.nickname.trim() || null;
  if (typeof body.email === 'string') set.email = body.email.trim() || null;
  if (typeof body.remark === 'string') set.remark = body.remark.slice(0, 300) || null;

  if (Object.keys(set).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const existing = await db.agents.findFirst({
    where: { id, type: 'store' }
  });

  if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const row = await db.agents.update({
    where: { id: existing.id },
    data: set,
    select: { id: true }
  });

  if (set.status) {
    await db.agent_sessions.updateMany({
      where: { agent_id: id, revoked_at: null },
      data: { revoked_at: new Date() }
    });
  }

  const changes: Record<string, unknown> = {};
  if (set.nickname !== undefined) changes.nickname = set.nickname;
  if (set.email !== undefined) changes.email = set.email;
  if (set.remark !== undefined) changes.remark = set.remark;
  if (set.commission_per !== undefined) changes.commissionPer = set.commission_per;
  if (set.password_hash !== undefined) changes.password = '[redacted]';
  if (set.status !== undefined) changes.status = set.status;

  await logAdminAction({
    adminId,
    action: set.status ? `agent.${set.status === 'active' ? 'unblock' : 'block'}` : 'agent.update',
    entityType: 'agent',
    entityId: id,
    changes,
    ipAddress: clientIp(req),
  });
  return NextResponse.json({ ok: true });
}
