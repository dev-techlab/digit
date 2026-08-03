import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAgentFromRequest } from '@/lib/agent-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const search = new URL(req.url).searchParams.get('search')?.trim();

  const where: any = {
    OR: [
      { store_id: null },
      { store_id: agent.storeId }
    ]
  };

  if (search) {
    where.title = { contains: search, mode: 'insensitive' };
  }

  const rows = await db.agent_notices.findMany({
    where,
    orderBy: { published_at: 'desc' },
    take: 100
  });
  
  return NextResponse.json({ notices: rows.map(r => ({
    id: r.id,
    storeId: r.store_id,
    title: r.title,
    content: r.content,
    publishedAt: r.published_at,
    createdAt: r.published_at,
  })) });
}
