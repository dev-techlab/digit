import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAgentFromRequest } from '@/lib/agent-auth';


/** GET /api/agent/me — current agent + store basics. */
export async function GET(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const store = await db.agents.findUnique({
    where: { id: agent.storeId },
    select: {
      username: true,
      invite_code: true,
      online_balance: true,
      tips_balance: true,
      email: true,
    }
  });

  return NextResponse.json({ ...agent, store });
}
