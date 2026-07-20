import { NextResponse } from 'next/server';
import { asc, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as s from '@/lib/db/schema';
import { getAgentFromRequest } from '@/lib/agent-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/agent/platforms — read-only view of the master game-platform
 * catalog for stores configuring their own accounts under Game Setting.
 *
 * The catalog itself (`game_platforms`) is shared across every store tenant,
 * so it is managed exclusively from the admin panel (`/api/admin/platforms`)
 * — a store agent has no business mutating a cross-tenant table. This route
 * used to also expose POST/PUT/DELETE gated only on `agent.type === 'store'`,
 * which let any single store rename/delete platforms every other store had
 * configured; that write capability was removed rather than scoped, since
 * there's no per-tenant ownership of a shared catalog to scope it to.
 */
export async function GET(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const platforms = await db
    .select()
    .from(s.gamePlatforms)
    .where(isNull(s.gamePlatforms.deletedAt))
    .orderBy(asc(s.gamePlatforms.sort), asc(s.gamePlatforms.name));
  return NextResponse.json({ platforms });
}
