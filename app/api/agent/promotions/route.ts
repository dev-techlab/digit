import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAgentFromRequest } from '@/lib/agent-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TYPES = ['promotion_game', 'double_game', 'loyalty_drop'] as const;

export async function GET(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await db.promotions.findMany({
    where: { store_id: agent.storeId },
    select: {
      id: true,
      type: true,
      assign_agent_id: true,
      agents_promotions_assign_agent_idToagents: {
        select: { username: true }
      },
      bonus_percent: true,
      min_deposit: true,
      max_bonus: true,
      redemption_multiplier: true,
      active_days: true,
      timezone: true,
      hidden_from_players: true,
      online_only: true,
      status: true,
      remark: true,
      created_at: true,
    },
    orderBy: { created_at: 'desc' }
  });
  
  return NextResponse.json({
    promotions: rows.map(r => ({
      id: r.id,
      type: r.type,
      assignAgentId: r.assign_agent_id,
      assignUsername: r.agents_promotions_assign_agent_idToagents?.username || null,
      bonusPercent: r.bonus_percent,
      minDeposit: r.min_deposit,
      maxBonus: r.max_bonus,
      redemptionMultiplier: r.redemption_multiplier,
      activeDays: r.active_days,
      timezone: r.timezone,
      hiddenFromPlayers: r.hidden_from_players,
      onlineOnly: r.online_only,
      status: r.status,
      remark: r.remark,
      createdAt: r.created_at,
    }))
  });
}

export async function POST(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (agent.type !== 'store') {
    return NextResponse.json(
      { error: 'Only the store account can manage promotions' },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const type = TYPES.includes(body.type as (typeof TYPES)[number])
    ? (body.type as (typeof TYPES)[number])
    : 'promotion_game';
  const maxBonus = Number(body.maxBonus);
  if (!Number.isFinite(maxBonus) || maxBonus <= 0) {
    return NextResponse.json({ error: 'Max Bonus Amount is required' }, { status: 400 });
  }

  let assignAgentId: string | null = null;
  if (typeof body.assignAgentId === 'string' && body.assignAgentId) {
    const assignee = await db.agents.findFirst({
      where: {
        id: body.assignAgentId,
        store_id: agent.storeId
      },
      select: { id: true }
    });
    if (!assignee) {
      return NextResponse.json(
        { error: 'assignAgentId must belong to this store' },
        { status: 400 }
      );
    }
    assignAgentId = assignee.id;
  }

  const bonusPercent = Math.min(200, Math.max(1, Number(body.bonusPercent) || 100));
  const created = await db.promotions.create({
    data: {
      store_id: agent.storeId,
      assign_agent_id: assignAgentId,
      type: type as any,
      hidden_from_agent_ids: Array.isArray(body.hiddenFromAgentIds) ? body.hiddenFromAgentIds : [],
      bonus_percent: String(bonusPercent),
      min_deposit: String(Number(body.minDeposit) || 20),
      max_bonus: String(maxBonus),
      redemption_multiplier: String(Number(body.redemptionMultiplier) || 2),
      active_days: Array.isArray(body.activeDays) ? body.activeDays : [],
      timezone: typeof body.timezone === 'string' ? body.timezone : 'America/New_York',
      hidden_from_players: body.hiddenFromPlayers === true,
      online_only: body.onlineOnly === true,
      status: body.status === 'disabled' ? 'disabled' : 'enabled',
      remark: typeof body.remark === 'string' ? body.remark : null,
    },
    select: { id: true }
  });
  return NextResponse.json({ ok: true, id: created.id });
}

export async function PUT(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (agent.type !== 'store') {
    return NextResponse.json(
      { error: 'Only the store account can manage promotions' },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const id = typeof body.id === 'string' ? body.id : '';
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const set: any = {};
  if (body.status === 'enabled' || body.status === 'disabled') set.status = body.status;
  if (typeof body.remark === 'string') set.remark = body.remark;
  if (body.bonusPercent != null)
    set.bonus_percent = String(Math.min(200, Math.max(1, Number(body.bonusPercent) || 100)));
  if (body.minDeposit != null) set.min_deposit = String(Number(body.minDeposit) || 0);
  if (body.maxBonus != null) set.max_bonus = String(Number(body.maxBonus) || 0);
  if (body.redemptionMultiplier != null)
    set.redemption_multiplier = String(Number(body.redemptionMultiplier) || 2);
  if (Array.isArray(body.activeDays)) set.active_days = body.activeDays;
  if (typeof body.hiddenFromPlayers === 'boolean') set.hidden_from_players = body.hiddenFromPlayers;
  if (typeof body.onlineOnly === 'boolean') set.online_only = body.onlineOnly;

  await db.promotions.updateMany({
    where: {
      id,
      store_id: agent.storeId
    },
    data: set
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (agent.type !== 'store') {
    return NextResponse.json(
      { error: 'Only the store account can manage promotions' },
      { status: 403 }
    );
  }
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await db.promotions.deleteMany({
    where: {
      id,
      store_id: agent.storeId
    }
  });
  return NextResponse.json({ ok: true });
}
