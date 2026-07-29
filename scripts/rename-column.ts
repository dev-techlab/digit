import 'dotenv/config';
import { db } from '../lib/db';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    await db.execute(sql`ALTER TABLE agents RENAME COLUMN discount_per TO commission_per;`);
    console.log('Successfully renamed discount_per to commission_per');
  } catch (err) {
    console.error('Error renaming:', err);
  }
  process.exit(0);
}

run();
