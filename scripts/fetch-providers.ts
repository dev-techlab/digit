/**
 * Manual refresh: pnpm fetch:providers
 * Re-pulls the live provider list (admin-managed `provider.api_base_url`
 * setting) and overwrites the committed seed JSON in data/.
 */
import './load-env';
import fs from 'node:fs/promises';
import path from 'node:path';
import { getProviderApiBaseUrl } from '@/lib/provider-api';

const OUT_DIR = path.join(process.cwd(), 'data');

async function fetchType(endpoint: string, providerType: 'SC' | 'GC') {
  const res = await fetch(`${endpoint}?inviteCode=&providerType=${providerType}`);
  if (!res.ok) throw new Error(`Failed to fetch ${providerType}: ${res.status}`);
  const json = (await res.json()) as { data?: unknown[] };
  const outFile = path.join(OUT_DIR, `providers.${providerType.toLowerCase()}.json`);
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(outFile, JSON.stringify(json.data ?? [], null, 2));
  console.log(`Wrote ${outFile} (${json.data?.length ?? 0} providers)`);
}

async function main() {
  const endpoint = await getProviderApiBaseUrl();
  await fetchType(endpoint, 'SC');
  await fetchType(endpoint, 'GC');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
