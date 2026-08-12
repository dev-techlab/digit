import { NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { db } from '@/lib/db';
import { getAgentFromRequest } from '@/lib/agent-auth';
import { getAdminIdFromRequest } from '@/lib/admin-auth';

const actionSchema = z.object({
  accountId: z.string().uuid(),
  action: z.enum([
    'purchase',
    'redeem',
    'reverse',
    'lock',
    'unlock',
    'pwd',
    'close',
    'hist',
    'logs',
  ]),
});

export async function POST(req: Request) {
  const agent = await getAgentFromRequest(req);
  const adminId = await getAdminIdFromRequest(req);

  if (!agent && !adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const data = actionSchema.parse(body);

    const account = await db.member_platform_accounts.findUnique({
      where: { id: data.accountId },
      include: {
        members: true,
      },
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Agent authorization check: make sure the account belongs to the agent's store
    if (agent && account.members.store_id !== agent.storeId) {
      return NextResponse.json({ error: 'Unauthorized access to this account' }, { status: 403 });
    }

    switch (data.action) {
      case 'purchase':
        // Placeholder for game platform purchase
        // Example: Add funds to game account, deduct from member online_sc
        return NextResponse.json({ success: true, message: 'Purchase initiated' });

      case 'redeem':
        // Placeholder for game platform redeem
        return NextResponse.json({ success: true, message: 'Redeem initiated' });

      case 'reverse':
        // Placeholder for reverse transaction
        return NextResponse.json({ success: true, message: 'Transaction reversed' });

      case 'lock':
      case 'unlock':
        // Placeholder for lock/unlock
        return NextResponse.json({ success: true, message: `Account ${data.action}ed` });

      case 'pwd':
        // Placeholder for password reset
        const newPassword = String(Math.floor(100000 + Math.random() * 900000));
        await db.member_platform_accounts.update({
          where: { id: account.id },
          data: { game_password: newPassword },
        });
        return NextResponse.json({ success: true, message: 'Password reset' });

      case 'close':
        // Placeholder for close account
        return NextResponse.json({ success: true, message: 'Account closed' });

      case 'hist':
      case 'logs':
        return NextResponse.json({ success: true, message: `Showing ${data.action}` });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (err: any) {
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
    console.error(err);
    if (err instanceof ZodError) {
      return NextResponse.json({ error: (err as any).issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
