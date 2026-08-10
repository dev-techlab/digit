import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAgentFromRequest } from '@/lib/agent-auth';


function parseRange(url: URL) {
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const fromDate = from ? new Date(from) : new Date(Date.now() - 4 * 864e5);
  const toDate = to ? new Date(to) : new Date();
  return { fromDate, toDate };
}

export async function GET(req: Request) {
  try {
    const agent = await getAgentFromRequest(req);
    if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { fromDate, toDate } = parseRange(new URL(req.url));
  
    const [totalsRaw]: any = await db.$queryRawUnsafe(`
      SELECT 
        COALESCE(SUM(in_score) FILTER (WHERE channel = 'online'), 0) AS "inOnline",
        COALESCE(SUM(in_score) FILTER (WHERE channel = 'kiosk'), 0) AS "inKiosk",
        COALESCE(SUM(out_score) FILTER (WHERE channel = 'online'), 0) AS "outOnline",
        COALESCE(SUM(out_score) FILTER (WHERE channel = 'kiosk'), 0) AS "outKiosk",
        COALESCE(SUM(platform_fee), 0) AS "platformFee",
        COUNT(DISTINCT member_id)::int AS "activeMembers"
      FROM member_transactions
      WHERE store_id = $1 AND created_at >= $2 AND created_at < $3
    `, agent.storeId, fromDate, toDate);
  
    const totals = {
      inOnline: totalsRaw?.inOnline?.toString() || '0',
      inKiosk: totalsRaw?.inKiosk?.toString() || '0',
      outOnline: totalsRaw?.outOnline?.toString() || '0',
      outKiosk: totalsRaw?.outKiosk?.toString() || '0',
      platformFee: totalsRaw?.platformFee?.toString() || '0',
      activeMembers: Number(totalsRaw?.activeMembers || 0),
    };
  
    const [memberCountsRaw]: any = await db.$queryRawUnsafe(`
      SELECT 
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE created_at >= date_trunc('day', now()))::int AS today
      FROM members
      WHERE store_id = $1
    `, agent.storeId);
  
    const memberCounts = {
      total: Number(memberCountsRaw?.total || 0),
      today: Number(memberCountsRaw?.today || 0),
    };
  
    const dailyRaw: any[] = await db.$queryRawUnsafe(`
      SELECT 
        TO_CHAR(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
        COALESCE(SUM(in_score), 0) AS "totalIn",
        COALESCE(SUM(out_score), 0) AS "totalOut"
      FROM member_transactions
      WHERE store_id = $1 AND created_at >= $2 AND created_at < $3
      GROUP BY 1
      ORDER BY 1
    `, agent.storeId, fromDate, toDate);
  
    const daily = dailyRaw.map(r => ({
      day: r.day,
      totalIn: r.totalIn?.toString() || '0',
      totalOut: r.totalOut?.toString() || '0',
    }));
  
    const topGamesRaw: any[] = await db.$queryRawUnsafe(`
      SELECT 
        gp.name AS game,
        COALESCE(SUM(mt.in_score), 0) AS "totalIn",
        COALESCE(SUM(mt.in_score - mt.out_score), 0) AS "totalNet"
      FROM member_transactions mt
      INNER JOIN game_platforms gp ON gp.id = mt.platform_id
      WHERE mt.store_id = $1 AND mt.created_at >= $2 AND mt.created_at < $3
      GROUP BY gp.name
      ORDER BY 3 DESC
      LIMIT 10
    `, agent.storeId, fromDate, toDate);
  
    const topGames = topGamesRaw.map(r => ({
      game: r.game,
      totalIn: r.totalIn?.toString() || '0',
      totalNet: r.totalNet?.toString() || '0',
    }));
  
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
  } catch (err: any) {
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
    console.error('GET /api/agent/dashboard', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
