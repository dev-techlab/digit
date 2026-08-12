import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAgentFromRequest } from '@/lib/agent-auth';
import { Prisma } from '@/lib/generated/prisma/client';
import { z } from 'zod';

const putSchema = z.object({
  id: z.string().min(1, 'id and decision required'),
  decision: z.enum(['approved', 'rejected'], { message: 'Invalid input' }),
});
class InsufficientBalanceError extends Error {}

export async function GET(req: Request) {
  try {
    const agent = await getAgentFromRequest(req);
    if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const status = new URL(req.url).searchParams.get('status');
    const statuses = ['pending', 'approved', 'rejected'] as const;

    const where: any = { store_id: agent.storeId };
    if (status && statuses.includes(status as any)) {
      where.status = status;
    }

    const rows = await db.redemption_audits.findMany({
      where,
      select: {
        id: true,
        members: { select: { username: true } },
        game_platforms: { select: { name: true } },
        amount: true,
        tx_ref: true,
        status: true,
        submitted_at: true,
        reviewed_at: true,
      },
      orderBy: { submitted_at: 'desc' },
      take: 100,
    });
    return NextResponse.json({
      audits: rows.map((r) => ({
        id: r.id,
        player: r.members?.username || null,
        platform: r.game_platforms?.name || null,
        amount: r.amount,
        txRef: r.tx_ref,
        status: r.status,
        submittedAt: r.submitted_at,
        reviewedAt: r.reviewed_at,
      })),
    });
  } catch (err: any) {
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
    console.error('GET /api/agent/redemption-audits', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (agent.type !== 'store') {
    return NextResponse.json(
      { error: 'Only the store account can review redemptions' },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const parseResult = putSchema.safeParse(body);

  if (!parseResult.success) {
    return NextResponse.json(
      { error: parseResult.error.issues[0]?.message || 'Invalid input' },
      { status: 400 }
    );
  }

  const { id, decision } = parseResult.data;

  try {
    await db.$transaction(async (tx) => {
      const audits = await tx.$queryRaw<any[]>`
        SELECT id, member_id, platform_id, amount
        FROM redemption_audits
        WHERE id = ${id} AND store_id = ${agent.storeId} AND status = 'pending'
        FOR UPDATE
      `;
      const audit = audits[0];
      if (!audit) throw new Error('AUDIT_NOT_FOUND');

      await tx.redemption_audits.update({
        where: { id },
        data: {
          status: decision,
          reviewed_by_agent_id: agent.id,
          reviewed_at: new Date(),
        },
      });

      if (decision === 'approved' && audit.member_id) {
        const amount = Number(audit.amount);
        const members = await tx.$queryRaw<any[]>`
          SELECT online_sc
          FROM members
          WHERE id = ${audit.member_id}
          FOR UPDATE
        `;
        const member = members[0];
        if (!member || Number(member.online_sc) < amount) throw new InsufficientBalanceError();

        await tx.members.update({
          where: { id: audit.member_id },
          data: {
            online_sc: { decrement: amount },
          },
        });

        await tx.member_transactions.create({
          data: {
            store_id: agent.storeId,
            member_id: audit.member_id,
            platform_id: audit.platform_id,
            type: 'redeem',
            amount: String(amount),
            online_sc_change: String(-amount),
            store_balance_vary: String(-amount),
            out_score: String(amount),
            status: 'completed',
          },
        });
      }
    });
  } catch (err: any) {
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
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
