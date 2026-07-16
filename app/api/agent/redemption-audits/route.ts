import { NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as s from '@/lib/db/schema';
import { getAgentFromRequest } from '@/lib/agent-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/agent/redemption-audits?status=pending — audit queue. */
export async function GET(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const status = new URL(req.url).searchParams.get('status');
  const statuses = ['pending', 'approved', 'rejected'] as const;

  const rows = await db
    .select({
      id: s.redemptionAudits.id,
      player: s.members.username,
      platform: s.gamePlatforms.name,
      amount: s.redemptionAudits.amount,
      txRef: s.redemptionAudits.txRef,
      status: s.redemptionAudits.status,
      submittedAt: s.redemptionAudits.submittedAt,
      reviewedAt: s.redemptionAudits.reviewedAt,
    })
    .from(s.redemptionAudits)
    .leftJoin(s.members, eq(s.members.id, s.redemptionAudits.memberId))
    .leftJoin(s.gamePlatforms, eq(s.gamePlatforms.id, s.redemptionAudits.platformId))
    .where(
      and(
        eq(s.redemptionAudits.storeId, agent.storeId),
        status && statuses.includes(status as (typeof statuses)[number])
          ? eq(s.redemptionAudits.status, status as (typeof statuses)[number])
          : undefined
      )
    )
    .orderBy(desc(s.redemptionAudits.submittedAt))
    .limit(100);
  return NextResponse.json({ audits: rows });
}

/** PUT /api/agent/redemption-audits — { id, decision: 'approved'|'rejected' }. */
export async function PUT(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const id = typeof body.id === 'string' ? body.id : '';
  const decision = body.decision;
  if (!id || (decision !== 'approved' && decision !== 'rejected')) {
    return NextResponse.json({ error: 'id and decision required' }, { status: 400 });
  }

  await db
    .update(s.redemptionAudits)
    .set({ status: decision, reviewedByAgentId: agent.id, reviewedAt: new Date() })
    .where(
      and(
        eq(s.redemptionAudits.id, id),
        eq(s.redemptionAudits.storeId, agent.storeId),
        eq(s.redemptionAudits.status, 'pending')
      )
    );
  return NextResponse.json({ ok: true });
}
