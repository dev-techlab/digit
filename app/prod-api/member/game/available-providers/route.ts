import { NextResponse } from 'next/server';
import { db } from '@/lib/db';


export async function GET(req: Request) {
  const providerType = new URL(req.url).searchParams.get('providerType');

  const where: any = {
    status: 1,
    deleted_at: null,
  };

  if (providerType === 'SC' || providerType === 'GC') {
    where.provider_type = providerType;
  }

  const providers = await db.game_providers.findMany({
    where,
    orderBy: { sort: 'asc' }
  });

  const tiers = await db.provider_deposit_tiers.findMany({
    orderBy: { sort: 'asc' }
  });
  const tiersByProvider = new Map<number, { amount: string; bonusAmount: string }[]>();
  for (const t of tiers) {
    const list = tiersByProvider.get(t.provider_id) ?? [];
    list.push({ amount: t.amount.toString(), bonusAmount: t.bonus_amount.toString() });
    tiersByProvider.set(t.provider_id, list);
  }

  const data = providers.map((p) => ({
    id: p.id,
    name: p.name,
    providerCode: p.provider_code,
    launchUrlTemplate: p.launch_url_template,
    iconUrl: p.icon_url,
    status: p.status,
    sort: p.sort,
    createType: p.create_type,
    depositTiers: tiersByProvider.get(p.id) ?? null,
    operate: p.operate,
    needInitBalance: p.need_init_balance,
    canManualInput: p.can_manual_input,
    providerType: p.provider_type,
    iframeSupported: p.iframe_supported,
    isMachineSupported: p.is_machine_supported,
    redeemField: p.redeem_field,
    invalidPasswordState: p.invalid_password_state,
    canChangePassword: p.can_change_password,
  }));

  return NextResponse.json({ code: 200, message: '操作成功', data });
}
