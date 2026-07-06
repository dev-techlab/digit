// Manual refresh: node scripts/fetch-providers.mjs
// Re-pulls the live provider list and overwrites the committed seed JSON in data/.
import fs from 'node:fs/promises';
import path from 'node:path';

const ENDPOINT =
  process.env.PROVIDER_API_BASE_URL ??
  'https://digitlink.mobi/prod-api/member/game/available-providers';
const OUT_DIR = path.join(process.cwd(), 'data');

async function fetchType(providerType) {
  const res = await fetch(`${ENDPOINT}?inviteCode=&providerType=${providerType}`);
  if (!res.ok) throw new Error(`Failed to fetch ${providerType}: ${res.status}`);
  const json = await res.json();
  const outFile = path.join(OUT_DIR, `providers.${providerType.toLowerCase()}.json`);
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(outFile, JSON.stringify(json.data ?? [], null, 2));
  console.log(`Wrote ${outFile} (${json.data?.length ?? 0} providers)`);
}

await fetchType('SC');
await fetchType('GC');
