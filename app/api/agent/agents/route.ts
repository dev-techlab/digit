import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';
import { db } from '@/lib/db';
import * as s from '@/lib/db/schema';
import { getAgentFromRequest } from '@/lib/agent-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/agent/agents?type=sale|sub&search=&report=1 — list (or totals report). */
export async function GET(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const url = new URL(req.url);
  const type = url.searchParams.get('type') === 'sub' ? 'sub' : 'sale';
  const search = url.searchParams.get('search')?.trim();

  if (url.searchParams.get('report')) {
    // Per-agent totals: deposits/withdrawals of the members assigned to each agent.
    const agentCol = type === 'sub' ? s.members.subAgentId : s.members.saleAgentId;
    const rows = await db
      .select({
        agentId: s.agents.id,
        username: s.agents.username,
        deposit: sql<string>`coalesce(sum(${s.memberTransactions.amount}) filter (where ${s.memberTransactions.type} = 'recharge'), 0)`,
        depositors: sql<number>`count(distinct ${s.memberTransactions.memberId}) filter (where ${s.memberTransactions.type} = 'recharge')::int`,
        withdrawal: sql<string>`coalesce(sum(${s.memberTransactions.amount}) filter (where ${s.memberTransactions.type} = 'redeem'), 0)`,
        withdrawers: sql<number>`count(distinct ${s.memberTransactions.memberId}) filter (where ${s.memberTransactions.type} = 'redeem')::int`,
        totalIn: sql<string>`coalesce(sum(${s.memberTransactions.inScore}), 0)`,
        totalOut: sql<string>`coalesce(sum(${s.memberTransactions.outScore}), 0)`,
        bonus: sql<string>`coalesce(sum(${s.memberTransactions.bonusScore}), 0)`,
        gameDepositFee: sql<string>`coalesce(sum(${s.memberTransactions.gameDepositFee}), 0)`,
        platformFee: sql<string>`coalesce(sum(${s.memberTransactions.platformFee}), 0)`,
      })
      .from(s.agents)
      .leftJoin(s.members, eq(agentCol, s.agents.id))
      .leftJoin(s.memberTransactions, eq(s.memberTransactions.memberId, s.members.id))
      .where(and(eq(s.agents.storeId, agent.storeId), eq(s.agents.type, type)))
      .groupBy(s.agents.id, s.agents.username);
    return NextResponse.json({ report: rows });
  }

  const where = and(
    eq(s.agents.storeId, agent.storeId),
    eq(s.agents.type, type),
    search
      ? or(
          ilike(s.agents.username, `%${search}%`),
          ilike(s.agents.nickname, `%${search}%`),
          ilike(s.agents.email, `%${search}%`)
        )
      : undefined
  );
  const rows = await db
    .select({
      id: s.agents.id,
      username: s.agents.username,
      nickname: s.agents.nickname,
      email: s.agents.email,
      ratioPct: s.agents.ratioPct,
      onlineBalance: s.agents.onlineBalance,
      inviteCode: s.agents.inviteCode,
      status: s.agents.status,
      remark: s.agents.remark,
      createdAt: s.agents.createdAt,
    })
    .from(s.agents)
    .where(where)
    .orderBy(desc(s.agents.createdAt));
  return NextResponse.json({ agents: rows });
}

/** POST /api/agent/agents — create a sale/sub agent under this store. */
export async function POST(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (agent.type !== 'store') {
    return NextResponse.json({ error: 'Only the store account can add agents' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const type = body.type === 'sub' ? 'sub' : 'sale';
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const nickname = typeof body.nickname === 'string' ? body.nickname.trim() : '';
  if (!username || !password || !nickname) {
    return NextResponse.json(
      { error: 'Username, password and nickname are required' },
      { status: 400 }
    );
  }

  try {
    const [created] = await db
      .insert(s.agents)
      .values({
        type,
        username,
        passwordHash: await bcrypt.hash(password, 10),
        nickname,
        storeId: agent.storeId,
        parentAgentId: agent.id,
        ratioPct: Number.isFinite(Number(body.ratioPct)) ? String(body.ratioPct) : '0',
        inviteCode: `MC${randomBytes(8).toString('hex').toUpperCase()}`,
        remark: typeof body.remark === 'string' ? body.remark.slice(0, 300) : null,
      })
      .returning({ id: s.agents.id });
    return NextResponse.json({ ok: true, id: created.id });
  } catch {
    return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
  }
}

/** PUT /api/agent/agents — update ratio/status/remark of an owned agent. */
export async function PUT(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (agent.type !== 'store') {
    return NextResponse.json({ error: 'Only the store account can manage agents' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const id = typeof body.id === 'string' ? body.id : '';
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const set: Partial<typeof s.agents.$inferInsert> = {};
  if (body.ratioPct != null && Number.isFinite(Number(body.ratioPct)))
    set.ratioPct = String(body.ratioPct);
  if (body.status === 'active' || body.status === 'disabled') set.status = body.status;
  if (typeof body.remark === 'string') set.remark = body.remark.slice(0, 300);
  if (typeof body.nickname === 'string') set.nickname = body.nickname;

  await db
    .update(s.agents)
    .set(set)
    .where(and(eq(s.agents.id, id), eq(s.agents.storeId, agent.storeId)));
  return NextResponse.json({ ok: true });
}
