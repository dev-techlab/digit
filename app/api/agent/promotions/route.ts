import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAgentFromRequest } from '@/lib/agent-auth';
import { z } from 'zod';

const TYPES = ['promotion_game', 'double_game', 'loyalty_drop'] as const;

const postSchema = z.object({
  type: z.enum(TYPES).optional().default('promotion_game'),
  maxBonus: z.coerce.number().positive('Max Bonus Amount is required'),
  assignAgentId: z.string().nullable().optional(),
  bonusPercent: z.coerce.number().optional().default(100),
  hiddenFromAgentIds: z.array(z.string()).optional().default([]),
  minDeposit: z.coerce.number().optional().default(20),
  redemptionMultiplier: z.coerce.number().optional().default(2),
  activeDays: z.array(z.number()).optional().default([]),
  timezone: z.string().optional().default('America/New_York'),
  hiddenFromPlayers: z.boolean().optional().default(false),
  onlineOnly: z.boolean().optional().default(false),
  status: z.enum(['enabled', 'disabled']).optional().default('enabled'),
  remark: z.string().nullable().optional(),
});

const putSchema = z.object({
  id: z.string().min(1, 'id required'),
  status: z.enum(['enabled', 'disabled']).optional(),
  remark: z.string().optional(),
  bonusPercent: z.coerce.number().optional(),
  minDeposit: z.coerce.number().optional(),
  maxBonus: z.coerce.number().optional(),
  redemptionMultiplier: z.coerce.number().optional(),
  activeDays: z.array(z.number()).optional(),
  hiddenFromPlayers: z.boolean().optional(),
  onlineOnly: z.boolean().optional(),
});

export async function GET(req: Request) {
  try {
    const agent = await getAgentFromRequest(req);
    if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rows = await db.promotions.findMany({
      where: { store_id: agent.storeId },
      select: {
        id: true,
        type: true,
        assign_agent_id: true,
        agents_promotions_assign_agent_idToagents: {
          select: { username: true },
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
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json({
      promotions: rows.map((r) => ({
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
      })),
    });
  } catch (err: any) {
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
    console.error('GET /api/agent/promotions', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const agent = await getAgentFromRequest(req);
    if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (agent.type !== 'store') {
      return NextResponse.json(
        { error: 'Only the store account can manage promotions' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parseResult = postSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    let assignAgentId: string | null = null;
    if (data.assignAgentId) {
      const assignee = await db.agents.findFirst({
        where: {
          id: data.assignAgentId,
          store_id: agent.storeId,
        },
        select: { id: true },
      });
      if (!assignee) {
        return NextResponse.json(
          { error: 'assignAgentId must belong to this store' },
          { status: 400 }
        );
      }
      assignAgentId = assignee.id;
    }

    const bonusPercent = Math.min(200, Math.max(1, data.bonusPercent));
    const created = await db.promotions.create({
      data: {
        store_id: agent.storeId,
        assign_agent_id: assignAgentId,
        type: data.type,
        hidden_from_agent_ids: data.hiddenFromAgentIds,
        bonus_percent: String(bonusPercent),
        min_deposit: String(data.minDeposit),
        max_bonus: String(data.maxBonus),
        redemption_multiplier: String(data.redemptionMultiplier),
        active_days: data.activeDays,
        timezone: data.timezone,
        hidden_from_players: data.hiddenFromPlayers,
        online_only: data.onlineOnly,
        status: data.status,
        remark: data.remark || null,
      },
      select: { id: true },
    });
    return NextResponse.json({ ok: true, id: created.id });
  } catch (err: any) {
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
    console.error('POST /api/agent/promotions', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const agent = await getAgentFromRequest(req);
    if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (agent.type !== 'store') {
      return NextResponse.json(
        { error: 'Only the store account can manage promotions' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parseResult = putSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const data = parseResult.data;
    const id = data.id;

    const set: any = {};
    if (data.status !== undefined) set.status = data.status;
    if (data.remark !== undefined) set.remark = data.remark;
    if (data.bonusPercent !== undefined)
      set.bonus_percent = String(Math.min(200, Math.max(1, data.bonusPercent)));
    if (data.minDeposit !== undefined) set.min_deposit = String(data.minDeposit);
    if (data.maxBonus !== undefined) set.max_bonus = String(data.maxBonus);
    if (data.redemptionMultiplier !== undefined)
      set.redemption_multiplier = String(data.redemptionMultiplier);
    if (data.activeDays !== undefined) set.active_days = data.activeDays;
    if (data.hiddenFromPlayers !== undefined) set.hidden_from_players = data.hiddenFromPlayers;
    if (data.onlineOnly !== undefined) set.online_only = data.onlineOnly;

    await db.promotions.updateMany({
      where: {
        id,
        store_id: agent.storeId,
      },
      data: set,
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
    console.error('PUT /api/agent/promotions', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
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
        store_id: agent.storeId,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
    console.error('DELETE /api/agent/promotions', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
