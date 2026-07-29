import { db } from '../lib/db';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    await db.execute(sql`ALTER TABLE "store_settings" ADD COLUMN IF NOT EXISTS "agent_withdraw_commission_per" numeric(5, 2) DEFAULT '0' NOT NULL;`);
    await db.execute(sql`ALTER TABLE "agent_transactions" ADD COLUMN IF NOT EXISTS "commission_per" numeric(5, 2) DEFAULT '0' NOT NULL;`);
    await db.execute(sql`ALTER TABLE "agent_transactions" ADD COLUMN IF NOT EXISTS "net_amount" numeric(14, 2);`);
    console.log('Migration successful.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
