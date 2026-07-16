import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { and, desc, eq, ilike, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as s from '@/lib/db/schema';
import { getAgentFromRequest } from '@/lib/agent-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/agent/members?search=&phone=&page=&pageSize= — paginated member list + aggregates. */
export async function GET(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const url = new URL(req.url);
  const search = url.searchParams.get('search')?.trim();
  const phone = url.searchParams.get('phone')?.trim();
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize')) || 10));

  const saleAgents = sql`(select username from ${s.agents} where ${s.agents.id} = ${s.members.saleAgentId})`;
  const where = and(
    eq(s.members.storeId, agent.storeId),
    search ? ilike(s.members.username, `%${search}%`) : undefined,
    phone ? ilike(s.members.phone, `%${phone}%`) : undefined
  );

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(s.members)
    .where(where);

  const rows = await db
    .select({
      id: s.members.id,
      username: s.members.username,
      phone: s.members.phone,
      saleAgent: sql<string | null>`${saleAgents}`,
      onlineSc: s.members.onlineSc,
      scRewardEnabled: s.members.scRewardEnabled,
      remark: s.members.remark,
      status: s.members.status,
      createdAt: s.members.createdAt,
      deposit: sql<string>`coalesce((select sum(amount) from ${s.memberTransactions} t where t.member_id = ${s.members.id} and t.type = 'recharge'), 0)`,
      withdraw: sql<string>`coalesce((select sum(amount) from ${s.memberTransactions} t where t.member_id = ${s.members.id} and t.type = 'redeem'), 0)`,
      totalIn: sql<string>`coalesce((select sum(in_score) from ${s.memberTransactions} t where t.member_id = ${s.members.id}), 0)`,
      totalOut: sql<string>`coalesce((select sum(out_score) from ${s.memberTransactions} t where t.member_id = ${s.members.id}), 0)`,
    })
    .from(s.members)
    .where(where)
    .orderBy(desc(s.members.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return NextResponse.json({
    members: rows.map((r) => ({
      ...r,
      totalNet: (Number(r.totalIn) - Number(r.totalOut)).toFixed(2),
    })),
    total,
    page,
    pageSize,
  });
}

/** POST /api/agent/members — create a member under this store. */
export async function POST(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
  }

  try {
    const [created] = await db
      .insert(s.members)
      .values({
        storeId: agent.storeId,
        saleAgentId: agent.type === 'sale' ? agent.id : null,
        subAgentId: agent.type === 'sub' ? agent.id : null,
        username,
        passwordHash: await bcrypt.hash(password, 10),
        remark: typeof body.remark === 'string' ? body.remark : null,
      })
      .returning({ id: s.members.id });
    return NextResponse.json({ ok: true, id: created.id });
  } catch {
    return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
  }
}

/** PUT /api/agent/members — update remark / status / SC-reward flag. */
export async function PUT(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const id = typeof body.id === 'string' ? body.id : '';
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const set: Partial<typeof s.members.$inferInsert> = {};
  if (typeof body.remark === 'string') set.remark = body.remark;
  if (typeof body.scRewardEnabled === 'boolean') set.scRewardEnabled = body.scRewardEnabled;
  if (body.status === 'active' || body.status === 'disabled') set.status = body.status;

  await db
    .update(s.members)
    .set(set)
    .where(and(eq(s.members.id, id), eq(s.members.storeId, agent.storeId)));
  return NextResponse.json({ ok: true });
}
