import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as s from '@/lib/db/schema';
import { getAgentFromRequest } from '@/lib/agent-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/agent/me — current agent + store basics. */
export async function GET(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [store] = await db
    .select({
      username: s.agents.username,
      inviteCode: s.agents.inviteCode,
      onlineBalance: s.agents.onlineBalance,
      tipsBalance: s.agents.tipsBalance,
      email: s.agents.email,
    })
    .from(s.agents)
    .where(eq(s.agents.id, agent.storeId));

  return NextResponse.json({ ...agent, store });
}
