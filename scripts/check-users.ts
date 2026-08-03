import './load-env';
import { db } from '../lib/db';
async function main() {
  const u = await db.users.findFirst();
  console.log(Object.keys(u || {}));
}
main().finally(() => process.exit(0));
