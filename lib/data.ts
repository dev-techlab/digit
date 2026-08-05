import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { userIdForToken } from '@/lib/user-service';
import { USER_SESSION_COOKIE } from '@/lib/auth-tokens';
import { env } from '@/lib/env';
import type {
  GameProvider,
  WalletBalance,
  OrderRecord,
  Transaction,
  BonusReward,
  ReferralSummary,
  RedemptionReview,
} from '@/lib/types';

/**
 * The current user is resolved from the `session` cookie. When there is no
 * valid session, production fails closed (no user → empty data); in dev we fall
 * back to the seeded demo account so the app stays browsable without logging in.
 */
async function currentUserId(): Promise<string | null> {
  const token = cookies().get(USER_SESSION_COOKIE)?.value;
  if (token) {
    const uid = await userIdForToken(token);
    if (uid) return uid;
  }
  if (env.NODE_ENV !== 'production') {
    const u = await db.users.findFirst({
      where: { username: 'player_2481' },
      select: { id: true },
    });
    return u?.id ?? null;
  }
  return null;
}

function add(...vals: string[]): number {
  return vals.reduce((n, v) => n + Number(v), 0);
}

// ── Game providers (replaces lib/providers.ts read) ──────────────────────────
export async function getProviders(providerType: 'SC' | 'GC'): Promise<GameProvider[]> {
  const rows = await db.game_providers.findMany({
    where: {
      provider_type: providerType,
      status: 1,
      deleted_at: null,
    },
    orderBy: { sort: 'asc' },
  });

  const tiers = await db.provider_deposit_tiers.findMany({
    orderBy: { sort: 'asc' },
  });

  const userId = await currentUserId();
  
  let allowedNames: Set<string> | null = null;
  if (userId) {
    const user = await db.users.findUnique({ where: { id: userId }, select: { agent_invite_code: true } });
    if (user?.agent_invite_code) {
      const agent = await db.agents.findFirst({
        where: { invite_code: user.agent_invite_code },
        select: { id: true, store_id: true }
      });
      if (agent) {
        const storeId = agent.store_id ?? agent.id;
        
        // Fetch master platforms allowed for this store
        const allowedMappings = await db.agent_platform_mappings.findMany({
          where: { agent_id: storeId },
          select: { platform_id: true, game_platforms: { select: { name: true } } }
        });
        
        // Fetch user-enabled accounts for this store
        const enabledAccounts = await db.store_platform_accounts.findMany({
          where: { store_id: storeId, enabled: true },
          select: { platform_id: true }
        });
        
        // Intersect them
        const enabledPlatformIds = new Set(enabledAccounts.map(a => a.platform_id));
        const validPlatforms = allowedMappings.filter(m => enabledPlatformIds.has(m.platform_id));
        
        allowedNames = new Set(validPlatforms.map(m => m.game_platforms.name.toLowerCase()));
      }
    }
  }

  const finalRows = allowedNames 
    ? rows.filter(r => allowedNames!.has(r.name.toLowerCase()))
    : rows;

  return finalRows.map((p: any) => {
    const t = tiers
      .filter((x: any) => x.provider_id === p.id)
      .map((x: any) => ({ amount: Number(x.amount), bonusAmount: Number(x.bonus_amount) }));
    return {
      id: p.id,
      name: p.name,
      providerCode: p.provider_code,
      launchUrlTemplate: p.launch_url_template,
      iconUrl: p.icon_url,
      status: p.status,
      sort: p.sort,
      createType: p.create_type,
      depositTiers: t.length ? t : null,
      operate: p.operate,
      needInitBalance: p.need_init_balance,
      canManualInput: p.can_manual_input,
      providerType: p.provider_type,
      iframeSupported: p.iframe_supported,
      isMachineSupported: p.is_machine_supported,
      redeemField: p.redeem_field,
      invalidPasswordState: p.invalid_password_state,
      canChangePassword: p.can_change_password,
    } as any;
  });
}

// ── Wallet ───────────────────────────────────────────────────────────────────
const EMPTY_WALLET: WalletBalance = {
  goldCoin: '0.00',
  onlineSC: '0.00',
  storeSC: '0.00',
  kioskSC: '0.00',
  totalBalance: '0.00',
  unwagered: '0.00',
  withdrawable: '0.00',
  freeBonus: '0.00',
};

export async function getWallet(): Promise<WalletBalance> {
  const userId = await currentUserId();
  if (!userId) return EMPTY_WALLET;
  const w = await db.wallets.findFirst({ where: { user_id: userId } });
  if (!w) return EMPTY_WALLET;
  const total = add(w.online_sc.toString(), w.store_sc.toString(), w.kiosk_sc.toString());
  const withdrawable = total - Number(w.unwagered);
  return {
    goldCoin: w.gold_coin.toString(),
    onlineSC: w.online_sc.toString(),
    storeSC: w.store_sc.toString(),
    kioskSC: w.kiosk_sc.toString(),
    totalBalance: total.toFixed(2),
    unwagered: w.unwagered.toString(),
    withdrawable: withdrawable.toFixed(2),
    freeBonus: w.free_bonus.toString(),
  };
}

