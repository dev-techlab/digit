import { NextResponse } from 'next/server';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as s from '@/lib/db/schema';
import { getAgentFromRequest } from '@/lib/agent-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/agent/game-settings — full platform catalog + this store's accounts. */
export async function GET(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const platforms = await db
    .select()
    .from(s.gamePlatforms)
    .where(eq(s.gamePlatforms.isActive, true))
    .orderBy(asc(s.gamePlatforms.sort));

  const accounts = await db
    .select()
    .from(s.storePlatformAccounts)
    .where(eq(s.storePlatformAccounts.storeId, agent.storeId));
  const byPlatform = new Map(accounts.map((a) => [a.platformId, a]));

  return NextResponse.json({
    platforms: platforms.map((p) => {
      const acc = byPlatform.get(p.id);
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        iconUrl: p.iconUrl,
        enabled: acc?.enabled ?? false,
        kioskId: acc?.kioskId ?? null,
        posAccount: acc?.posAccount ?? null,
        moneyBox: acc?.moneyBox ?? null,
        remark: acc?.remark ?? null,
        scoreCostPct: acc?.scoreCostPct ?? '20',
        minDeposit: acc?.minDeposit ?? '10',
        minRedemption: acc?.minRedemption ?? '10',
        redeemDailyLimit: acc?.redeemDailyLimit ?? '3000',
        minDepositToUnlock: acc?.minDepositToUnlock ?? '0',
        score: acc?.score ?? null,
        scoreSyncedAt: acc?.scoreSyncedAt ?? null,
      };
    }),
  });
}

/** PUT /api/agent/game-settings — upsert one platform account (toggle/config). */
export async function PUT(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (agent.type !== 'store') {
    return NextResponse.json({ error: 'Only the store account can manage game settings' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const platformId = typeof body.platformId === 'string' ? body.platformId : '';
  if (!platformId) return NextResponse.json({ error: 'platformId required' }, { status: 400 });

  const set: Partial<typeof s.storePlatformAccounts.$inferInsert> = { updatedAt: new Date() };
  if (typeof body.enabled === 'boolean') set.enabled = body.enabled;
  for (const key of ['kioskId', 'posAccount', 'posPassword', 'moneyBox', 'remark'] as const) {
    if (typeof body[key] === 'string') set[key] = body[key] as string;
  }
  for (const key of [
    'scoreCostPct',
    'minDeposit',
    'minRedemption',
    'redeemDailyLimit',
    'minDepositToUnlock',
  ] as const) {
    if (body[key] != null && Number.isFinite(Number(body[key]))) set[key] = String(body[key]);
  }

  await db
    .insert(s.storePlatformAccounts)
    .values({ storeId: agent.storeId, platformId, ...set })
    .onConflictDoUpdate({
      target: [s.storePlatformAccounts.storeId, s.storePlatformAccounts.platformId],
      set,
    });
  return NextResponse.json({ ok: true });
}

/** POST /api/agent/game-settings — { platformId } → simulate a kiosk score refresh. */
export async function POST(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const platformId = typeof body.platformId === 'string' ? body.platformId : '';
  if (!platformId) return NextResponse.json({ error: 'platformId required' }, { status: 400 });

  // Real deployments would call the game platform's POS API here.
  await db
    .update(s.storePlatformAccounts)
    .set({ scoreSyncedAt: new Date() })
    .where(
      and(
        eq(s.storePlatformAccounts.storeId, agent.storeId),
        eq(s.storePlatformAccounts.platformId, platformId)
      )
    );
  return NextResponse.json({ ok: true });
}
