import { NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { db } from '@/lib/db';
import { getAdminIdFromRequest } from '@/lib/admin-auth';
import { requirePermission, PermissionError } from '@/lib/rbac-core';
import { clientIp, logAdminAction } from '@/lib/audit-log';


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
  try {
    const { error } = await authorize(req, 'agents.read');
    if (error) return error;
  
    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize')) || 20));
    const search = url.searchParams.get('search')?.trim();
  
    const where: any = { type: 'store' };
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
  } catch (err: any) {
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
    console.error('GET /api/admin/agents', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

const postSchema = z.object({
  username: z.string().min(4, 'Username must be at least 4 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  nickname: z.string().optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  remark: z.string().max(300).optional().or(z.literal('')),
  commissionPer: z.union([z.string(), z.number()]).optional().transform(v => Number(v)),
  platformIds: z.array(z.string()).optional(),
  inviteCode: z.string().optional(),
  onlineBalance: z.number().min(0).optional(),
});

export async function POST(req: Request) {
  const { error, adminId } = await authorize(req, 'agents.write');
  if (error) return error;

  try {
    const body = await req.json();
    const data = postSchema.parse(body);

    const created = await db.agents.create({
      data: {
        type: 'store',
        username: data.username.trim(),
        password_hash: await bcrypt.hash(data.password, 10),
        nickname: data.nickname?.trim() || data.username.trim(),
        email: data.email?.trim() || null,
        commission_per: Number.isFinite(data.commissionPer)
          ? String(data.commissionPer)
          : '0',
        invite_code: data.inviteCode?.trim() || `MC${randomBytes(8).toString('hex').toUpperCase()}`,
        remark: data.remark?.trim() || null,
        online_balance: data.onlineBalance || 0,
      }
    });

    await db.agents.update({
      where: { id: created.id },
      data: { store_id: created.id }
    });

    await db.store_settings.create({ data: { store_id: created.id } });

    if (data.platformIds && data.platformIds.length > 0) {
      await db.agent_platform_mappings.createMany({
        data: data.platformIds.map((platformId: string) => ({ agent_id: created.id, platform_id: platformId }))
      });
    }

    await logAdminAction({
      adminId,
      action: 'agent.create',
      entityType: 'agent',
      entityId: created.id,
      changes: { username: data.username, nickname: data.nickname || data.username, email: data.email || null },
      ipAddress: clientIp(req),
    });
    return NextResponse.json(
      { agent: { id: created.id, username: data.username, password: data.password }, ok: true },
      { status: 201 }
    );
  } catch (err: any) {
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
    }
    console.error('POST /api/admin/agents', err);
    return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 });
  }
}

const putSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['active', 'disabled']).optional(),
  commissionPer: z.union([z.string(), z.number()]).optional().transform(v => v !== undefined ? Number(v) : undefined),
  password: z.string().min(6).optional().or(z.literal('')),
  nickname: z.string().optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  remark: z.string().max(300).optional().or(z.literal('')),
  username: z.string().min(4).optional(),
  inviteCode: z.string().optional(),
  onlineBalance: z.number().min(0).optional(),
});

export async function PUT(req: Request) {
  const { error, adminId } = await authorize(req, 'agents.write');
  if (error) return error;

  try {
    const body = await req.json();
    const data = putSchema.parse(body);

    const set: any = {};
    if (data.status) set.status = data.status;
    if (data.commissionPer !== undefined && Number.isFinite(data.commissionPer))
      set.commission_per = String(data.commissionPer);
    if (data.password) {
      set.password_hash = await bcrypt.hash(data.password, 10);
    }
    if (data.nickname !== undefined) set.nickname = data.nickname.trim() || null;
    if (data.email !== undefined) set.email = data.email.trim() || null;
    if (data.remark !== undefined) set.remark = data.remark.trim() || null;
    if (data.username !== undefined) set.username = data.username.trim();
    if (data.inviteCode !== undefined) set.invite_code = data.inviteCode.trim();
    if (data.onlineBalance !== undefined) set.online_balance = data.onlineBalance;

    if (Object.keys(set).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const existing = await db.agents.findFirst({
      where: { id: data.id, type: 'store' }
    });

    if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 });

    await db.agents.update({
      where: { id: existing.id },
      data: set,
      select: { id: true }
    });

    if (set.status) {
      await db.agent_sessions.updateMany({
        where: { agent_id: data.id, revoked_at: null },
        data: { revoked_at: new Date() }
      });
    }

    const changes: Record<string, unknown> = {};
    if (set.nickname !== undefined) changes.nickname = set.nickname;
    if (set.email !== undefined) changes.email = set.email;
    if (set.remark !== undefined) changes.remark = set.remark;
    if (set.commission_per !== undefined) changes.commissionPer = set.commission_per;
    if (set.username !== undefined) changes.username = set.username;
    if (set.invite_code !== undefined) changes.inviteCode = set.invite_code;
    if (set.online_balance !== undefined) changes.onlineBalance = set.online_balance;
    if (set.password_hash !== undefined) changes.password = '[redacted]';
    if (set.status !== undefined) changes.status = set.status;

    await logAdminAction({
      adminId,
      action: set.status ? `agent.${set.status === 'active' ? 'unblock' : 'block'}` : 'agent.update',
      entityType: 'agent',
      entityId: data.id,
      changes,
      ipAddress: clientIp(req),
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    console.error('PUT /api/admin/agents', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { error, adminId } = await authorize(req, 'agents.write');
  if (error) return error;

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const existing = await db.agents.findFirst({
    where: { id, type: 'store' }
  });

  if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 });

  try {
    await db.agents.delete({
      where: { id }
    });

    await logAdminAction({
      adminId,
      action: 'agent.delete',
      entityType: 'agent',
      entityId: id,
      ipAddress: clientIp(req),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/admin/agents', err);
    return NextResponse.json({ error: 'Failed to delete agent. It might be referenced by other records.' }, { status: 500 });
  }
}
