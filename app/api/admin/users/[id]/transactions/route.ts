import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAdminIdFromRequest } from '@/lib/admin-auth';
import { requirePermission } from '@/lib/rbac-core';
import { z } from 'zod';
import crypto from 'crypto';
import { clientIp, logAdminAction } from '@/lib/audit-log';

const actionSchema = z.object({
  action: z.enum(['deposit', 'withdraw']),
  amount: z.number().positive(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const adminId = await getAdminIdFromRequest(req);
  if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await requirePermission(adminId, 'users.write');
  } catch (e: any) {
    if (e && (e.digest === 'DYNAMIC_SERVER_USAGE' || e.message?.includes('NEXT_'))) throw e;
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const userId = params.id;

  const body = await req.json().catch(() => ({}));
  const parseResult = actionSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const { action, amount } = parseResult.data;

  try {
    const user = await db.users.findUnique({
      where: { id: userId },
      include: { wallets: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const currentBalance = user.wallets?.online_sc ? Number(user.wallets.online_sc) : 0;

    if (action === 'withdraw' && currentBalance < amount) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    const txId = crypto.randomBytes(16).toString('hex').slice(0, 12).toUpperCase();

    await db.$transaction(async (tx) => {
      // 1. Update User Wallet
      const balanceChange = action === 'deposit' ? amount : -amount;

      await tx.wallets.upsert({
        where: { user_id: userId },
        update: { online_sc: { increment: balanceChange } },
        create: { user_id: userId, online_sc: balanceChange > 0 ? balanceChange : 0, gold_coin: 0 },
      });

      let fee = 0;
      let netAmount = amount;
      let appliedCommissionPer = 0;

      if (action === 'withdraw') {
        appliedCommissionPer = Number(user.commission_per || 0);
        fee = amount * (appliedCommissionPer / 100);
        netAmount = amount - fee;
      }

      // 2. Create Transaction Record
      await tx.transactions.create({
        data: {
          id: txId,
          user_id: userId,
          address: 'Admin Manual',
          method_label: 'Admin',
          method: 'cashapp',
          status: 'completed',
          amount,
          fee,
          commission_per: appliedCommissionPer,
          net_amount: netAmount,
          type: action as any,
          created_at: new Date(),
        },
      });
    });

    await logAdminAction({
      adminId,
      action: `user.transaction.${action}`,
      entityType: 'user',
      entityId: userId,
      changes: { amount, txId },
      ipAddress: clientIp(req),
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
    console.error(`POST /api/admin/users/${userId}/transactions`, err);
    return NextResponse.json({ error: 'Failed to process transaction' }, { status: 500 });
  }
}
