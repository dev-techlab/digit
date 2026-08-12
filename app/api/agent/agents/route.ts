import { NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { db } from '@/lib/db';
import { getAgentFromRequest } from '@/lib/agent-auth';

export async function GET(req: Request) {
  try {
    const agent = await getAgentFromRequest(req);
    if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const url = new URL(req.url);
    const type = url.searchParams.get('type') === 'sub' ? 'sub' : 'sale';
    const search = url.searchParams.get('search')?.trim();

    if (url.searchParams.get('report')) {
      const agentCol = type === 'sub' ? 'sub_agent_id' : 'sale_agent_id';
      const rows = await db.$queryRawUnsafe(
        `
        SELECT 
          a.id AS "agentId", 
          a.username,
          COALESCE(SUM(mt.amount) FILTER (WHERE mt.type = 'recharge'), 0) AS deposit,
          COUNT(DISTINCT mt.member_id) FILTER (WHERE mt.type = 'recharge')::int AS depositors,
          COALESCE(SUM(mt.amount) FILTER (WHERE mt.type = 'redeem'), 0) AS withdrawal,
          COUNT(DISTINCT mt.member_id) FILTER (WHERE mt.type = 'redeem')::int AS withdrawers,
          COALESCE(SUM(mt.in_score), 0) AS "totalIn",
          COALESCE(SUM(mt.out_score), 0) AS "totalOut",
          COALESCE(SUM(mt.bonus_score), 0) AS bonus,
          COALESCE(SUM(mt.game_deposit_fee), 0) AS "gameDepositFee",
          COALESCE(SUM(mt.platform_fee), 0) AS "platformFee"
        FROM agents a
        LEFT JOIN members m ON m.${agentCol} = a.id
        LEFT JOIN member_transactions mt ON mt.member_id = m.id
        WHERE a.store_id = $1 AND a.type = $2
        GROUP BY a.id, a.username
      `,
        agent.storeId,
        type
      );

      const formattedRows = (rows as any[]).map((row) => {
        const formatted: any = {};
        for (const key in row) {
          formatted[key] = typeof row[key] === 'bigint' ? row[key].toString() : row[key];
        }
        return formatted;
      });

      return NextResponse.json({ report: formattedRows });
    }

    const where: any = {
      store_id: agent.storeId,
      type,
    };

    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { nickname: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const rows = await db.agents.findMany({
      where,
      select: {
        id: true,
        username: true,
        nickname: true,
        email: true,
        ratio_pct: true,
        commission_per: true,
        online_balance: true,
        invite_code: true,
        status: true,
        remark: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    });

    const formatted = rows.map((r) => ({
      id: r.id,
      username: r.username,
      nickname: r.nickname,
      email: r.email,
      ratioPct: r.ratio_pct,
      commissionPer: r.commission_per,
      onlineBalance: r.online_balance,
      inviteCode: r.invite_code,
      status: r.status,
      remark: r.remark,
      createdAt: r.created_at,
    }));

    return NextResponse.json({ agents: formatted });
  } catch (err: any) {
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
    console.error('GET /api/agent/agents', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

const postSchema = z.object({
  type: z.enum(['sub', 'sale']).optional().default('sale'),
  username: z.string().min(4, 'Username must be at least 4 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  nickname: z.string().min(1, 'Nickname required'),
  ratioPct: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => Number(v)),
  commissionPer: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => Number(v)),
  remark: z.string().max(300).optional().or(z.literal('')),
});

export async function POST(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (agent.type !== 'store') {
    return NextResponse.json({ error: 'Only the store account can add agents' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data = postSchema.parse(body);

    const created = await db.agents.create({
      data: {
        type: data.type,
        username: data.username.trim(),
        password_hash: await bcrypt.hash(data.password, 10),
        nickname: data.nickname.trim(),
        store_id: agent.storeId,
        parent_agent_id: agent.id,
        ratio_pct: Number.isFinite(data.ratioPct) ? String(data.ratioPct) : '0',
        commission_per: Number.isFinite(data.commissionPer) ? String(data.commissionPer) : '0',
        invite_code: `MC${randomBytes(8).toString('hex').toUpperCase()}`,
        remark: data.remark?.trim() || null,
      },
      select: { id: true },
    });
    return NextResponse.json({ ok: true, id: created.id });
  } catch (e: any) {
    if (e && (e.digest === 'DYNAMIC_SERVER_USAGE' || e.message?.includes('NEXT_'))) throw e;
    if (e instanceof ZodError) {
      return NextResponse.json({ error: e.issues[0].message }, { status: 400 });
    }
    if (e.code === 'P2002') {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 });
  }
}

const putSchema = z.object({
  id: z.string().uuid(),
  ratioPct: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v !== undefined ? Number(v) : undefined)),
  commissionPer: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v !== undefined ? Number(v) : undefined)),
  status: z.enum(['active', 'disabled']).optional(),
  remark: z.string().max(300).optional().or(z.literal('')),
  nickname: z.string().optional().or(z.literal('')),
  password: z.string().min(6).optional().or(z.literal('')),
});

export async function PUT(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (agent.type !== 'store') {
    return NextResponse.json(
      { error: 'Only the store account can manage agents' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const data = putSchema.parse(body);

    const set: any = {};
    if (data.ratioPct !== undefined && Number.isFinite(data.ratioPct))
      set.ratio_pct = String(data.ratioPct);
    if (data.commissionPer !== undefined && Number.isFinite(data.commissionPer))
      set.commission_per = String(data.commissionPer);
    if (data.status) set.status = data.status;
    if (data.remark !== undefined) set.remark = data.remark.trim() || null;
    if (data.nickname !== undefined) set.nickname = data.nickname.trim() || null;
    if (data.password) {
      set.password_hash = await bcrypt.hash(data.password, 10);
    }

    if (Object.keys(set).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    await db.agents.updateMany({
      where: {
        id: data.id,
        store_id: agent.storeId,
      },
      data: set,
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    console.error('PUT /api/agent/agents', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
