import { NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { getAdminIdFromRequest } from '@/lib/admin-auth';
import { requirePermission, PermissionError } from '@/lib/rbac-core';
import { clientIp, logAdminAction } from '@/lib/audit-log';
import { blockUser, unblockUser } from '@/lib/user-service';


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
          commission_per: true,
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
      commissionPer: r.commission_per,
      inviteCode: r.invite_code,
      createdAt: r.created_at,
      goldCoin: r.wallets?.gold_coin,
      onlineSc: r.wallets?.online_sc,
    }));
  
    return NextResponse.json({ users: formattedRows, total: count });
  } catch (err: any) {
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
    console.error('GET /api/admin/users', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

const putSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['active', 'blocked']).optional(),
  nickname: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  password: z.string().min(6).optional().or(z.literal('')),
  commissionPer: z.union([z.string(), z.number()]).optional().transform(v => v !== undefined ? Number(v) : undefined),
  username: z.string().min(4).optional(),
  kycStatus: z.enum(['unverified', 'pending', 'verified', 'rejected']).optional(),
  inviteCode: z.string().optional(),
  goldCoin: z.number().min(0).optional(),
  onlineSc: z.number().min(0).optional(),
});

export async function PUT(req: Request) {
  const { error, adminId } = await authorize(req, 'users.write');
  if (error) return error;

  try {
    const body = await req.json();
    const data = putSchema.parse(body);

    const existing = await db.users.findUnique({ where: { id: data.id }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 });

    const set: any = {};
    if (data.status) set.status = data.status;
    if (data.nickname !== undefined) set.nickname = data.nickname.trim();
    if (data.email !== undefined) set.email = data.email.trim() || null;
    if (data.phone !== undefined) set.phone = data.phone.trim() || null;
    if (data.username !== undefined) set.username = data.username.trim();
    if (data.kycStatus !== undefined) set.kyc_status = data.kycStatus;
    if (data.inviteCode !== undefined) set.invite_code = data.inviteCode.trim();
    if (data.commissionPer !== undefined && Number.isFinite(data.commissionPer))
      set.commission_per = String(data.commissionPer);
    if (data.password) {
      set.password_hash = await bcrypt.hash(data.password, 10);
    }

    if (Object.keys(set).length > 0) {
      await db.users.update({
        where: { id: data.id },
        data: set,
      });
    }

    if (data.goldCoin !== undefined || data.onlineSc !== undefined) {
      const walletUpdate: any = {};
      if (data.goldCoin !== undefined) walletUpdate.gold_coin = data.goldCoin;
      if (data.onlineSc !== undefined) walletUpdate.online_sc = data.onlineSc;
      
      await db.wallets.upsert({
        where: { user_id: data.id },
        update: walletUpdate,
        create: {
          user_id: data.id,
          gold_coin: data.goldCoin || 0,
          online_sc: data.onlineSc || 0,
        }
      });
    }

    if (set.status === 'blocked') await blockUser(data.id);
    else if (set.status === 'active') await unblockUser(data.id);

    const changes = { ...set, goldCoin: data.goldCoin, onlineSc: data.onlineSc };
    if (changes.password_hash) changes.password_hash = '[redacted]';

    await logAdminAction({
      adminId,
      action: 'user.update',
      entityType: 'user',
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
    console.error('PUT /api/admin/users', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

const postSchema = z.object({
  username: z.string().min(4, 'Username must be at least 4 characters').max(50),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  nickname: z.string().min(1, 'Nickname required'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  kycStatus: z.enum(['unverified', 'pending', 'verified', 'rejected']).optional(),
  commissionPer: z.union([z.string(), z.number()]).optional().transform(v => v !== undefined ? Number(v) : undefined),
  inviteCode: z.string().optional(),
  goldCoin: z.number().min(0).optional(),
  onlineSc: z.number().min(0).optional(),
});

export async function POST(req: Request) {
  const { error, adminId } = await authorize(req, 'users.write');
  if (error) return error;

  try {
    const body = await req.json();
    const data = postSchema.parse(body);

    const password_hash = await bcrypt.hash(data.password, 10);
    const invite_code = data.inviteCode?.trim() || Array.from(crypto.getRandomValues(new Uint8Array(6)))
      .map(b => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[b % 36])
      .join('');

    const created = await db.users.create({
      data: {
        username: data.username.trim(),
        password_hash,
        nickname: data.nickname.trim(),
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        kyc_status: data.kycStatus || 'unverified',
        commission_per: data.commissionPer !== undefined && Number.isFinite(data.commissionPer)
          ? String(data.commissionPer)
          : '30',
        invite_code,
        wallets: {
          create: {
            gold_coin: data.goldCoin || 0,
            online_sc: data.onlineSc || 0,
          }
        }
      },
    });

    await logAdminAction({
      adminId,
      action: 'user.create',
      entityType: 'user',
      entityId: created.id,
      ipAddress: clientIp(req),
    });
    return NextResponse.json(
      { user: { id: created.id, username: data.username, password: data.password }, ok: true },
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
    console.error('POST /api/admin/users', err);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { error, adminId } = await authorize(req, 'users.write');
  if (error) return error;

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const existing = await db.users.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 });

  try {
    await db.users.delete({
      where: { id }
    });

    await logAdminAction({
      adminId,
      action: 'user.delete',
      entityType: 'user',
      entityId: id,
      ipAddress: clientIp(req),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/admin/users', err);
    return NextResponse.json({ error: 'Failed to delete user. It might be referenced by other records.' }, { status: 500 });
  }
}
