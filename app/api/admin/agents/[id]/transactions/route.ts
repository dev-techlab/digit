import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAdminIdFromRequest } from '@/lib/admin-auth';
import { requirePermission } from '@/lib/rbac-core';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const adminId = await getAdminIdFromRequest(req);
  if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await requirePermission(adminId, 'agents.read');
  } catch (e) {
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
