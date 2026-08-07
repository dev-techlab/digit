import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAdminIdFromRequest } from '@/lib/admin-auth';
import { requirePermission, PermissionError } from '@/lib/rbac-core';
import { clientIp, logAdminAction } from '@/lib/audit-log';
import { z } from 'zod';

const actionSchema = z.object({
  id: z.string().min(1, 'id required'),
  action: z.enum(['accept', 'reject'], { message: "Invalid input" }),
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
  // Use agents.read as permission placeholder for now since there is no members.read 
  // explicitly for fiat transactions yet, or we could use users.read
  const { error } = await authorize(req, 'users.read');
  if (error) return error;

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize')) || 20));
  const search = url.searchParams.get('search')?.trim();
  const statusFilter = url.searchParams.get('status');
  const typeFilter = url.searchParams.get('type');

  const where: any = {};
  if (statusFilter) where.status = statusFilter;
  if (typeFilter) where.type = typeFilter;

  if (search) {
    where.OR = [
      { id: { contains: search, mode: 'insensitive' } },
      { users: { username: { contains: search, mode: 'insensitive' } } }
    ];
  }

  const [rows, count] = await Promise.all([
    db.transactions.findMany({
      where,
      select: {
        id: true,
        type: true,
        amount: true,
        method_label: true,
        status: true,
        created_at: true,
        users: { 
          select: { 
            username: true, 
            agent_invite_code: true,
            agent: { select: { username: true } }
          } 
        },
      },
      orderBy: { created_at: 'desc' },
      take: pageSize,
      skip: (page - 1) * pageSize,
    }),
    db.transactions.count({ where }),
  ]);

  const formattedRows = rows.map(r => ({
    id: r.id,
    username: r.users?.username || null,
    agentId: r.users?.agent?.username || r.users?.agent_invite_code || '-',
    type: r.type,
    amount: r.amount,
    methodLabel: r.method_label,
    status: r.status,
    createdAt: r.created_at,
  }));

  return NextResponse.json({ transactions: formattedRows, total: count });
}

export async function POST(req: Request) {
  const { error, adminId } = await authorize(req, 'users.write');
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const parseResult = actionSchema.safeParse(body);

  if (!parseResult.success) {
    return NextResponse.json({ error: parseResult.error.issues[0]?.message || 'Invalid input' }, { status: 400 });
  }

  const { id, action } = parseResult.data;

  try {
    await db.$transaction(async (tx) => {
      const txRow = await tx.transactions.findFirst({
        where: { id, status: 'pending' },
        include: {
          users: {
            include: { wallets: true }
          }
        }
      });

      if (!txRow) {
        throw new Error('Pending transaction not found');
      }

      if (!txRow.users?.wallets) throw new Error('User wallet not found');

      if (action === 'accept') {
        // If deposit, credit balance
        if (txRow.type === 'deposit') {
          await tx.wallets.update({
            where: { user_id: txRow.user_id },
            data: { online_sc: { increment: txRow.amount } }
          });
        }
        // Withdraw was already deducted on creation, so no action needed on wallet

        await tx.transactions.update({
          where: { id },
          data: { status: 'completed' }
        });
      } else {
        // Reject
        // If withdraw, refund balance
        if (txRow.type === 'withdraw') {
          await tx.wallets.update({
            where: { user_id: txRow.user_id },
            data: { online_sc: { increment: txRow.amount } }
          });
        }

        await tx.transactions.update({
          where: { id },
          data: { status: 'failed' }
        });
      }
    });

    await logAdminAction({
      adminId,
      action: `member_transaction.${action}`,
      entityType: 'transactions',
      entityId: id,
      changes: { status: action === 'accept' ? 'completed' : 'failed' },
      ipAddress: clientIp(req),
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message === 'Pending transaction not found' || err.message === 'User wallet not found') {
        return NextResponse.json({ error: err.message }, { status: 404 });
      }
    }
    console.error('POST /api/admin/member-orders', err);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