// ── Orders ─────────────────────────────────────────────────────────────────
export async function getOrders(): Promise<OrderRecord[]> {
  const userId = await currentUserId();
  if (!userId) return [];
  const user = await db.users.findFirst({
    where: { id: userId },
    select: { username: true },
  });
  const rows = await db.orders.findMany({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' },
  });
  return rows.map((o: any) => ({
    orderNo: o.order_no,
    username: user?.username ?? '',
    amount: o.amount.toString(),
    payAmount: o.pay_amount.toString(),
    actualDepositAmount: o.actual_deposit_amount.toString(),
    paymentMethod: o.payment_method,
    fee: o.fee.toString(),
    feeMode: o.fee_mode,
    feeWaived: o.fee_waived,
    scBonus: o.sc_bonus.toString(),
    status: o.status,
    createTime: o.created_at.toISOString(),
  }));
}

// ── Transactions ─────────────────────────────────────────────────────────────
export async function getTransactions(): Promise<Transaction[]> {
  const userId = await currentUserId();
  if (!userId) return [];
  const rows = await db.transactions.findMany({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' },
  });
  return rows.map((t: any) => ({
    id: t.id,
    address: t.address,
    methodLabel: t.method_label,
    method: t.method,
    status: t.status,
    amount: t.amount.toString(),
    type: t.type,
    createTime: t.created_at.toISOString(),
  }));
}

// ── Bonuses (definition + this user's claim status) ──────────────────────────
export async function getBonuses(): Promise<BonusReward[]> {
  const userId = await currentUserId();
  const defs = await db.bonuses.findMany({
    where: { deleted_at: null },
    orderBy: { sort: 'asc' },
  });
  const claims = userId
    ? await db.user_bonus_claims.findMany({ where: { user_id: userId } })
    : [];
  const claimByBonus = new Map(claims.map((c: any) => [c.bonus_id, c]));

  return defs.map((b) => {
    const status = claimByBonus.get(b.id)?.status ?? 'none';
    const banner: BonusReward['banner'] =
      b.banner_type === 'gradient'
        ? {
            type: 'gradient',
            gradient: b.banner_gradient ?? '',
            badgeIcon: b.banner_badge_icon ?? undefined,
            badgeText: b.banner_badge_text ?? undefined,
          }
        : { type: 'placeholder' };
    return {
      id: b.id,
      title: b.title,
      description: b.description,
      tags: b.tags,
      active: b.active,
      banner,
      schedule: {
        icon: b.schedule_icon,
        text: b.schedule_text,
        countdownSeconds: b.schedule_countdown_seconds ?? undefined,
      },
      status,
    };
  });
}

// ── Referral summary (aggregated) ────────────────────────────────────────────
export async function getReferral(): Promise<ReferralSummary> {
  const userId = await currentUserId();
  const empty: ReferralSummary = {
    inviteCode: '',
    inviteLink: '',
    totalInvited: 0,
    totalCommission: '0.00',
    pendingCommission: '0.00',
    invitees: [],
  };
  if (!userId) return empty;

  const user = await db.users.findFirst({ where: { id: userId } });
  const rows = await db.referral_commissions.findMany({
    where: { referrer_user_id: userId },
    orderBy: { joined_at: 'asc' },
  });

  const totalCommission = rows
    .filter((r) => r.status === 'claimed')
    .reduce((n, r) => n + Number(r.reward), 0);
  const pendingCommission = rows
    .filter((r) => r.status === 'pending')
    .reduce((n, r) => n + Number(r.reward), 0);
  const site = env.NEXT_PUBLIC_SITE_URL || '';

  return {
    inviteCode: user?.invite_code ?? '',
    inviteLink: user ? `${site}/?inviteCode=${user.invite_code}` : '',
    totalInvited: rows.length,
    totalCommission: totalCommission.toFixed(2),
    pendingCommission: pendingCommission.toFixed(2),
    invitees: rows.map((r: any) => ({
      username: r.invitee_display,
      joinedAt: r.joined_at.toISOString(),
      reward: r.reward.toString(),
      status: r.status,
    })),
  };
}

// ── Redemption reviews ───────────────────────────────────────────────────────
export async function getRedemptionReviews(): Promise<RedemptionReview[]> {
  const userId = await currentUserId();
  if (!userId) return [];
  const rows = await db.redemption_reviews.findMany({
    where: { user_id: userId },
    orderBy: { submitted_at: 'desc' },
  });
  return rows.map((r: any) => ({
    id: r.id,
    orderNo: r.order_no,
    amount: r.amount.toString(),
    provider: r.provider_name,
    status: r.status,
    visible: r.visible,
    submittedAt: r.submitted_at.toISOString(),
  }));
}
