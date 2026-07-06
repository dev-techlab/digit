import { describe, it, expect, beforeAll } from 'vitest';
import {
  getProviders,
  getWallet,
  getOrders,
  getTransactions,
  getBonuses,
  getReferral,
  getRedemptionReviews,
} from '@/lib/data';
import { requireSeed } from './helpers';

beforeAll(requireSeed);

describe('getProviders', () => {
  it('returns SC providers only, sorted, with the expected shape', async () => {
    const sc = await getProviders('SC');
    expect(sc.length).toBeGreaterThan(0);
    expect(sc.every((p) => p.providerType === 'SC')).toBe(true);
    expect(sc.map((p) => p.sort)).toEqual([...sc.map((p) => p.sort)].sort((a, b) => a - b));
    expect(sc.some((p) => p.name === 'Golden Dragon')).toBe(true);
  });

  it('returns GC providers separately', async () => {
    const gc = await getProviders('GC');
    expect(gc.every((p) => p.providerType === 'GC')).toBe(true);
  });

  it('normalizes deposit tiers (array or null)', async () => {
    const sc = await getProviders('SC');
    const withTiers = sc.find((p) => p.depositTiers && p.depositTiers.length > 0);
    expect(withTiers).toBeDefined();
    expect(withTiers!.depositTiers![0]).toHaveProperty('amount');
    expect(withTiers!.depositTiers![0]).toHaveProperty('bonusAmount');
  });
});

describe('getWallet — derived totals', () => {
  it('computes totalBalance and withdrawable from the parts', async () => {
    const w = await getWallet();
    const total = Number(w.onlineSC) + Number(w.storeSC) + Number(w.kioskSC);
    expect(Number(w.totalBalance)).toBeCloseTo(total, 2);
    expect(Number(w.withdrawable)).toBeCloseTo(total - Number(w.unwagered), 2);
    // seeded fixture values
    expect(w.totalBalance).toBe('60.25');
    expect(w.withdrawable).toBe('45.25');
  });
});

describe('getBonuses — per-user claim status', () => {
  it('merges the definition with the demo user claim state', async () => {
    const bonuses = await getBonuses();
    const byId = Object.fromEntries(bonuses.map((b) => [b.id, b.status]));
    expect(byId['daily-checkin']).toBe('claimable');
    expect(byId['first-deposit']).toBe('claimed');
    expect(byId['vip-milestone']).toBe('locked');
    expect(byId['invite-friends']).toBe('none'); // no claim row → none
  });
});

describe('getReferral — aggregated summary', () => {
  it('sums commissions and exposes the invite code/link', async () => {
    const r = await getReferral();
    expect(r.inviteCode).toBe('DL8F2K91');
    expect(r.inviteLink).toContain('DL8F2K91');
    expect(r.totalInvited).toBe(3);
    expect(r.totalCommission).toBe('10.00'); // 5 + 5 claimed
    expect(r.pendingCommission).toBe('8.00'); // 8 pending
  });
});

describe('getOrders / getTransactions / getRedemptionReviews', () => {
  it('orders returned newest-first', async () => {
    const orders = await getOrders();
    expect(orders.length).toBe(4);
    const times = orders.map((o) => new Date(o.createTime).getTime());
    expect(times).toEqual([...times].sort((a, b) => b - a));
  });
  it('transactions include deposits and withdrawals', async () => {
    const tx = await getTransactions();
    expect(tx.length).toBe(7);
    expect(tx.some((t) => t.type === 'deposit')).toBe(true);
    expect(tx.some((t) => t.type === 'withdraw')).toBe(true);
  });
  it('redemption reviews carry provider name + status', async () => {
    const rr = await getRedemptionReviews();
    expect(rr.length).toBe(3);
    expect(rr.some((r) => r.status === 'reviewing')).toBe(true);
    expect(rr.every((r) => typeof r.provider === 'string' && r.provider.length > 0)).toBe(true);
  });
});
