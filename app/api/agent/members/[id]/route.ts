import { NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as s from '@/lib/db/schema';
import { getAgentFromRequest } from '@/lib/agent-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/agent/members/:id — detail: login history + platform bindings. */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [member] = await db
    .select()
    .from(s.members)
    .where(and(eq(s.members.id, params.id), eq(s.members.storeId, agent.storeId)));
  if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const logins = await db
    .select({
      ipAddress: s.memberLogins.ipAddress,
      device: s.memberLogins.device,
      createdAt: s.memberLogins.createdAt,
    })
    .from(s.memberLogins)
    .where(eq(s.memberLogins.memberId, member.id))
    .orderBy(desc(s.memberLogins.createdAt))
    .limit(20);

  const bindings = await db
    .select({
      platform: s.gamePlatforms.name,
      gameUsername: s.memberPlatformAccounts.gameUsername,
      createdAt: s.memberPlatformAccounts.createdAt,
    })
    .from(s.memberPlatformAccounts)
    .innerJoin(s.gamePlatforms, eq(s.gamePlatforms.id, s.memberPlatformAccounts.platformId))
    .where(eq(s.memberPlatformAccounts.memberId, member.id));

  const { passwordHash: _omit, ...safe } = member;
  return NextResponse.json({ member: safe, logins, bindings });
}
