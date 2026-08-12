// @ts-nocheck
import 'dotenv/config';
import { db } from './lib/db';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const platforms = await db.game_platforms.findMany({ select: { icon_url: true } });
  const promos = await db.promotions.findMany({ select: { image_url: true } });
  const kiosks = await db.kiosks.findMany({ select: { avatar_url: true } });

  const urls = new Set<string>();
  platforms.forEach((p) => p.icon_url && urls.add(p.icon_url));
  promos.forEach((p) => p.image_url && urls.add(p.image_url));
  kiosks.forEach((k) => k.avatar_url && urls.add(k.avatar_url));

  const missing = [];

  for (const url of urls) {
    if (url.startsWith('http')) continue;
    const fullPath = path.join('public', url.replace(/\//g, path.sep));
    if (!fs.existsSync(fullPath)) {
      missing.push(url);
    }
  }

  console.log('--- MISSING IMAGES IN DB ---');
  missing.forEach((m) => console.log(m));
  console.log('----------------------------');
}
main()
  .catch(console.error)
  .finally(() => process.exit(0));
