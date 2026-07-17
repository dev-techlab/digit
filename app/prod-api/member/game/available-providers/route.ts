import { NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as s from '@/lib/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Local mirror of the upstream Digit Link endpoint
 *   GET /prod-api/member/game/available-providers?inviteCode=&providerType=SC|GC
 *
 * Serves the provider catalog straight from the DB (`game_providers` +
 * `provider_deposit_tiers`) in the exact response shape the upstream API
 * returns, so `PROVIDER_API_BASE_URL` can point at this app itself instead of
 * the third-party (geo-blocked) host. Icon URLs are the self-hosted
 * `/providers/*` paths.
 */
export async function GET(req: Request) {
  const providerType = new URL(req.url).searchParams.get('providerType');

  const where =
    providerType === 'SC' || providerType === 'GC'
      ? eq(s.gameProviders.providerType, providerType)
      : undefined;

  const providers = await db
    .select()
    .from(s.gameProviders)
    .where(where)
    .orderBy(asc(s.gameProviders.sort));

  const tiers = await db
    .select()
    .from(s.providerDepositTiers)
    .orderBy(asc(s.providerDepositTiers.sort));
  const tiersByProvider = new Map<number, { amount: string; bonusAmount: string }[]>();
  for (const t of tiers) {
    const list = tiersByProvider.get(t.providerId) ?? [];
    list.push({ amount: t.amount, bonusAmount: t.bonusAmount });
    tiersByProvider.set(t.providerId, list);
  }

  const data = providers.map((p) => ({
    id: p.id,
    name: p.name,
    providerCode: p.providerCode,
    launchUrlTemplate: p.launchUrlTemplate,
    iconUrl: p.iconUrl,
    status: p.status,
    sort: p.sort,
    createType: p.createType,
    depositTiers: tiersByProvider.get(p.id) ?? null,
    operate: p.operate,
    needInitBalance: p.needInitBalance,
    canManualInput: p.canManualInput,
    providerType: p.providerType,
    iframeSupported: p.iframeSupported,
    isMachineSupported: p.isMachineSupported,
    redeemField: p.redeemField,
    invalidPasswordState: p.invalidPasswordState,
    canChangePassword: p.canChangePassword,
  }));

  return NextResponse.json({ code: 200, message: '操作成功', data });
}
