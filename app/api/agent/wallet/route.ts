import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAgentFromRequest } from '@/lib/agent-auth';
import { z } from 'zod';

const putSchema = z.object({
  email: z.string().email().optional(),
  storeName: z.string().max(20).optional(),
  dailyMaxRedeem: z.coerce.number().optional(),
  dailyMaxWithdraw: z.coerce.number().optional(),
  phoneBindRewardSc: z.coerce.number().optional(),
  logoUrl: z.string().max(2.8 * 1024 * 1024, 'Logo must be at most 2MB').optional()
});

const postSchema = z.object({
  action: z.enum(['clear_tips', 'cancel', 'withdraw', 'deposit', 'transfer'], { message: "Invalid input" }),
  id: z.string().trim().optional(),
  amount: z.coerce.number().optional(),
  method: z.string().nullable().optional()
});class InsufficientBalanceError extends Error {}

const DEPOSIT_METHODS = ['paypal_pyusd', 'cashapp_usdc', 'bitcoin', 'bitcoin_lightning'] as const;
const WITHDRAW_METHODS = ['paypal_pyusd', 'cashapp_usdc', 'bitcoin', 'bank_card', 'ach'] as const;

export async function GET(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const fromStr = searchParams.get('from');
  const toStr = searchParams.get('to');
  const tzParam = searchParams.get('tz') || 'America/New_York';
  const tzStr = tzParam === 'browser' ? 'UTC' : tzParam; 

  const store = await db.agents.findUnique({
    where: { id: agent.storeId },
    select: {
      email: true,
      username: true,
      invite_code: true,
      online_balance: true,
      tips_balance: true,
      commission_per: true,
    }
  });

  const settings = await db.store_settings.findUnique({
    where: { store_id: agent.storeId }
  });

  const tzSafe = tzStr.replace(/'/g, "''");
  let dateFilterStr = `agent_id = $1`;
  const params: any[] = [agent.storeId];
  let pIdx = 2;

  if (fromStr) {
    dateFilterStr += ` AND t.created_at AT TIME ZONE '${tzSafe}' >= $${pIdx++}`;
    params.push(`${fromStr} 00:00:00`);
  }
  if (toStr) {
    dateFilterStr += ` AND t.created_at AT TIME ZONE '${tzSafe}' <= $${pIdx++}`;
    params.push(`${toStr} 23:59:59`);
  }

  const logsRaw = await db.$queryRawUnsafe(`
    SELECT 
      t.id,
      t.type,
      t.method,
      t.amount,
      t.fee,
      t.commission_per,
      t.net_amount,
      t.address,
      t.balance_before,
      t.balance_after,
      t.remark,
      c.username AS counterparty,
      t.status,
      t.created_at
    FROM agent_transactions t
    LEFT JOIN agents c ON c.id = t.counterparty_agent_id
    WHERE ${dateFilterStr}
    ORDER BY t.created_at DESC
    LIMIT 200
  `, ...params);

  const reportRaw = await db.$queryRawUnsafe(`
    SELECT 
      TO_CHAR(DATE_TRUNC('day', t.created_at AT TIME ZONE '${tzSafe}'), 'YYYY-MM-DD') AS day,
      COALESCE(SUM(amount) FILTER (WHERE type = 'deposit'), 0) AS deposit,
      COALESCE(SUM(fee) FILTER (WHERE type = 'deposit'), 0) AS "depositFee",
      COUNT(*) FILTER (WHERE type = 'deposit')::int AS "depositOrders"
    FROM agent_transactions t
    WHERE ${dateFilterStr}
    GROUP BY 1
    ORDER BY 1 DESC
  `, ...params);

  return NextResponse.json({ 
    store: store ? {
      email: store.email,
      username: store.username,
      inviteCode: store.invite_code,
      onlineBalance: store.online_balance,
      tipsBalance: store.tips_balance,
      commissionPer: store.commission_per,
    } : null, 
    settings: settings ? {
      storeId: settings.store_id,
      storeName: settings.store_name,
      logoUrl: settings.logo_url,
      dailyMaxRedeem: settings.daily_max_redeem,
      dailyMaxWithdraw: settings.daily_max_withdraw,
      phoneBindRewardSc: settings.phone_bind_reward_sc,
      updatedAt: settings.updated_at,
    } : null, 
    logs: (logsRaw as any[]).map(r => ({
      id: r.id,
      type: r.type,
      method: r.method,
      amount: r.amount?.toString(),
      fee: r.fee?.toString(),
      commissionPer: r.commission_per?.toString(),
      netAmount: r.net_amount?.toString(),
      address: r.address,
      balanceBefore: r.balance_before?.toString(),
      balanceAfter: r.balance_after?.toString(),
      remark: r.remark,
      counterparty: r.counterparty,
      status: r.status,
      createdAt: r.created_at,
    })), 
    report: (reportRaw as any[]).map(r => ({
      ...r,
      deposit: r.deposit?.toString(),
      depositFee: r.depositFee?.toString()
    }))
  });
}

export async function PUT(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (agent.type !== 'store') {
    return NextResponse.json(
      { error: 'Only the store account can manage the wallet' },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const parseResult = putSchema.safeParse(body);

  if (!parseResult.success) {
    return NextResponse.json({ error: parseResult.error.issues[0]?.message || 'Invalid input' }, { status: 400 });
  }

  const data = parseResult.data;

  if (data.email) {
    await db.agents.update({
      where: { id: agent.storeId },
      data: { email: data.email }
    });
  }

  const patch: any = { updated_at: new Date() };
  if (data.storeName !== undefined) patch.store_name = data.storeName;
  if (data.dailyMaxRedeem !== undefined) patch.daily_max_redeem = String(data.dailyMaxRedeem);
  if (data.dailyMaxWithdraw !== undefined) patch.daily_max_withdraw = String(data.dailyMaxWithdraw);
  if (data.phoneBindRewardSc !== undefined) patch.phone_bind_reward_sc = String(data.phoneBindRewardSc);
  if (data.logoUrl !== undefined) patch.logo_url = data.logoUrl;

  await db.store_settings.upsert({
    where: { store_id: agent.storeId },
    create: {
      store_id: agent.storeId,
      ...patch
    },
    update: patch
  });
  
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (agent.type !== 'store') {
    return NextResponse.json(
      { error: 'Only the store account can manage the wallet' },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const parseResult = postSchema.safeParse(body);

  if (!parseResult.success) {
    return NextResponse.json({ error: parseResult.error.issues[0]?.message || 'Invalid input' }, { status: 400 });
  }

  const data = parseResult.data;
  const action = data.action;

  if (action === 'clear_tips') {
    const cleared = await db.$transaction(async (tx) => {
      const stores = await tx.$queryRaw<any[]>`
        SELECT tips_balance
        FROM agents
        WHERE id = ${agent.storeId}
        FOR UPDATE
      `;
      const tips = Number(stores[0]?.tips_balance ?? 0);
      if (tips <= 0) return 0;
      await tx.agents.update({
        where: { id: agent.storeId },
        data: {
          online_balance: { increment: tips },
          tips_balance: '0'
        }
      });
      await tx.agent_transactions.create({
        data: {
          agent_id: agent.storeId,
          type: 'transfer',
          amount: String(tips),
          remark: 'Tips cleared to online balance',
          status: 'completed',
        }
      });
      return tips;
    });
    return NextResponse.json({ ok: true, cleared });
  }

  if (action === 'cancel') {
    const id = data.id;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const txRow = await db.agent_transactions.findFirst({
      where: {
        id,
        agent_id: agent.storeId,
        status: 'pending'
      }
    });
    if (!txRow) return NextResponse.json({ error: 'Pending order not found' }, { status: 404 });
    await db.$transaction(async (tx) => {
      await tx.agent_transactions.update({
        where: { id },
        data: { status: 'cancelled' }
      });
      if (txRow.type === 'withdraw') {
        await tx.agents.update({
          where: { id: agent.storeId },
          data: { online_balance: { increment: Number(txRow.amount) } }
        });
      }
    });
    return NextResponse.json({ ok: true });
  }

  const amount = data.amount;
  if (amount === undefined || amount <= 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
  }

  if (action === 'deposit') {
    if (amount < 50) {
      return NextResponse.json({ error: 'Minimum deposit is 50 USD' }, { status: 400 });
    }
    const method = DEPOSIT_METHODS.includes(data.method as any) ? data.method : null;
    if (!method) return NextResponse.json({ error: 'Select a payment method' }, { status: 400 });
    const store = await db.agents.findUnique({
      where: { id: agent.storeId },
      select: { online_balance: true }
    });
    await db.agent_transactions.create({
      data: {
        agent_id: agent.storeId,
        type: 'deposit',
        method: method as any,
        amount: String(amount),
        balance_before: String(store?.online_balance || 0),
        status: 'pending',
      }
    });
    return NextResponse.json({ ok: true });
  }

  if (action === 'withdraw') {
    const method = WITHDRAW_METHODS.includes(data.method as any) ? data.method : null;
    if (!method) return NextResponse.json({ error: 'Select a withdrawal method' }, { status: 400 });

    try {
      await db.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<any[]>`
          SELECT online_balance, commission_per
          FROM agents
          WHERE id = ${agent.storeId}
          FOR UPDATE
        `;
        const row = rows[0];
        const commPer = Number(row?.commission_per || 0);
        const fee = amount * (commPer / 100);
        const netAmount = amount - fee;
        const balance = Number(row?.online_balance || 0);
        if (balance < amount) throw new InsufficientBalanceError();
        
        await tx.agent_transactions.create({
          data: {
            agent_id: agent.storeId,
            type: 'withdraw',
            method: method as any,
            amount: String(amount),
            fee: String(fee),
            commission_per: String(commPer),
            net_amount: String(netAmount),
            address: typeof body.address === 'string' ? body.address : null,
            balance_before: String(balance),
            balance_after: String(balance - amount),
            status: 'pending',
          }
        });
        
        await tx.agents.update({
          where: { id: agent.storeId },
          data: { online_balance: { decrement: amount } }
        });
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
  const target = await db.agents.findFirst({
    where: {
      username: recipient,
      store_id: agent.storeId
    },
    select: { id: true }
  });
  if (!target || target.id === agent.storeId) {
    return NextResponse.json({ error: 'Recipient agent not found in your store' }, { status: 404 });
  }
  
  try {
    await db.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<any[]>`
        SELECT online_balance
        FROM agents
        WHERE id = ${agent.storeId}
        FOR UPDATE
      `;
      const balance = Number(rows[0]?.online_balance || 0);
      if (balance < amount) throw new InsufficientBalanceError();
      
      await tx.agent_transactions.create({
        data: {
          agent_id: agent.storeId,
          type: 'transfer',
          amount: String(amount),
          counterparty_agent_id: target.id,
          remark: typeof body.remark === 'string' ? body.remark.slice(0, 100) : null,
          balance_before: String(balance),
          balance_after: String(balance - amount),
          status: 'completed',
        }
      });
      
      await tx.agents.update({
        where: { id: agent.storeId },
        data: { online_balance: { decrement: amount } }
      });
      
      await tx.agents.update({
        where: { id: target.id },
        data: { online_balance: { increment: amount } }
      });
    });
  } catch (err) {
    if (err instanceof InsufficientBalanceError) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }
    throw err;
  }
  return NextResponse.json({ ok: true });
}
