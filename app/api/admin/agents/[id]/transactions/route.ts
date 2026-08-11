import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAdminIdFromRequest } from '@/lib/admin-auth';
import { requirePermission } from '@/lib/rbac-core';
import { z } from 'zod';
import { clientIp, logAdminAction } from '@/lib/audit-log';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const adminId = await getAdminIdFromRequest(req);
  if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await requirePermission(adminId, 'agents.read');
  } catch (e: any) {
    if (e && (e.digest === 'DYNAMIC_SERVER_USAGE' || e.message?.includes('NEXT_'))) throw e;
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const agentId = params.id;
  const url = new URL(req.url);
  const type = url.searchParams.get('type') as any;

  const where: any = { agent_id: agentId };
  if (type) {
    where.type = type;
  }

  const logs = await db.agent_transactions.findMany({
    where,
    select: {
      id: true,
      type: true,
      method: true,
      amount: true,
      fee: true,
      commission_per: true,
      net_amount: true,
      balance_before: true,
      balance_after: true,
      remark: true,
      status: true,
      created_at: true,
    },
    orderBy: { created_at: 'desc' },
    take: 100,
  });

  const formattedLogs = logs.map(l => ({
    id: l.id,
    type: l.type,
    method: l.method,
    amount: l.amount,
    fee: l.fee,
    commissionPer: l.commission_per,
    netAmount: l.net_amount,
    balanceBefore: l.balance_before,
    balanceAfter: l.balance_after,
    remark: l.remark,
    status: l.status,
    createdAt: l.created_at,
  }));

  return NextResponse.json({ transactions: formattedLogs });
}

const actionSchema = z.object({
  action: z.enum(['deposit', 'withdraw']),
  amount: z.number().positive(),
  remark: z.string().optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const adminId = await getAdminIdFromRequest(req);
  if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await requirePermission(adminId, 'agents.write');
  } catch (e: any) {
    if (e && (e.digest === 'DYNAMIC_SERVER_USAGE' || e.message?.includes('NEXT_'))) throw e;
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const agentId = params.id;
  
  const body = await req.json().catch(() => ({}));
  const parseResult = actionSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const { action, amount, remark } = parseResult.data;

  try {
    const agent = await db.agents.findUnique({
      where: { id: agentId }
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const currentBalance = Number(agent.online_balance || 0);

    if (action === 'withdraw' && currentBalance < amount) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    await db.$transaction(async (tx) => {
      const balanceChange = action === 'deposit' ? amount : -amount;
      const balanceAfter = currentBalance + balanceChange;
      
      await tx.agents.update({
        where: { id: agentId },
        data: { online_balance: { increment: balanceChange } },
      });

      let fee = 0;
      let netAmount = amount;
      let appliedCommissionPer = 0;

      if (action === 'withdraw') {
        appliedCommissionPer = Number(agent.commission_per || 0);
        fee = amount * (appliedCommissionPer / 100);
        netAmount = amount - fee;
      }

      await tx.agent_transactions.create({
        data: {
          agent_id: agentId,
          type: action as any,
          method: 'admin' as any,
          amount,
          fee,
          commission_per: appliedCommissionPer,
          net_amount: netAmount,
          balance_before: currentBalance,
          balance_after: balanceAfter,
          status: 'completed',
          remark: remark || 'Admin manual adjustment',
          created_at: new Date(),
        }
      });
    });

    await logAdminAction({
      adminId,
      action: `agent.transaction.${action}`,
      entityType: 'agent',
      entityId: agentId,
      changes: { amount, remark },
      ipAddress: clientIp(req),
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
    console.error(`POST /api/admin/agents/${agentId}/transactions`, err);
    return NextResponse.json({ error: 'Failed to process transaction' }, { status: 500 });
  }
}
