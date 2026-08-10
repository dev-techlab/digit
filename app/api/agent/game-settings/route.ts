import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAgentFromRequest } from '@/lib/agent-auth';
import { z } from 'zod';

const putSchema = z.object({
  platformId: z.string().min(1, 'platformId required'),
  enabled: z.boolean().optional(),
  kioskId: z.string().optional(),
  posAccount: z.string().optional(),
  posPassword: z.string().optional(),
  moneyBox: z.string().optional(),
  remark: z.string().optional(),
  scoreCostPct: z.coerce.number().optional(),
  minDeposit: z.coerce.number().optional(),
  minRedemption: z.coerce.number().optional(),
  redeemDailyLimit: z.coerce.number().optional(),
  minDepositToUnlock: z.coerce.number().optional()
});

const postSchema = z.object({
  platformId: z.string().min(1, 'platformId required')
});


export async function GET(req: Request) {
  try {
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
  } catch (err: any) {
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
    console.error('GET /api/agent/game-settings', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const agent = await getAgentFromRequest(req);
    if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (agent.type !== 'store') {
      return NextResponse.json(
        { error: 'Only the store account can manage game settings' },
        { status: 403 }
      );
    }
  
    const body = await req.json().catch(() => ({}));
    const parseResult = putSchema.safeParse(body);
  
    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error.issues[0]?.message || 'Invalid input' }, { status: 400 });
    }
  
    const data = parseResult.data;
    const platformId = data.platformId;
  
    const set: any = { updated_at: new Date() };
    if (data.enabled !== undefined) set.enabled = data.enabled;
    if (data.kioskId !== undefined) set.kiosk_id = data.kioskId;
    if (data.posAccount !== undefined) set.pos_account = data.posAccount;
    if (data.posPassword !== undefined) set.pos_password = data.posPassword;
    if (data.moneyBox !== undefined) set.money_box = data.moneyBox;
    if (data.remark !== undefined) set.remark = data.remark;
  
    if (data.scoreCostPct !== undefined) set.score_cost_pct = String(data.scoreCostPct);
    if (data.minDeposit !== undefined) set.min_deposit = String(data.minDeposit);
    if (data.minRedemption !== undefined) set.min_redemption = String(data.minRedemption);
    if (data.redeemDailyLimit !== undefined) set.redeem_daily_limit = String(data.redeemDailyLimit);
    if (data.minDepositToUnlock !== undefined) set.min_deposit_to_unlock = String(data.minDepositToUnlock);
  
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
  } catch (err: any) {
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
    console.error('PUT /api/agent/game-settings', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const agent = await getAgentFromRequest(req);
    if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
    const body = await req.json().catch(() => ({}));
    const parseResult = postSchema.safeParse(body);
  
    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error.issues[0]?.message || 'Invalid input' }, { status: 400 });
    }
  
    const { platformId } = parseResult.data;
  
    await db.store_platform_accounts.updateMany({
      where: {
        store_id: agent.storeId,
        platform_id: platformId
      },
      data: { score_synced_at: new Date() }
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
    console.error('POST /api/agent/game-settings', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
