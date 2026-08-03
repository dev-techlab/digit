import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAgentFromRequest } from '@/lib/agent-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await db.posters.findMany({
    orderBy: [
      { category: 'asc' },
      { sort: 'asc' }
    ]
  });
  
  return NextResponse.json({ posters: rows.map(r => ({
    id: r.id,
    title: r.title,
    category: r.category,
    imageUrl: r.image_url,
    sort: r.sort,
    createdAt: r.created_at,
  })) });
}
