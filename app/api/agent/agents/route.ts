import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { db } from '@/lib/db';
import { getAgentFromRequest } from '@/lib/agent-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const url = new URL(req.url);
  const type = url.searchParams.get('type') === 'sub' ? 'sub' : 'sale';
  const search = url.searchParams.get('search')?.trim();

  if (url.searchParams.get('report')) {
    const agentCol = type === 'sub' ? 'sub_agent_id' : 'sale_agent_id';
    const rows = await db.$queryRawUnsafe(`
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
    `, agent.storeId, type);

    const formattedRows = (rows as any[]).map(row => {
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

  const formatted = rows.map(r => ({
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
}

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
    const created = await db.agents.create({
      data: {
        type,
        username,
        password_hash: await bcrypt.hash(password, 10),
        nickname,
        store_id: agent.storeId,
        parent_agent_id: agent.id,
        ratio_pct: Number.isFinite(Number(body.ratioPct)) ? String(body.ratioPct) : '0',
        commission_per: Number.isFinite(Number(body.commissionPer))
          ? String(body.commissionPer)
          : '0',
        invite_code: `MC${randomBytes(8).toString('hex').toUpperCase()}`,
        remark: typeof body.remark === 'string' ? body.remark.slice(0, 300) : null,
      },
      select: { id: true }
    });
    return NextResponse.json({ ok: true, id: created.id });
  } catch (e: any) {
    if (e.code === 'P2002') {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (agent.type !== 'store') {
    return NextResponse.json(
      { error: 'Only the store account can manage agents' },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const id = typeof body.id === 'string' ? body.id : '';
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const set: any = {};
  if (body.ratioPct != null && Number.isFinite(Number(body.ratioPct)))
    set.ratio_pct = String(body.ratioPct);
  if (body.commissionPer != null && Number.isFinite(Number(body.commissionPer)))
    set.commission_per = String(body.commissionPer);
  if (body.status === 'active' || body.status === 'disabled') set.status = body.status;
  if (typeof body.remark === 'string') set.remark = body.remark.slice(0, 300);
  if (typeof body.nickname === 'string') set.nickname = body.nickname;
  if (typeof body.password === 'string' && body.password.length >= 6) {
    set.password_hash = await bcrypt.hash(body.password, 10);
  }

  await db.agents.updateMany({
    where: {
      id,
      store_id: agent.storeId
    },
    data: set
  });
  return NextResponse.json({ ok: true });
}
