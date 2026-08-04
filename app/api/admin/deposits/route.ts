import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAdminIdFromRequest } from '@/lib/admin-auth';
import { requirePermission, PermissionError } from '@/lib/rbac-core';
import { clientIp, logAdminAction } from '@/lib/audit-log';
import { z } from 'zod';

const actionSchema = z.object({
  id: z.string().min(1, 'id required'),
  action: z.enum(['accept', 'reject'], { message: "Invalid input" }),
  remark: z.string().trim().nullable().optional()
});

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

export async function GET(req: Request) {
  const { error } = await authorize(req, 'agents.read');
  if (error) return error;

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize')) || 20));
  const search = url.searchParams.get('search')?.trim();
  const statusFilter = url.searchParams.get('status') as
    'pending' | 'completed' | 'failed' | 'cancelled' | null;

  const where: any = { type: 'deposit' };
  if (statusFilter) where.status = statusFilter;

  if (search) {
    where.OR = [
      { id: { contains: search, mode: 'insensitive' } },
      { agents_agent_transactions_agent_idToagents: { username: { contains: search, mode: 'insensitive' } } }
    ];
  }

  const [rows, count] = await Promise.all([
    db.agent_transactions.findMany({
      where,
      select: {
        id: true,
        agent_id: true,
        method: true,
        amount: true,
        fee: true,
        net_amount: true,
        address: true,
        balance_before: true,
        balance_after: true,
        remark: true,
        status: true,
        created_at: true,
        agents_agent_transactions_agent_idToagents: {
          select: { username: true }
        }
      },
      orderBy: { created_at: 'desc' },
      take: pageSize,
      skip: (page - 1) * pageSize,
    }),
    db.agent_transactions.count({ where }),
  ]);

  const formattedRows = rows.map(r => ({
    id: r.id,
    agentId: r.agent_id,
    username: r.agents_agent_transactions_agent_idToagents?.username,
    method: r.method,
    amount: r.amount,
    fee: r.fee,
    netAmount: r.net_amount,
    address: r.address,
    balanceBefore: r.balance_before,
    balanceAfter: r.balance_after,
    remark: r.remark,
    status: r.status,
    createdAt: r.created_at,
  }));

  return NextResponse.json({ deposits: formattedRows, total: count });
}

export async function POST(req: Request) {
  const { error, adminId } = await authorize(req, 'agents.write');
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const parseResult = actionSchema.safeParse(body);

  if (!parseResult.success) {
    return NextResponse.json({ error: parseResult.error.issues[0]?.message || 'Invalid input' }, { status: 400 });
  }

  const { id, action, remark } = parseResult.data;

  try {
    await db.$transaction(async (tx) => {
      const txRow = await tx.agent_transactions.findFirst({
        where: { id, type: 'deposit', status: 'pending' }
      });

      if (!txRow) {
        throw new Error('Pending deposit request not found');
      }

      const agentRow = await tx.agents.findUnique({
        where: { id: txRow.agent_id },
        select: { online_balance: true }
      });

      const currentBalance = Number(agentRow?.online_balance || 0);

      if (action === 'accept') {
        const amount = Number(txRow.amount);
        const balanceAfter = currentBalance + amount;

        await tx.agent_transactions.update({
          where: { id },
          data: {
            status: 'completed',
            remark,
            balance_before: String(currentBalance),
            balance_after: String(balanceAfter),
          }
        });

        await tx.agents.update({
          where: { id: txRow.agent_id },
          data: { online_balance: String(balanceAfter) }
        });
      } else {
        await tx.agent_transactions.update({
          where: { id },
          data: {
            status: 'failed',
            remark,
            balance_before: String(currentBalance),
            balance_after: String(currentBalance),
          }
        });
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
