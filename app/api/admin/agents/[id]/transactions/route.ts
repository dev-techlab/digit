import { NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as s from '@/lib/db/schema';
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
  const type = url.searchParams.get('type');

  let where = eq(s.agentTransactions.agentId, agentId);
  if (type) {
    where = and(where, eq(s.agentTransactions.type, type as any)) as any;
  }

  const logs = await db
    .select({
      id: s.agentTransactions.id,
      type: s.agentTransactions.type,
      method: s.agentTransactions.method,
      amount: s.agentTransactions.amount,
      fee: s.agentTransactions.fee,
      commissionPer: s.agentTransactions.commissionPer,
      netAmount: s.agentTransactions.netAmount,
      balanceBefore: s.agentTransactions.balanceBefore,
      balanceAfter: s.agentTransactions.balanceAfter,
      remark: s.agentTransactions.remark,
      status: s.agentTransactions.status,
      createdAt: s.agentTransactions.createdAt,
    })
    .from(s.agentTransactions)
    .where(where)
    .orderBy(desc(s.agentTransactions.createdAt))
    .limit(100);

  return NextResponse.json({ transactions: logs });
}
