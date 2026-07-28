import { NextResponse } from 'next/server';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as s from '@/lib/db/schema';
import { getAgentFromRequest } from '@/lib/agent-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/agent/platforms — platforms explicitly assigned to this agent. */
export async function GET(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const platforms = await db
    .select({
      id: s.gamePlatforms.id,
      name: s.gamePlatforms.name,
      slug: s.gamePlatforms.slug,
      iconUrl: s.gamePlatforms.iconUrl,
      externalId: s.gamePlatforms.externalId,
      providerCode: s.gamePlatforms.providerCode,
      providerType: s.gamePlatforms.providerType,
      launchUrl: s.gamePlatforms.launchUrl,
      sort: s.gamePlatforms.sort,
      isActive: s.gamePlatforms.isActive,
      syncedAt: s.gamePlatforms.syncedAt,
      createdAt: s.gamePlatforms.createdAt,
    })
    .from(s.agentPlatformMappings)
    .innerJoin(s.gamePlatforms, eq(s.gamePlatforms.id, s.agentPlatformMappings.platformId))
    .where(
      and(eq(s.agentPlatformMappings.agentId, agent.id), isNull(s.gamePlatforms.deletedAt))
    )
    .orderBy(asc(s.gamePlatforms.sort), asc(s.gamePlatforms.name));

  return NextResponse.json({ platforms });
}
