import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAgentFromRequest } from '@/lib/agent-auth';

export async function GET(req: Request) {
  try {
    const agent = await getAgentFromRequest(req);
    if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const search = new URL(req.url).searchParams.get('search')?.trim();

    const where: any = {
      OR: [{ store_id: null }, { store_id: agent.storeId }],
    };

    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }

    const rows = await db.agent_notices.findMany({
      where,
      orderBy: { published_at: 'desc' },
      take: 100,
    });

    return NextResponse.json({
      notices: rows.map((r) => ({
        id: r.id,
        storeId: r.store_id,
        title: r.title,
        content: r.content,
        publishedAt: r.published_at,
        createdAt: r.published_at,
      })),
    });
  } catch (err: any) {
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
    console.error('GET /api/agent/notices', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
