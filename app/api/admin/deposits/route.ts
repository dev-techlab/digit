import { NextResponse } from 'next/server';
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as s from '@/lib/db/schema';
import { getAdminIdFromRequest } from '@/lib/admin-auth';
import { requirePermission, PermissionError } from '@/lib/rbac-core';
import { clientIp, logAdminAction } from '@/lib/audit-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function authorize(
  req: Request,
  permKey: string
): Promise<{ adminId: string; error: undefined } | { adminId: undefined; error: NextResponse }> {
  const adminId = await getAdminIdFromRequest(req);
  if (!adminId)
    return {
      adminId: undefined,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  try {
    await requirePermission(adminId, permKey);
  } catch (e) {
    if (e instanceof PermissionError) {
      return {
        adminId: undefined,
        error: NextResponse.json({ error: e.message }, { status: e.status }),
      };
    }
    throw e;
  }
  return { adminId, error: undefined };
}

/** GET /api/admin/deposits */
export async function GET(req: Request) {
  const { error } = await authorize(req, 'agents.read');
  if (error) return error;

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize')) || 20));
  const search = url.searchParams.get('search')?.trim();
  const statusFilter = url.searchParams.get('status') as
    | 'pending'
    | 'completed'
    | 'failed'
    | 'cancelled'
    | null;

  const where = and(
    eq(s.agentTransactions.type, 'deposit'),
    statusFilter ? eq(s.agentTransactions.status, statusFilter) : undefined,
    search
      ? or(ilike(s.agents.username, `%${search}%`), ilike(s.agentTransactions.id, `%${search}%`))
      : undefined
  );

  const [rows, [{ count }]] = await Promise.all([
    db
      .select({
        id: s.agentTransactions.id,
        agentId: s.agentTransactions.agentId,
        username: s.agents.username,
        method: s.agentTransactions.method,
        amount: s.agentTransactions.amount,
        fee: s.agentTransactions.fee,
        netAmount: s.agentTransactions.netAmount,
        address: s.agentTransactions.address,
        balanceBefore: s.agentTransactions.balanceBefore,
        balanceAfter: s.agentTransactions.balanceAfter,
        remark: s.agentTransactions.remark,
        status: s.agentTransactions.status,
        createdAt: s.agentTransactions.createdAt,
      })
      .from(s.agentTransactions)
      .innerJoin(s.agents, eq(s.agents.id, s.agentTransactions.agentId))
      .where(where)
      .orderBy(desc(s.agentTransactions.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(s.agentTransactions)
      .innerJoin(s.agents, eq(s.agents.id, s.agentTransactions.agentId))
      .where(where),
  ]);

  return NextResponse.json({ deposits: rows, total: count });
}

/** POST /api/admin/deposits — accept or reject a pending deposit */
export async function POST(req: Request) {
  const { error, adminId } = await authorize(req, 'agents.write');
  if (error) return error;

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const id = typeof body.id === 'string' ? body.id : '';
  const action = typeof body.action === 'string' ? body.action : '';
  const remark = typeof body.remark === 'string' ? body.remark.trim() : null;

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  if (action !== 'accept' && action !== 'reject') {
    return NextResponse.json({ error: 'invalid action' }, { status: 400 });
  }

  try {
    await db.transaction(async (tx) => {
      const [txRow] = await tx
        .select()
        .from(s.agentTransactions)
        .where(
          and(
            eq(s.agentTransactions.id, id),
            eq(s.agentTransactions.type, 'deposit'),
            eq(s.agentTransactions.status, 'pending')
          )
        )
        .for('update');

      if (!txRow) {
        throw new Error('Pending deposit request not found');
      }

      // Lock the agent to get their current balance
      const [agentRow] = await tx
        .select({ balance: s.agents.onlineBalance })
        .from(s.agents)
        .where(eq(s.agents.id, txRow.agentId))
        .for('update');
        
      const currentBalance = Number(agentRow.balance);

      if (action === 'accept') {
        const amount = Number(txRow.amount);
        const balanceAfter = currentBalance + amount;
        
        // Accept: change status, record correct balances, and increase agent balance
        await tx
          .update(s.agentTransactions)
          .set({ 
             status: 'completed', 
             remark, 
             balanceBefore: String(currentBalance),
             balanceAfter: String(balanceAfter) 
          })
          .where(eq(s.agentTransactions.id, id));

        await tx
          .update(s.agents)
          .set({ onlineBalance: String(balanceAfter) })
          .where(eq(s.agents.id, txRow.agentId));
      } else {
        // Rejecting: change status, record current balance (no change)
        await tx
          .update(s.agentTransactions)
          .set({ 
             status: 'failed', 
             remark, 
             balanceBefore: String(currentBalance),
             balanceAfter: String(currentBalance) 
          })
          .where(eq(s.agentTransactions.id, id));
      }
    });

    await logAdminAction({
      adminId,
      action: `agent_deposit.${action}`,
      entityType: 'agent_transaction',
      entityId: id,
      changes: { status: action === 'accept' ? 'completed' : 'failed', remark },
      ipAddress: clientIp(req),
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message === 'Pending deposit request not found') {
        return NextResponse.json({ error: err.message }, { status: 404 });
      }
    }
    console.error('POST /api/admin/deposits', err);
    return NextResponse.json({ error: 'Failed to process deposit request' }, { status: 500 });
  }
}
