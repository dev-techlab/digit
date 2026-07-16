import { NextResponse } from 'next/server';
import { and, desc, eq, gte, ilike, lt, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as s from '@/lib/db/schema';
import { getAgentFromRequest } from '@/lib/agent-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/agent/transactions?search=&type=&from=&to=&page=&pageSize=&report=1
 * List + summary strip; with `report=1` returns daily + per-game breakdowns.
 */
export async function GET(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const url = new URL(req.url);
  const search = url.searchParams.get('search')?.trim();
  const type = url.searchParams.get('type');
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize')) || 20));

  const types = ['recharge', 'redeem', 'bonus', 'transfer'] as const;
  const where = and(
    eq(s.memberTransactions.storeId, agent.storeId),
    from ? gte(s.memberTransactions.createdAt, new Date(from)) : undefined,
    to ? lt(s.memberTransactions.createdAt, new Date(to)) : undefined,
    type && types.includes(type as (typeof types)[number])
      ? eq(s.memberTransactions.type, type as (typeof types)[number])
      : undefined,
    search
      ? sql`${s.memberTransactions.memberId} in (select id from ${s.members} where ${ilike(s.members.username, `%${search}%`)})`
      : undefined
  );

  if (url.searchParams.get('report')) {
    const daily = await db
      .select({
        date: sql<string>`to_char(date_trunc('day', ${s.memberTransactions.createdAt}), 'YYYY-MM-DD')`,
        storeBalanceVary: sql<string>`coalesce(sum(${s.memberTransactions.storeBalanceVary}), 0)`,
        totalIn: sql<string>`coalesce(sum(${s.memberTransactions.inScore}), 0)`,
        totalOut: sql<string>`coalesce(sum(${s.memberTransactions.outScore}), 0)`,
        bonus: sql<string>`coalesce(sum(${s.memberTransactions.bonusScore}), 0)`,
        gameDepositFee: sql<string>`coalesce(sum(${s.memberTransactions.gameDepositFee}), 0)`,
        platformFee: sql<string>`coalesce(sum(${s.memberTransactions.platformFee}), 0)`,
      })
      .from(s.memberTransactions)
      .where(where)
      .groupBy(sql`1`)
      .orderBy(sql`1 desc`);

    const byGame = await db
      .select({
        game: s.gamePlatforms.name,
        storeBalanceVary: sql<string>`coalesce(sum(${s.memberTransactions.storeBalanceVary}), 0)`,
        totalIn: sql<string>`coalesce(sum(${s.memberTransactions.inScore}), 0)`,
        totalOut: sql<string>`coalesce(sum(${s.memberTransactions.outScore}), 0)`,
        bonus: sql<string>`coalesce(sum(${s.memberTransactions.bonusScore}), 0)`,
        gameDepositFee: sql<string>`coalesce(sum(${s.memberTransactions.gameDepositFee}), 0)`,
        platformFee: sql<string>`coalesce(sum(${s.memberTransactions.platformFee}), 0)`,
      })
      .from(s.memberTransactions)
      .innerJoin(s.gamePlatforms, eq(s.gamePlatforms.id, s.memberTransactions.platformId))
      .where(where)
      .groupBy(s.gamePlatforms.name)
      .orderBy(sql`3 desc`);
    return NextResponse.json({ daily, byGame });
  }

  const [summary] = await db
    .select({
      storeBalanceVary: sql<string>`coalesce(sum(${s.memberTransactions.storeBalanceVary}), 0)`,
      totalIn: sql<string>`coalesce(sum(${s.memberTransactions.inScore}), 0)`,
      totalOut: sql<string>`coalesce(sum(${s.memberTransactions.outScore}), 0)`,
      bonus: sql<string>`coalesce(sum(${s.memberTransactions.bonusScore}), 0)`,
      gameDepositFee: sql<string>`coalesce(sum(${s.memberTransactions.gameDepositFee}), 0)`,
      platformFee: sql<string>`coalesce(sum(${s.memberTransactions.platformFee}), 0)`,
      total: sql<number>`count(*)::int`,
    })
    .from(s.memberTransactions)
    .where(where);

  const rows = await db
    .select({
      id: s.memberTransactions.id,
      username: s.members.username,
      game: s.gamePlatforms.name,
      type: s.memberTransactions.type,
      channel: s.memberTransactions.channel,
      amount: s.memberTransactions.amount,
      onlineScChange: s.memberTransactions.onlineScChange,
      storeBalanceVary: s.memberTransactions.storeBalanceVary,
      status: s.memberTransactions.status,
      createdAt: s.memberTransactions.createdAt,
    })
    .from(s.memberTransactions)
    .leftJoin(s.members, eq(s.members.id, s.memberTransactions.memberId))
    .leftJoin(s.gamePlatforms, eq(s.gamePlatforms.id, s.memberTransactions.platformId))
    .where(where)
    .orderBy(desc(s.memberTransactions.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return NextResponse.json({ transactions: rows, summary, page, pageSize });
}
