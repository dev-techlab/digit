import './load-env';
import { db } from '../lib/db';

async function main() {
  const p1 = 'e5cbe2dc-1c2d-41c5-88c6-9865845e3620';
  const p2 = '2026-07-30 00:00:00';
  const p3 = '2026-08-03 23:59:59';
  const tzSafe = 'America/New_York';
  
  try {
    const logsRaw = await db.$queryRawUnsafe(`
      SELECT 
        t.id,
        t.type,
        t.method,
        t.amount,
        t.fee,
        t.commission_per,
        t.net_amount,
        t.address,
        t.balance_before,
        t.balance_after,
        t.remark,
        c.username AS counterparty,
        t.status,
        t.created_at
      FROM agent_transactions t
      LEFT JOIN agents c ON c.id = t.counterparty_agent_id
      WHERE agent_id = $1::uuid AND created_at AT TIME ZONE '${tzSafe}' >= $2::timestamp AND created_at AT TIME ZONE '${tzSafe}' <= $3::timestamp
      ORDER BY t.created_at DESC
      LIMIT 200
    `, p1, p2, p3);
    console.log('logsRaw success');
  } catch(e) {
    console.error('logsRaw error', e);
  }
}
main().finally(() => db.$disconnect());
