import fs from 'node:fs/promises';
import path from 'node:path';
import type { GameProvider } from './types';

const LIVE_ENDPOINT =
  process.env.PROVIDER_API_BASE_URL ??
  'http://localhost:3200/prod-api/member/game/available-providers';

function cachePath(providerType: 'SC' | 'GC') {
  return path.join(process.cwd(), 'data', `providers.${providerType.toLowerCase()}.json`);
}

/**
 * Cache-through read: serves the committed static JSON snapshot whenever it
 * exists, and only calls the live API the very first time (e.g. a fresh
 * clone with no data/ files yet) — after that it never hits the network.
 */
export async function readCachedProviders(providerType: 'SC' | 'GC'): Promise<GameProvider[]> {
  const file = cachePath(providerType);

  try {
    const raw = await fs.readFile(file, 'utf-8');
    return JSON.parse(raw) as GameProvider[];
  } catch {
    const res = await fetch(`${LIVE_ENDPOINT}?inviteCode=&providerType=${providerType}`, {
      cache: 'no-store',
    });
    const json = await res.json();
    const data: GameProvider[] = json.data ?? [];
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(data, null, 2));
    return data;
  }
}
