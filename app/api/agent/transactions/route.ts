import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAgentFromRequest } from '@/lib/agent-auth';


export async function GET(req: Request) {
  try {
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
    
    const where: any = { store_id: agent.storeId };
    if (from) where.created_at = { ...where.created_at, gte: new Date(from) };
    if (to) where.created_at = { ...where.created_at, lt: new Date(to) };
    if (type && types.includes(type as any)) where.type = type;
    
    if (search) {
      where.members = { username: { contains: search, mode: 'insensitive' } };
    }
  
    if (url.searchParams.get('report')) {
      // We will build dynamic raw query to group by day and game
      let whereClause = `store_id = $1`;
      let params: any[] = [agent.storeId];
      let pIdx = 2;
      
      if (from) {
        whereClause += ` AND created_at >= $${pIdx++}`;
        params.push(new Date(from));
      }
      if (to) {
        whereClause += ` AND created_at < $${pIdx++}`;
        params.push(new Date(to));
      }
      if (type && types.includes(type as any)) {
        whereClause += ` AND type = $${pIdx++}`;
        params.push(type);
      }
      if (search) {
        whereClause += ` AND member_id IN (SELECT id FROM members WHERE username ILIKE $${pIdx++})`;
        params.push(`%${search}%`);
      }
  
      const dailyRaw = await db.$queryRawUnsafe(`
        SELECT 
          TO_CHAR(date_trunc('day', created_at), 'YYYY-MM-DD') AS date,
          COALESCE(SUM(store_balance_vary), 0) AS "storeBalanceVary",
          COALESCE(SUM(in_score), 0) AS "totalIn",
          COALESCE(SUM(out_score), 0) AS "totalOut",
          COALESCE(SUM(bonus_score), 0) AS "bonus",
          COALESCE(SUM(game_deposit_fee), 0) AS "gameDepositFee",
          COALESCE(SUM(platform_fee), 0) AS "platformFee"
        FROM member_transactions
        WHERE ${whereClause}
        GROUP BY 1
        ORDER BY 1 DESC
      `, ...params);
  
      const byGameRaw = await db.$queryRawUnsafe(`
        SELECT 
          gp.name AS game,
          COALESCE(SUM(mt.store_balance_vary), 0) AS "storeBalanceVary",
          COALESCE(SUM(mt.in_score), 0) AS "totalIn",
          COALESCE(SUM(mt.out_score), 0) AS "totalOut",
          COALESCE(SUM(mt.bonus_score), 0) AS "bonus",
          COALESCE(SUM(mt.game_deposit_fee), 0) AS "gameDepositFee",
          COALESCE(SUM(mt.platform_fee), 0) AS "platformFee"
        FROM member_transactions mt
        INNER JOIN game_platforms gp ON gp.id = mt.platform_id
        WHERE ${whereClause.replace(/member_id/g, 'mt.member_id').replace(/created_at/g, 'mt.created_at').replace(/store_id/g, 'mt.store_id').replace(/type =/g, 'mt.type =')}
        GROUP BY gp.name
        ORDER BY 3 DESC
      `, ...params);
      
      return NextResponse.json({ 
        daily: (dailyRaw as any[]).map(r => ({
          ...r,
          storeBalanceVary: r.storeBalanceVary?.toString(),
          totalIn: r.totalIn?.toString(),
          totalOut: r.totalOut?.toString(),
          bonus: r.bonus?.toString(),
          gameDepositFee: r.gameDepositFee?.toString(),
          platformFee: r.platformFee?.toString(),
        })), 
        byGame: (byGameRaw as any[]).map(r => ({
          ...r,
          storeBalanceVary: r.storeBalanceVary?.toString(),
          totalIn: r.totalIn?.toString(),
          totalOut: r.totalOut?.toString(),
          bonus: r.bonus?.toString(),
          gameDepositFee: r.gameDepositFee?.toString(),
          platformFee: r.platformFee?.toString(),
        })) 
      });
    }
  
    const [rawRows, totalCount] = await Promise.all([
      db.member_transactions.findMany({
        where,
        select: {
          id: true,
          type: true,
          channel: true,
          amount: true,
          online_sc_change: true,
          store_balance_vary: true,
          status: true,
          created_at: true,
          members: { select: { username: true } },
          game_platforms: { select: { name: true } },
        },
        orderBy: { created_at: 'desc' },
        take: pageSize,
        skip: (page - 1) * pageSize,
      }),
      db.member_transactions.count({ where })
    ]);
    
    // Aggregate summary
    let summary = {
      storeBalanceVary: '0',
      totalIn: '0',
      totalOut: '0',
      bonus: '0',
      gameDepositFee: '0',
      platformFee: '0',
      total: totalCount
    };
    
    if (totalCount > 0) {
      const sumResult = await db.member_transactions.aggregate({
        where,
        _sum: {
          store_balance_vary: true,
          in_score: true,
          out_score: true,
          bonus_score: true,
          game_deposit_fee: true,
          platform_fee: true,
        }
      });
      summary = {
        storeBalanceVary: sumResult._sum.store_balance_vary?.toString() || '0',
        totalIn: sumResult._sum.in_score?.toString() || '0',
        totalOut: sumResult._sum.out_score?.toString() || '0',
        bonus: sumResult._sum.bonus_score?.toString() || '0',
        gameDepositFee: sumResult._sum.game_deposit_fee?.toString() || '0',
        platformFee: sumResult._sum.platform_fee?.toString() || '0',
        total: totalCount
      };
    }
  
    const rows = rawRows.map(r => ({
      id: r.id,
      username: r.members?.username || null,
      game: r.game_platforms?.name || null,
      type: r.type,
      channel: r.channel,
      amount: r.amount,
      onlineScChange: r.online_sc_change,
      storeBalanceVary: r.store_balance_vary,
      status: r.status,
      createdAt: r.created_at,
    }));
  
    return NextResponse.json({ transactions: rows, summary, page, pageSize });
  } catch (err: any) {
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
    console.error('GET /api/agent/transactions', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
