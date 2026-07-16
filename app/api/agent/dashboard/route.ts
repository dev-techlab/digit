import { NextResponse } from 'next/server';
import { and, eq, gte, lt, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as s from '@/lib/db/schema';
import { getAgentFromRequest } from '@/lib/agent-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function parseRange(url: URL) {
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const fromDate = from ? new Date(from) : new Date(Date.now() - 4 * 864e5);
  const toDate = to ? new Date(to) : new Date();
  return { fromDate, toDate };
}

/** GET /api/agent/dashboard?from=&to= — KPI totals, daily trend, top games. */
export async function GET(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { fromDate, toDate } = parseRange(new URL(req.url));

  const rangeWhere = and(
    eq(s.memberTransactions.storeId, agent.storeId),
    gte(s.memberTransactions.createdAt, fromDate),
    lt(s.memberTransactions.createdAt, toDate)
  );

  const [totals] = await db
    .select({
      inOnline: sql<string>`coalesce(sum(${s.memberTransactions.inScore}) filter (where ${s.memberTransactions.channel} = 'online'), 0)`,
      inKiosk: sql<string>`coalesce(sum(${s.memberTransactions.inScore}) filter (where ${s.memberTransactions.channel} = 'kiosk'), 0)`,
      outOnline: sql<string>`coalesce(sum(${s.memberTransactions.outScore}) filter (where ${s.memberTransactions.channel} = 'online'), 0)`,
      outKiosk: sql<string>`coalesce(sum(${s.memberTransactions.outScore}) filter (where ${s.memberTransactions.channel} = 'kiosk'), 0)`,
      platformFee: sql<string>`coalesce(sum(${s.memberTransactions.platformFee}), 0)`,
      activeMembers: sql<number>`count(distinct ${s.memberTransactions.memberId})::int`,
    })
    .from(s.memberTransactions)
    .where(rangeWhere);

  const [memberCounts] = await db
    .select({
      total: sql<number>`count(*)::int`,
      today: sql<number>`count(*) filter (where ${s.members.createdAt} >= date_trunc('day', now()))::int`,
    })
    .from(s.members)
    .where(eq(s.members.storeId, agent.storeId));

  const daily = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${s.memberTransactions.createdAt}), 'YYYY-MM-DD')`,
      totalIn: sql<string>`coalesce(sum(${s.memberTransactions.inScore}), 0)`,
      totalOut: sql<string>`coalesce(sum(${s.memberTransactions.outScore}), 0)`,
    })
    .from(s.memberTransactions)
    .where(rangeWhere)
    .groupBy(sql`1`)
    .orderBy(sql`1`);

  const topGames = await db
    .select({
      game: s.gamePlatforms.name,
      totalIn: sql<string>`coalesce(sum(${s.memberTransactions.inScore}), 0)`,
      totalNet: sql<string>`coalesce(sum(${s.memberTransactions.inScore} - ${s.memberTransactions.outScore}), 0)`,
    })
    .from(s.memberTransactions)
    .innerJoin(s.gamePlatforms, eq(s.gamePlatforms.id, s.memberTransactions.platformId))
    .where(rangeWhere)
    .groupBy(s.gamePlatforms.name)
    .orderBy(sql`3 desc`)
    .limit(10);

  const totalIn = Number(totals.inOnline) + Number(totals.inKiosk);
  const totalOut = Number(totals.outOnline) + Number(totals.outKiosk);
  return NextResponse.json({
    totalIn: { total: totalIn, online: Number(totals.inOnline), kiosk: Number(totals.inKiosk) },
    totalOut: {
      total: totalOut,
      online: Number(totals.outOnline),
      kiosk: Number(totals.outKiosk),
    },
    grossNet: totalIn - totalOut,
    platformFee: Number(totals.platformFee),
    totalNet: totalIn - totalOut - Number(totals.platformFee),
    activeMembers: totals.activeMembers,
    totalMembers: memberCounts.total,
    membersToday: memberCounts.today,
    daily,
    topGames,
  });
}
