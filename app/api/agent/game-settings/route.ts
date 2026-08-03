import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAgentFromRequest } from '@/lib/agent-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const platforms = await db.agent_platform_mappings.findMany({
    where: {
      agent_id: agent.storeId,
      game_platforms: {
        is_active: true,
        deleted_at: null,
      }
    },
    select: {
      game_platforms: {
        select: {
          id: true,
          name: true,
          slug: true,
          icon_url: true,
          external_id: true,
          provider_code: true,
          provider_type: true,
          launch_url: true,
          sort: true,
          is_active: true,
          synced_at: true,
          created_at: true,
        }
      }
    },
    orderBy: [
      { game_platforms: { sort: 'asc' } },
      { game_platforms: { name: 'asc' } }
    ]
  });

  const accounts = await db.store_platform_accounts.findMany({
    where: { store_id: agent.storeId }
  });
  const byPlatform = new Map(accounts.map((a) => [a.platform_id, a]));

  return NextResponse.json({
    platforms: platforms.map((mapping) => {
      const p = mapping.game_platforms;
      const acc = byPlatform.get(p.id);
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        iconUrl: p.icon_url,
        enabled: acc?.enabled ?? false,
        kioskId: acc?.kiosk_id ?? null,
        posAccount: acc?.pos_account ?? null,
        moneyBox: acc?.money_box ?? null,
        remark: acc?.remark ?? null,
        scoreCostPct: acc?.score_cost_pct ?? '20',
        minDeposit: acc?.min_deposit ?? '10',
        minRedemption: acc?.min_redemption ?? '10',
        redeemDailyLimit: acc?.redeem_daily_limit ?? '3000',
        minDepositToUnlock: acc?.min_deposit_to_unlock ?? '0',
        score: acc?.score ?? null,
        scoreSyncedAt: acc?.score_synced_at ?? null,
      };
    }),
  });
}

export async function PUT(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (agent.type !== 'store') {
    return NextResponse.json(
      { error: 'Only the store account can manage game settings' },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const platformId = typeof body.platformId === 'string' ? body.platformId : '';
  if (!platformId) return NextResponse.json({ error: 'platformId required' }, { status: 400 });

  const set: any = { updated_at: new Date() };
  if (typeof body.enabled === 'boolean') set.enabled = body.enabled;
  if (typeof body.kioskId === 'string') set.kiosk_id = body.kioskId;
  if (typeof body.posAccount === 'string') set.pos_account = body.posAccount;
  if (typeof body.posPassword === 'string') set.pos_password = body.posPassword;
  if (typeof body.moneyBox === 'string') set.money_box = body.moneyBox;
  if (typeof body.remark === 'string') set.remark = body.remark;

  if (body.scoreCostPct != null && Number.isFinite(Number(body.scoreCostPct))) set.score_cost_pct = String(body.scoreCostPct);
  if (body.minDeposit != null && Number.isFinite(Number(body.minDeposit))) set.min_deposit = String(body.minDeposit);
  if (body.minRedemption != null && Number.isFinite(Number(body.minRedemption))) set.min_redemption = String(body.minRedemption);
  if (body.redeemDailyLimit != null && Number.isFinite(Number(body.redeemDailyLimit))) set.redeem_daily_limit = String(body.redeemDailyLimit);
  if (body.minDepositToUnlock != null && Number.isFinite(Number(body.minDepositToUnlock))) set.min_deposit_to_unlock = String(body.minDepositToUnlock);

  await db.store_platform_accounts.upsert({
    where: {
      store_id_platform_id: {
        store_id: agent.storeId,
        platform_id: platformId,
      }
    },
    update: set,
    create: {
      store_id: agent.storeId,
      platform_id: platformId,
      ...set
    }
  });
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const platformId = typeof body.platformId === 'string' ? body.platformId : '';
  if (!platformId) return NextResponse.json({ error: 'platformId required' }, { status: 400 });

  await db.store_platform_accounts.updateMany({
    where: {
      store_id: agent.storeId,
      platform_id: platformId
    },
    data: { score_synced_at: new Date() }
  });
  return NextResponse.json({ ok: true });
}
