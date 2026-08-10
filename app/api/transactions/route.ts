import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/user-auth';
import { z } from 'zod';
import crypto from 'crypto';

const postSchema = z.object({
  type: z.enum(['deposit', 'withdraw']),
  amount: z.number().positive(),
  method: z.string(),
  address: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const parseResult = postSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const { type, amount, method, address } = parseResult.data;

    // Verify wallet exists and balance if withdrawing
    const wallet = await db.wallets.findUnique({ where: { user_id: userId } });
    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    if (type === 'withdraw' && Number(wallet.online_sc) < amount) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    const id = crypto.randomBytes(16).toString('hex').slice(0, 12).toUpperCase();

    // Create a method_label based on the method
    const methodLabelMap: Record<string, string> = {
      cashapp: 'CashApp',
      btc: 'Bitcoin On-Chain',
      lightning: 'Bitcoin Lightning Network',
      pyusd: 'PYUSD',
      ach: 'ACH Bank Transfer',
      card: 'Debit Card',
      chime: 'Chime',
    };
    const methodLabel = methodLabelMap[method] || method;

    await db.$transaction(async (tx) => {
      // If withdraw, deduct balance immediately
      if (type === 'withdraw') {
        await tx.wallets.update({
          where: { user_id: userId },
          data: { online_sc: { decrement: amount } },
        });
      }

      await tx.transactions.create({
        data: {
          id,
          user_id: userId,
          address: address || '',
          method_label: methodLabel,
          method: method as any,
          status: 'pending',
          amount,
          type: type as any,
          created_at: new Date(),
        },
      });
    });

    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (err: any) {
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
    console.error('Error creating transaction:', err);
    return NextResponse.json({ error: 'Failed to process transaction' }, { status: 500 });
  }
}
