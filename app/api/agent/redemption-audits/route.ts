import { NextResponse } from 'next/server';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as s from '@/lib/db/schema';
import { getAgentFromRequest } from '@/lib/agent-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

class InsufficientBalanceError extends Error {}

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
  if (agent.type !== 'store') {
    return NextResponse.json(
      { error: 'Only the store account can review redemptions' },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const id = typeof body.id === 'string' ? body.id : '';
  const decision = body.decision;
  if (!id || (decision !== 'approved' && decision !== 'rejected')) {
    return NextResponse.json({ error: 'id and decision required' }, { status: 400 });
  }

  try {
    await db.transaction(async (tx) => {
      const [audit] = await tx
        .select()
        .from(s.redemptionAudits)
        .where(
          and(
            eq(s.redemptionAudits.id, id),
            eq(s.redemptionAudits.storeId, agent.storeId),
            eq(s.redemptionAudits.status, 'pending')
          )
        )
        .for('update');
      if (!audit) throw new Error('AUDIT_NOT_FOUND');

      await tx
        .update(s.redemptionAudits)
        .set({ status: decision, reviewedByAgentId: agent.id, reviewedAt: new Date() })
        .where(eq(s.redemptionAudits.id, id));

      // Approving settles the redemption for real: score comes off the
      // member's balance and it's booked as a `redeem` transaction — mirrors
      // the same lock-then-debit pattern used for wallet withdraw/transfer.
      if (decision === 'approved' && audit.memberId) {
        const amount = Number(audit.amount);
        const [member] = await tx
          .select({ onlineSc: s.members.onlineSc })
          .from(s.members)
          .where(eq(s.members.id, audit.memberId))
          .for('update');
        if (!member || Number(member.onlineSc) < amount) throw new InsufficientBalanceError();

        await tx
          .update(s.members)
          .set({ onlineSc: sql`${s.members.onlineSc} - ${amount}` })
          .where(eq(s.members.id, audit.memberId));

        await tx.insert(s.memberTransactions).values({
          storeId: agent.storeId,
          memberId: audit.memberId,
          platformId: audit.platformId,
          type: 'redeem',
          amount: String(amount),
          onlineScChange: String(-amount),
          storeBalanceVary: String(-amount),
          outScore: String(amount),
          status: 'completed',
        });
      }
    });
  } catch (err) {
    if (err instanceof InsufficientBalanceError) {
      return NextResponse.json(
        { error: "Member's balance is insufficient to settle this redemption" },
        { status: 400 }
      );
    }
    if (err instanceof Error && err.message === 'AUDIT_NOT_FOUND') {
      return NextResponse.json({ error: 'Redemption not found' }, { status: 404 });
    }
    throw err;
  }
  return NextResponse.json({ ok: true });
}
