import './load-env';
import { getProviders } from '../lib/data';
import { db } from '../lib/db';
async function main() {
  const p = await getProviders('SC');
  console.log(`getProviders returned ${p.length} rows`);
}
main().finally(() => db.$disconnect());
