import { NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as s from '@/lib/db/schema';
import { getAgentFromRequest } from '@/lib/agent-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const customerId = params.id;

  const customer = await db.query.users.findFirst({
    where: (t, { eq, and }) => and(eq(t.id, customerId), eq(t.agentId, agent.id)),
  });

  if (!customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  // Fetch recent logins (sessions)
  const logins = await db
    .select({
      ipAddress: s.sessions.token, // just using token as a placeholder since there is no ipAddress field in sessions
      userAgent: s.sessions.userAgent,
      createdAt: s.sessions.createdAt,
    })
    .from(s.sessions)
    .where(eq(s.sessions.userId, customer.id))
    .orderBy(desc(s.sessions.createdAt))
    .limit(10);

  // Fetch transactions
  const transactions = await db
    .select({
      type: s.transactions.type,
      amount: s.transactions.amount,
      createdAt: s.transactions.createdAt,
    })
    .from(s.transactions)
    .where(eq(s.transactions.userId, customer.id))
    .orderBy(desc(s.transactions.createdAt))
    .limit(20);

  // Fetch game activity (provider accounts)
  const gameActivity = await db
    .select({
      providerName: s.gameProviders.name,
      balance: s.userProviderAccounts.balance,
    })
    .from(s.userProviderAccounts)
    .innerJoin(s.gameProviders, eq(s.gameProviders.id, s.userProviderAccounts.providerId))
    .where(eq(s.userProviderAccounts.userId, customer.id));

  return NextResponse.json({
    customer: {
      id: customer.id,
      username: customer.username,
      nickname: customer.nickname,
      email: customer.email,
      phone: customer.phone,
      emailVerified: customer.emailVerified,
      phoneVerified: customer.phoneVerified,
      usedInviteCode: customer.usedInviteCode,
      createdAt: customer.createdAt,
    },
    logins,
    transactions,
    gameActivity,
  });
}
