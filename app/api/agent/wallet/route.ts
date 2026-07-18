import { NextResponse } from 'next/server';
import { and, desc, eq, gte, lt, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '@/lib/db';
import * as s from '@/lib/db/schema';
import { getAgentFromRequest } from '@/lib/agent-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

class InsufficientBalanceError extends Error {}

const DEPOSIT_METHODS = ['paypal_pyusd', 'cashapp_usdc', 'bitcoin', 'bitcoin_lightning'] as const;
const WITHDRAW_METHODS = ['paypal_pyusd', 'cashapp_usdc', 'bitcoin', 'bank_card', 'ach'] as const;

/** GET /api/agent/wallet — balances, settings, invite link, funding logs + daily report. */
export async function GET(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [store] = await db
    .select({
      email: s.agents.email,
      username: s.agents.username,
      inviteCode: s.agents.inviteCode,
      onlineBalance: s.agents.onlineBalance,
      tipsBalance: s.agents.tipsBalance,
    })
    .from(s.agents)
    .where(eq(s.agents.id, agent.storeId));

  const [settings] = await db
    .select()
    .from(s.storeSettings)
    .where(eq(s.storeSettings.storeId, agent.storeId));

  const counterparty = alias(s.agents, 'counterparty');
  const logs = await db
    .select({
      id: s.agentTransactions.id,
      type: s.agentTransactions.type,
      method: s.agentTransactions.method,
      amount: s.agentTransactions.amount,
      fee: s.agentTransactions.fee,
      address: s.agentTransactions.address,
      balanceBefore: s.agentTransactions.balanceBefore,
      balanceAfter: s.agentTransactions.balanceAfter,
      remark: s.agentTransactions.remark,
      counterparty: counterparty.username,
      status: s.agentTransactions.status,
      createdAt: s.agentTransactions.createdAt,
    })
    .from(s.agentTransactions)
    .leftJoin(counterparty, eq(counterparty.id, s.agentTransactions.counterpartyAgentId))
    .where(eq(s.agentTransactions.agentId, agent.storeId))
    .orderBy(desc(s.agentTransactions.createdAt))
    .limit(200);

  // Daily deposit report for the trailing 4 days (mirrors the production widget).
  const from = new Date(Date.now() - 4 * 864e5);
  const report = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${s.agentTransactions.createdAt}), 'YYYY-MM-DD')`,
      deposit: sql<string>`coalesce(sum(${s.agentTransactions.amount}) filter (where ${s.agentTransactions.type} = 'deposit'), 0)`,
      depositFee: sql<string>`coalesce(sum(${s.agentTransactions.fee}) filter (where ${s.agentTransactions.type} = 'deposit'), 0)`,
      depositOrders: sql<number>`count(*) filter (where ${s.agentTransactions.type} = 'deposit')::int`,
    })
    .from(s.agentTransactions)
    .where(
      and(
        eq(s.agentTransactions.agentId, agent.storeId),
        gte(s.agentTransactions.createdAt, from),
        lt(s.agentTransactions.createdAt, new Date())
      )
    )
    .groupBy(sql`1`)
    .orderBy(sql`1 desc`);

  return NextResponse.json({ store, settings, logs, report });
}

/** PUT /api/agent/wallet — update store settings / email / logo. */
export async function PUT(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (agent.type !== 'store') {
    return NextResponse.json(
      { error: 'Only the store account can manage the wallet' },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);

  // Store email lives on the agent row, not in store_settings.
  if (typeof body.email === 'string' && body.email.includes('@')) {
    await db.update(s.agents).set({ email: body.email }).where(eq(s.agents.id, agent.storeId));
  }

  const patch: Partial<typeof s.storeSettings.$inferInsert> = { updatedAt: new Date() };
  if (typeof body.storeName === 'string') patch.storeName = body.storeName.slice(0, 20);
  for (const key of ['dailyMaxRedeem', 'dailyMaxWithdraw', 'phoneBindRewardSc'] as const) {
    if (body[key] != null && Number.isFinite(Number(body[key]))) patch[key] = String(body[key]);
  }
  if (typeof body.logoUrl === 'string') {
    if (body.logoUrl.length > 2.8 * 1024 * 1024) {
      return NextResponse.json({ error: 'Logo must be at most 2MB' }, { status: 400 });
    }
    patch.logoUrl = body.logoUrl;
  }

  await db
    .insert(s.storeSettings)
    .values({ storeId: agent.storeId, ...patch })
    .onConflictDoUpdate({ target: s.storeSettings.storeId, set: patch });
  return NextResponse.json({ ok: true });
}

/**
 * POST /api/agent/wallet — funding actions:
 *   { action: 'deposit',  method, amount }                     — min $50
 *   { action: 'withdraw', method, amount, address }            — $2 fee on PYUSD/USDC
 *   { action: 'transfer', recipient, amount, remark }          — to an agent in this store
 *   { action: 'clear_tips' }                                   — tips → online balance
 *   { action: 'cancel', id }                                   — cancel own pending tx
 */
export async function POST(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (agent.type !== 'store') {
    return NextResponse.json(
      { error: 'Only the store account can manage the wallet' },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const action = body.action;

  if (action === 'clear_tips') {
    // Lock the row for the life of the transaction so a concurrent clear_tips
    // (double-click, two tabs) can't both read the same pre-clear tips value.
    const cleared = await db.transaction(async (tx) => {
      const [store] = await tx
        .select({ tips: s.agents.tipsBalance })
        .from(s.agents)
        .where(eq(s.agents.id, agent.storeId))
        .for('update');
      const tips = Number(store?.tips ?? 0);
      if (tips <= 0) return 0;
      await tx
        .update(s.agents)
        .set({
          onlineBalance: sql`${s.agents.onlineBalance} + ${tips}`,
          tipsBalance: '0',
        })
        .where(eq(s.agents.id, agent.storeId));
      await tx.insert(s.agentTransactions).values({
        agentId: agent.storeId,
        type: 'transfer',
        amount: String(tips),
        remark: 'Tips cleared to online balance',
        status: 'completed',
      });
      return tips;
    });
    return NextResponse.json({ ok: true, cleared });
  }

  if (action === 'cancel') {
    const id = typeof body.id === 'string' ? body.id : '';
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const [txRow] = await db
      .select()
      .from(s.agentTransactions)
      .where(
        and(
          eq(s.agentTransactions.id, id),
          eq(s.agentTransactions.agentId, agent.storeId),
          eq(s.agentTransactions.status, 'pending')
        )
      );
    if (!txRow) return NextResponse.json({ error: 'Pending order not found' }, { status: 404 });
    await db.transaction(async (tx) => {
      await tx
        .update(s.agentTransactions)
        .set({ status: 'cancelled' })
        .where(eq(s.agentTransactions.id, id));
      // Withdrawals debit the balance on submit — refund on cancel.
      if (txRow.type === 'withdraw') {
        await tx
          .update(s.agents)
          .set({ onlineBalance: sql`${s.agents.onlineBalance} + ${Number(txRow.amount)}` })
          .where(eq(s.agents.id, agent.storeId));
      }
    });
    return NextResponse.json({ ok: true });
  }

  const amount = Number(body.amount);
  if (action !== 'withdraw' && action !== 'deposit' && action !== 'transfer') {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
  }

  if (action === 'deposit') {
    if (amount < 50) {
      return NextResponse.json({ error: 'Minimum deposit is 50 USD' }, { status: 400 });
    }
    const method = DEPOSIT_METHODS.includes(body.method as (typeof DEPOSIT_METHODS)[number])
      ? (body.method as (typeof DEPOSIT_METHODS)[number])
      : null;
    if (!method) return NextResponse.json({ error: 'Select a payment method' }, { status: 400 });
    const [store] = await db
      .select({ balance: s.agents.onlineBalance })
      .from(s.agents)
      .where(eq(s.agents.id, agent.storeId));
    await db.insert(s.agentTransactions).values({
      agentId: agent.storeId,
      type: 'deposit',
      method,
      amount: String(amount),
      balanceBefore: String(store.balance),
      status: 'pending',
    });
    return NextResponse.json({ ok: true });
  }

  if (action === 'withdraw') {
    const method = WITHDRAW_METHODS.includes(body.method as (typeof WITHDRAW_METHODS)[number])
      ? (body.method as (typeof WITHDRAW_METHODS)[number])
      : null;
    if (!method) return NextResponse.json({ error: 'Select a withdrawal method' }, { status: 400 });
    // Flat fee up to $2 on PYUSD/USDC rails (mirrors production fee badges).
    const fee = method === 'paypal_pyusd' || method === 'cashapp_usdc' ? Math.min(2, amount) : 0;
    try {
      await db.transaction(async (tx) => {
        // Lock the balance row for the life of the transaction so a concurrent
        // withdraw/transfer can't pass the same stale balance check twice.
        const [row] = await tx
          .select({ balance: s.agents.onlineBalance })
          .from(s.agents)
          .where(eq(s.agents.id, agent.storeId))
          .for('update');
        const balance = Number(row.balance);
        if (balance < amount) throw new InsufficientBalanceError();
        await tx.insert(s.agentTransactions).values({
          agentId: agent.storeId,
          type: 'withdraw',
          method,
          amount: String(amount),
          fee: String(fee),
          address: typeof body.address === 'string' ? body.address : null,
          balanceBefore: String(balance),
          balanceAfter: String(balance - amount),
          status: 'pending',
        });
        await tx
          .update(s.agents)
          .set({ onlineBalance: sql`${s.agents.onlineBalance} - ${amount}` })
          .where(eq(s.agents.id, agent.storeId));
      });
    } catch (err) {
      if (err instanceof InsufficientBalanceError) {
        return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
      }
      throw err;
    }
    return NextResponse.json({ ok: true });
  }

  // transfer
  const recipient = typeof body.recipient === 'string' ? body.recipient.trim() : '';
  if (!recipient) {
    return NextResponse.json({ error: 'Recipient agent is required' }, { status: 400 });
  }
  const [target] = await db
    .select({ id: s.agents.id })
    .from(s.agents)
    .where(and(eq(s.agents.username, recipient), eq(s.agents.storeId, agent.storeId)));
  if (!target || target.id === agent.storeId) {
    return NextResponse.json({ error: 'Recipient agent not found in your store' }, { status: 404 });
  }
  try {
    await db.transaction(async (tx) => {
      // Lock the sender's balance row so a concurrent withdraw/transfer can't
      // pass the same stale balance check twice.
      const [row] = await tx
        .select({ balance: s.agents.onlineBalance })
        .from(s.agents)
        .where(eq(s.agents.id, agent.storeId))
        .for('update');
      const balance = Number(row.balance);
      if (balance < amount) throw new InsufficientBalanceError();
      await tx.insert(s.agentTransactions).values({
        agentId: agent.storeId,
        type: 'transfer',
        amount: String(amount),
        counterpartyAgentId: target.id,
        remark: typeof body.remark === 'string' ? body.remark.slice(0, 100) : null,
        balanceBefore: String(balance),
        balanceAfter: String(balance - amount),
        status: 'completed',
      });
      await tx
        .update(s.agents)
        .set({ onlineBalance: sql`${s.agents.onlineBalance} - ${amount}` })
        .where(eq(s.agents.id, agent.storeId));
      await tx
        .update(s.agents)
        .set({ onlineBalance: sql`${s.agents.onlineBalance} + ${amount}` })
        .where(eq(s.agents.id, target.id));
    });
  } catch (err) {
    if (err instanceof InsufficientBalanceError) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }
    throw err;
  }
  return NextResponse.json({ ok: true });
}
