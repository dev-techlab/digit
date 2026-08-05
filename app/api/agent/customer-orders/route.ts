import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAgentFromRequest } from '@/lib/agent-auth';

export async function GET(req: Request) {
  const agentCtx = await getAgentFromRequest(req);
  if (!agentCtx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Get the agent's invite code
  const agentRow = await db.agents.findUnique({
    where: { id: agentCtx.id },
    select: { invite_code: true }
  });

  if (!agentRow) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });

  const url = new URL(req.url);
  const search = url.searchParams.get('search')?.trim();
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize')) || 20));

  const where: any = {
    users: {
      agent_invite_code: agentRow.invite_code
    }
  };
  
  if (search) {
    where.users.username = { contains: search, mode: 'insensitive' };
  }

  const [rawRows, totalCount] = await Promise.all([
    db.transactions.findMany({
      where,
      select: {
        id: true,
        type: true,
        amount: true,
        method_label: true,
        status: true,
        created_at: true,
        users: { select: { username: true } },
      },
      orderBy: { created_at: 'desc' },
      take: pageSize,
      skip: (page - 1) * pageSize,
    }),
    db.transactions.count({ where })
  ]);
  
  const rows = rawRows.map(r => ({
    id: r.id,
    username: r.users?.username || null,
    type: r.type,
    amount: r.amount,
    methodLabel: r.method_label,
    status: r.status,
    createdAt: r.created_at,
  }));

  return NextResponse.json({ transactions: rows, total: totalCount, page, pageSize });
}
