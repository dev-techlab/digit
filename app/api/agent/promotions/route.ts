import { NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as s from '@/lib/db/schema';
import { getAgentFromRequest } from '@/lib/agent-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TYPES = ['promotion_game', 'double_game', 'loyalty_drop'] as const;

/** GET /api/agent/promotions — list this store's promotions. */
export async function GET(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await db
    .select({
      id: s.promotions.id,
      type: s.promotions.type,
      assignAgentId: s.promotions.assignAgentId,
      assignUsername: s.agents.username,
      bonusPercent: s.promotions.bonusPercent,
      minDeposit: s.promotions.minDeposit,
      maxBonus: s.promotions.maxBonus,
      redemptionMultiplier: s.promotions.redemptionMultiplier,
      activeDays: s.promotions.activeDays,
      timezone: s.promotions.timezone,
      hiddenFromPlayers: s.promotions.hiddenFromPlayers,
      onlineOnly: s.promotions.onlineOnly,
      status: s.promotions.status,
      remark: s.promotions.remark,
      createdAt: s.promotions.createdAt,
    })
    .from(s.promotions)
    .leftJoin(s.agents, eq(s.agents.id, s.promotions.assignAgentId))
    .where(eq(s.promotions.storeId, agent.storeId))
    .orderBy(desc(s.promotions.createdAt));
  return NextResponse.json({ promotions: rows });
}

/** POST /api/agent/promotions — create a promotion. */
export async function POST(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const type = TYPES.includes(body.type as (typeof TYPES)[number])
    ? (body.type as (typeof TYPES)[number])
    : 'promotion_game';
  const maxBonus = Number(body.maxBonus);
  if (!Number.isFinite(maxBonus) || maxBonus <= 0) {
    return NextResponse.json({ error: 'Max Bonus Amount is required' }, { status: 400 });
  }

  const bonusPercent = Math.min(200, Math.max(1, Number(body.bonusPercent) || 100));
  const [created] = await db
    .insert(s.promotions)
    .values({
      storeId: agent.storeId,
      assignAgentId: typeof body.assignAgentId === 'string' ? body.assignAgentId : null,
      type,
      hiddenFromAgentIds: Array.isArray(body.hiddenFromAgentIds)
        ? (body.hiddenFromAgentIds as string[])
        : [],
      bonusPercent: String(bonusPercent),
      minDeposit: String(Number(body.minDeposit) || 20),
      maxBonus: String(maxBonus),
      redemptionMultiplier: String(Number(body.redemptionMultiplier) || 2),
      activeDays: Array.isArray(body.activeDays) ? (body.activeDays as number[]) : [],
      timezone: typeof body.timezone === 'string' ? body.timezone : 'America/New_York',
      hiddenFromPlayers: body.hiddenFromPlayers === true,
      onlineOnly: body.onlineOnly === true,
      status: body.status === 'disabled' ? 'disabled' : 'enabled',
      remark: typeof body.remark === 'string' ? body.remark : null,
    })
    .returning({ id: s.promotions.id });
  return NextResponse.json({ ok: true, id: created.id });
}

/** PUT /api/agent/promotions — update status/remark or full config. */
export async function PUT(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const id = typeof body.id === 'string' ? body.id : '';
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const set: Partial<typeof s.promotions.$inferInsert> = {};
  if (body.status === 'enabled' || body.status === 'disabled') set.status = body.status;
  if (typeof body.remark === 'string') set.remark = body.remark;
  if (body.bonusPercent != null)
    set.bonusPercent = String(Math.min(200, Math.max(1, Number(body.bonusPercent) || 100)));
  if (body.minDeposit != null) set.minDeposit = String(Number(body.minDeposit) || 0);
  if (body.maxBonus != null) set.maxBonus = String(Number(body.maxBonus) || 0);
  if (body.redemptionMultiplier != null)
    set.redemptionMultiplier = String(Number(body.redemptionMultiplier) || 2);
  if (Array.isArray(body.activeDays)) set.activeDays = body.activeDays as number[];
  if (typeof body.hiddenFromPlayers === 'boolean') set.hiddenFromPlayers = body.hiddenFromPlayers;
  if (typeof body.onlineOnly === 'boolean') set.onlineOnly = body.onlineOnly;

  await db
    .update(s.promotions)
    .set(set)
    .where(and(eq(s.promotions.id, id), eq(s.promotions.storeId, agent.storeId)));
  return NextResponse.json({ ok: true });
}

/** DELETE /api/agent/promotions?id= — remove a promotion. */
export async function DELETE(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await db
    .delete(s.promotions)
    .where(and(eq(s.promotions.id, id), eq(s.promotions.storeId, agent.storeId)));
  return NextResponse.json({ ok: true });
}
