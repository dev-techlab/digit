import 'server-only';
import { cookies } from 'next/headers';
import { and, eq, asc, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as s from '@/lib/db/schema';
import { userIdForToken } from '@/lib/user-service';
import { USER_SESSION_COOKIE } from '@/lib/auth-tokens';
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
  if (process.env.NODE_ENV !== 'production') {
    const u = await db.query.users.findFirst({
      where: (t, { eq }) => eq(t.username, 'player_2481'),
      columns: { id: true },
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
  const rows = await db
    .select()
    .from(s.gameProviders)
    .where(and(eq(s.gameProviders.providerType, providerType), eq(s.gameProviders.status, 1)))
    .orderBy(asc(s.gameProviders.sort));

  const tiers = await db
    .select()
    .from(s.providerDepositTiers)
    .orderBy(asc(s.providerDepositTiers.sort));

  return rows.map((p) => {
    const t = tiers
      .filter((x) => x.providerId === p.id)
      .map((x) => ({ amount: x.amount, bonusAmount: x.bonusAmount }));
    return {
      id: p.id,
      name: p.name,
      providerCode: p.providerCode,
      launchUrlTemplate: p.launchUrlTemplate,
      iconUrl: p.iconUrl,
      status: p.status,
      sort: p.sort,
      createType: p.createType,
      depositTiers: t.length ? t : null,
      operate: p.operate,
      needInitBalance: p.needInitBalance,
      canManualInput: p.canManualInput,
      providerType: p.providerType,
      iframeSupported: p.iframeSupported,
      isMachineSupported: p.isMachineSupported,
      redeemField: p.redeemField,
      invalidPasswordState: p.invalidPasswordState,
      canChangePassword: p.canChangePassword,
    };
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
  const w = await db.query.wallets.findFirst({ where: (t, { eq }) => eq(t.userId, userId) });
  if (!w) return EMPTY_WALLET;
  const total = add(w.onlineSc, w.storeSc, w.kioskSc);
  const withdrawable = total - Number(w.unwagered);
  return {
    goldCoin: w.goldCoin,
    onlineSC: w.onlineSc,
    storeSC: w.storeSc,
    kioskSC: w.kioskSc,
    totalBalance: total.toFixed(2),
    unwagered: w.unwagered,
    withdrawable: withdrawable.toFixed(2),
    freeBonus: w.freeBonus,
  };
}

// ── Orders ─────────────────────────────────────────────────────────────────
export async function getOrders(): Promise<OrderRecord[]> {
  const userId = await currentUserId();
  if (!userId) return [];
  const rows = await db
    .select()
    .from(s.orders)
    .where(eq(s.orders.userId, userId))
    .orderBy(desc(s.orders.createdAt));
  return rows.map((o) => ({
    orderNo: o.orderNo,
    username: 'player_2481',
    amount: o.amount,
    payAmount: o.payAmount,
    actualDepositAmount: o.actualDepositAmount,
    paymentMethod: o.paymentMethod,
    fee: o.fee,
    feeMode: o.feeMode,
    feeWaived: o.feeWaived,
    scBonus: o.scBonus,
    status: o.status,
    createTime: o.createdAt.toISOString(),
  }));
}

// ── Transactions ─────────────────────────────────────────────────────────────
export async function getTransactions(): Promise<Transaction[]> {
  const userId = await currentUserId();
  if (!userId) return [];
  const rows = await db
    .select()
    .from(s.transactions)
    .where(eq(s.transactions.userId, userId))
    .orderBy(desc(s.transactions.createdAt));
  return rows.map((t) => ({
    id: t.id,
    address: t.address,
    methodLabel: t.methodLabel,
    method: t.method,
    status: t.status,
    amount: t.amount,
    type: t.type,
    createTime: t.createdAt.toISOString(),
  }));
}

// ── Bonuses (definition + this user's claim status) ──────────────────────────
export async function getBonuses(): Promise<BonusReward[]> {
  const userId = await currentUserId();
  const defs = await db.select().from(s.bonuses).orderBy(asc(s.bonuses.sort));
  const claims = userId
    ? await db.select().from(s.userBonusClaims).where(eq(s.userBonusClaims.userId, userId))
    : [];
  const claimByBonus = new Map(claims.map((c) => [c.bonusId, c]));

  return defs.map((b) => {
    const status = claimByBonus.get(b.id)?.status ?? 'none';
    const banner: BonusReward['banner'] =
      b.bannerType === 'gradient'
        ? {
            type: 'gradient',
            gradient: b.bannerGradient ?? '',
            badgeIcon: b.bannerBadgeIcon ?? undefined,
            badgeText: b.bannerBadgeText ?? undefined,
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
        icon: b.scheduleIcon,
        text: b.scheduleText,
        countdownSeconds: b.scheduleCountdownSeconds ?? undefined,
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

  const user = await db.query.users.findFirst({ where: (t, { eq }) => eq(t.id, userId) });
  const rows = await db
    .select()
    .from(s.referralCommissions)
    .where(eq(s.referralCommissions.referrerUserId, userId))
    .orderBy(asc(s.referralCommissions.joinedAt));

  const totalCommission = rows
    .filter((r) => r.status === 'claimed')
    .reduce((n, r) => n + Number(r.reward), 0);
  const pendingCommission = rows
    .filter((r) => r.status === 'pending')
    .reduce((n, r) => n + Number(r.reward), 0);
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? '';

  return {
    inviteCode: user?.inviteCode ?? '',
    inviteLink: user ? `${site}/?inviteCode=${user.inviteCode}` : '',
    totalInvited: rows.length,
    totalCommission: totalCommission.toFixed(2),
    pendingCommission: pendingCommission.toFixed(2),
    invitees: rows.map((r) => ({
      username: r.inviteeDisplay,
      joinedAt: r.joinedAt.toISOString(),
      reward: r.reward,
      status: r.status,
    })),
  };
}

// ── Redemption reviews ───────────────────────────────────────────────────────
export async function getRedemptionReviews(): Promise<RedemptionReview[]> {
  const userId = await currentUserId();
  if (!userId) return [];
  const rows = await db
    .select()
    .from(s.redemptionReviews)
    .where(eq(s.redemptionReviews.userId, userId))
    .orderBy(desc(s.redemptionReviews.submittedAt));
  return rows.map((r) => ({
    id: r.id,
    orderNo: r.orderNo,
    amount: r.amount,
    provider: r.providerName,
    status: r.status,
    visible: r.visible,
    submittedAt: r.submittedAt.toISOString(),
  }));
}
