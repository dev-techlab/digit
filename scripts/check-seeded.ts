import './load-env';
import { db } from '../lib/db';
async function main() {
  const users = await db.users.findMany({ where: { agent_invite_code: 'MC223717111J000I' } });
  // console.log('Users count:', users.length);
}
main().finally(() => process.exit(0));
