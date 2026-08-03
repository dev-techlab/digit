import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAgentFromRequest } from '@/lib/agent-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const url = new URL(req.url);
  const search = url.searchParams.get('search')?.trim();
  const phone = url.searchParams.get('phone')?.trim();
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize')) || 10));

  const dbAgent = await db.agents.findUnique({ where: { id: agent.id }, select: { invite_code: true } });
  
  const where: any = { agent_invite_code: dbAgent?.invite_code };

  if (search || phone) {
    where.AND = [];
    if (search) {
      where.AND.push({ username: { contains: search, mode: 'insensitive' } });
    }
    if (phone) {
      where.AND.push({ phone: { contains: phone, mode: 'insensitive' } });
    }
  }

  const [rawRows, total] = await Promise.all([
    db.users.findMany({
      where,
      select: {
        id: true,
        username: true,
        nickname: true,
        email: true,
        phone: true,
        phone_bound: true,
        invite_code: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
      take: pageSize,
      skip: (page - 1) * pageSize,
    }),
    db.users.count({ where }),
  ]);
  
  // We need to fetch aggregate deposits/withdrawals for each user
  const userIds = rawRows.map(u => u.id);
  let totalDeposits: any[] = [];
  let totalWithdrawals: any[] = [];
  
  if (userIds.length > 0) {
    totalDeposits = (await db.transactions.groupBy({
      by: ['user_id'],
      where: {
        user_id: { in: userIds },
        type: 'deposit',
        status: 'completed'
      },
      _sum: { amount: true }
    })) as any;
    
    totalWithdrawals = (await db.transactions.groupBy({
      by: ['user_id'],
      where: {
        user_id: { in: userIds },
        type: 'withdraw',
        status: 'completed'
      },
      _sum: { amount: true }
    })) as any;
  }
  
  const depositMap = new Map(totalDeposits.map(d => [d.user_id, d._sum.amount?.toString() || '0']));
  const withdrawalMap = new Map(totalWithdrawals.map(w => [w.user_id, w._sum.amount?.toString() || '0']));

  const rows = rawRows.map(u => ({
    id: u.id,
    username: u.username,
    nickname: u.nickname,
    email: u.email,
    phone: u.phone,
    emailVerified: false,
    phoneVerified: u.phone_bound,
    usedInviteCode: u.invite_code,
    createdAt: u.created_at,
    totalDeposit: depositMap.get(u.id) || '0',
    totalWithdrawal: withdrawalMap.get(u.id) || '0',
  }));

  return NextResponse.json({
    customers: rows,
    total,
    page,
    pageSize,
  });
}
