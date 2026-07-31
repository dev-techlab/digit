import { NextResponse } from 'next/server';
import { and, desc, eq, ilike, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as s from '@/lib/db/schema';
import { getAgentFromRequest } from '@/lib/agent-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/agent/customers?search=&phone=&page=&pageSize= — paginated B2C customer list */
export async function GET(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const url = new URL(req.url);
  const search = url.searchParams.get('search')?.trim();
  const phone = url.searchParams.get('phone')?.trim();
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize')) || 10));

  const where = and(
    eq(s.users.agentId, agent.id),
    search ? ilike(s.users.username, `%${search}%`) : undefined,
    phone ? ilike(s.users.phone, `%${phone}%`) : undefined
  );

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(s.users)
    .where(where);

  const rows = await db
    .select({
      id: s.users.id,
      username: s.users.username,
      nickname: s.users.nickname,
      email: s.users.email,
      phone: s.users.phone,
      emailVerified: s.users.emailVerified,
      phoneVerified: s.users.phoneVerified,
      usedInviteCode: s.users.usedInviteCode,
      createdAt: s.users.createdAt,
      totalDeposit: sql<string>`coalesce((select sum(amount) from ${s.transactions} t where t.user_id = ${s.users.id} and t.type = 'deposit' and t.status = 'completed'), 0)`,
      totalWithdrawal: sql<string>`coalesce((select sum(amount) from ${s.transactions} t where t.user_id = ${s.users.id} and t.type = 'withdraw' and t.status = 'completed'), 0)`,
    })
    .from(s.users)
    .where(where)
    .orderBy(desc(s.users.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return NextResponse.json({
    customers: rows,
    total,
    page,
    pageSize,
  });
}
