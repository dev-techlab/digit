import { config } from 'dotenv';
config({ path: '.env' });
async function run() {
  const { db } = await import('./lib/db');
  const result = await db.$queryRawUnsafe(`SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'users';`);
  console.log(result);
  process.exit(0);
}
run();
