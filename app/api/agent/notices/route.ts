import { NextResponse } from 'next/server';
import { desc, eq, ilike, isNull, or, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as s from '@/lib/db/schema';
import { getAgentFromRequest } from '@/lib/agent-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/agent/notices?search= — platform notices for this store (+ broadcasts). */
export async function GET(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const search = new URL(req.url).searchParams.get('search')?.trim();

  const rows = await db
    .select()
    .from(s.agentNotices)
    .where(
      and(
        or(isNull(s.agentNotices.storeId), eq(s.agentNotices.storeId, agent.storeId)),
        search ? ilike(s.agentNotices.title, `%${search}%`) : undefined
      )
    )
    .orderBy(desc(s.agentNotices.publishedAt))
    .limit(100);
  return NextResponse.json({ notices: rows });
}
