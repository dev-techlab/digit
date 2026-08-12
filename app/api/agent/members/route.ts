import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getAgentFromRequest } from '@/lib/agent-auth';

export async function GET(req: Request) {
  try {
    const agent = await getAgentFromRequest(req);
    if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const url = new URL(req.url);
    const search = url.searchParams.get('search')?.trim();
    const phone = url.searchParams.get('phone')?.trim();
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize')) || 10));

    const agentCol =
      agent.type === 'sub' ? 'sub_agent_id' : agent.type === 'sale' ? 'sale_agent_id' : null;
    const where: any = { store_id: agent.storeId };
    if (agentCol) where[agentCol] = agent.id;

    if (search || phone) {
      where.AND = [];
      if (search) where.AND.push({ username: { contains: search, mode: 'insensitive' } });
      if (phone) where.AND.push({ phone: { contains: phone, mode: 'insensitive' } });
    }

    const [rawRows, total] = await Promise.all([
      db.members.findMany({
        where,
        select: {
          id: true,
          username: true,
          phone: true,
          agents_members_sale_agent_idToagents: { select: { username: true } },
          online_sc: true,
          sc_reward_enabled: true,
          remark: true,
          status: true,
          created_at: true,
        },
        orderBy: { created_at: 'desc' },
        take: pageSize,
        skip: (page - 1) * pageSize,
      }),
      db.members.count({ where }),
    ]);

    const memberIds = rawRows.map((m) => m.id);
    let aggregate: any[] = [];

    if (memberIds.length > 0) {
      const bindParams = memberIds.map((_, i) => `$${i + 1}`).join(',');
      aggregate = await db.$queryRawUnsafe(
        `
        SELECT 
          member_id,
          COALESCE(SUM(amount) FILTER (WHERE type = 'recharge'), 0) AS deposit,
          COALESCE(SUM(amount) FILTER (WHERE type = 'redeem'), 0) AS withdraw,
          COALESCE(SUM(in_score), 0) AS "totalIn",
          COALESCE(SUM(out_score), 0) AS "totalOut"
        FROM member_transactions
        WHERE member_id IN (${bindParams})
        GROUP BY member_id
      `,
        ...memberIds
      );
    }

    const aggMap = new Map(aggregate.map((a) => [a.member_id, a]));

    const rows = rawRows.map((r) => {
      const agg = aggMap.get(r.id) || {};
      const totalIn = Number(agg.totalIn || 0);
      const totalOut = Number(agg.totalOut || 0);
      return {
        id: r.id,
        username: r.username,
        phone: r.phone,
        saleAgent: r.agents_members_sale_agent_idToagents?.username || null,
        onlineSc: r.online_sc,
        scRewardEnabled: r.sc_reward_enabled,
        remark: r.remark,
        status: r.status,
        createdAt: r.created_at,
        deposit: agg.deposit?.toString() || '0',
        withdraw: agg.withdraw?.toString() || '0',
        totalIn: totalIn.toString(),
        totalOut: totalOut.toString(),
        totalNet: (totalIn - totalOut).toFixed(2),
      };
    });

    return NextResponse.json({
      members: rows,
      total,
      page,
      pageSize,
    });
  } catch (err: any) {
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
    console.error('GET /api/agent/members', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

const createMemberSchema = z.object({
  username: z.string().min(8, 'Username must be at least 8 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  remark: z.string().optional(),
});

export async function POST(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parseResult = createMemberSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json({ error: parseResult.error.issues[0].message }, { status: 400 });
  }

  const { username, password, remark } = parseResult.data;

  try {
    const created = await db.members.create({
      data: {
        store_id: agent.storeId,
        sale_agent_id: agent.type === 'sale' ? agent.id : null,
        sub_agent_id: agent.type === 'sub' ? agent.id : null,
        username,
        password_hash: await bcrypt.hash(password, 10),
        remark: typeof remark === 'string' ? remark : null,
      },
      select: { id: true },
    });
    return NextResponse.json({ ok: true, id: created.id });
  } catch (e: any) {
    if (e && (e.digest === 'DYNAMIC_SERVER_USAGE' || e.message?.includes('NEXT_'))) throw e;
    if (e.code === 'P2002') {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: 'Failed to create member' }, { status: 500 });
  }
}

const updateMemberSchema = z.object({
  id: z.string().min(1, 'Member ID is required'),
  remark: z.string().optional(),
  scRewardEnabled: z.boolean().optional(),
  status: z.enum(['active', 'disabled']).optional(),
});

export async function PUT(req: Request) {
  try {
    const agent = await getAgentFromRequest(req);
    if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (agent.type !== 'store') {
      return NextResponse.json(
        { error: 'Only the store account can manage members' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parseResult = updateMemberSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error.issues[0].message }, { status: 400 });
    }

    const { id, remark, scRewardEnabled, status } = parseResult.data;

    const set: any = {};
    if (remark !== undefined) set.remark = remark;
    if (scRewardEnabled !== undefined) set.sc_reward_enabled = scRewardEnabled;
    if (status !== undefined) set.status = status;

    await db.members.updateMany({
      where: {
        id,
        store_id: agent.storeId,
      },
      data: set,
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
    console.error('PUT /api/agent/members', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
