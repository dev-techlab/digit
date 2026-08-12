import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAgentFromRequest } from '@/lib/agent-auth';

export async function GET(req: Request) {
  try {
    const agent = await getAgentFromRequest(req);
    if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rows = await db.posters.findMany({
      orderBy: [{ category: 'asc' }, { sort: 'asc' }],
    });

    return NextResponse.json({
      posters: rows.map((r) => ({
        id: r.id,
        title: r.title,
        category: r.category,
        imageUrl: r.image_url,
        sort: r.sort,
        createdAt: r.created_at,
      })),
    });
  } catch (err: any) {
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
    console.error('GET /api/agent/posters', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
