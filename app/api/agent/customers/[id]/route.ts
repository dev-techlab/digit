import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAgentFromRequest } from '@/lib/agent-auth';


export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const agent = await getAgentFromRequest(req);
    if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
    const customerId = params.id;
  
    const customer = await db.users.findFirst({
      where: {
        id: customerId,
      }
    });
  
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }
  
    const rawLogins = await db.sessions.findMany({
      where: { user_id: customer.id },
      select: {
        token: true,
        user_agent: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
      take: 10
    });
  
    const logins = rawLogins.map(login => ({
      ipAddress: login.token, // just using token as a placeholder since there is no ipAddress field in sessions
      userAgent: login.user_agent,
      createdAt: login.created_at,
    }));
  
    const rawTransactions = await db.transactions.findMany({
      where: { user_id: customer.id },
      select: {
        type: true,
        amount: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
      take: 20
    });
  
    const transactions = rawTransactions.map(tx => ({
      type: tx.type,
      amount: tx.amount,
      createdAt: tx.created_at,
    }));
  
    const rawGameActivity = await db.user_provider_accounts.findMany({
      where: { user_id: customer.id },
      select: {
        balance: true,
        game_providers: {
          select: {
            name: true,
          }
        }
      }
    });
  
    const gameActivity = rawGameActivity.map(activity => ({
      providerName: activity.game_providers.name,
      balance: activity.balance,
    }));
  
    return NextResponse.json({
      customer: {
        id: customer.id,
        username: customer.username,
        nickname: customer.nickname,
        email: customer.email,
        phone: customer.phone,
        emailVerified: false,
        phoneVerified: customer.phone_bound,
        usedInviteCode: customer.invite_code,
        createdAt: customer.created_at,
      },
      logins,
      transactions,
      gameActivity,
    });
  } catch (err: any) {
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
    console.error('GET /api/agent/customers/[id]', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
