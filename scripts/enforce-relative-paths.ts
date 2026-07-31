import 'dotenv/config';
import { db } from '../lib/db';
import * as s from '../lib/db/schema';
import { notLike, like } from 'drizzle-orm';

async function run() {
  const providers = await db.select().from(s.gameProviders);
  for (const p of providers) {
    if (p.iconUrl && (p.iconUrl.startsWith('http://') || p.iconUrl.startsWith('https://'))) {
      try {
        const urlObj = new URL(p.iconUrl);
        let pathname = urlObj.pathname;
        if (!pathname.startsWith('/')) pathname = '/' + pathname;
        await db.update(s.gameProviders).set({ iconUrl: pathname }).where({ id: p.id });
        console.log(`Updated gameProviders ${p.name}: ${pathname}`);
      } catch (e) {
        // ignore invalid URL
      }
    }
  }

  const platforms = await db.select().from(s.gamePlatforms);
  for (const p of platforms) {
    if (p.iconUrl && (p.iconUrl.startsWith('http://') || p.iconUrl.startsWith('https://'))) {
      try {
        const urlObj = new URL(p.iconUrl);
        let pathname = urlObj.pathname;
        if (!pathname.startsWith('/')) pathname = '/' + pathname;
        await db.update(s.gamePlatforms).set({ iconUrl: pathname }).where({ id: p.id });
        console.log(`Updated gamePlatforms ${p.name}: ${pathname}`);
      } catch (e) {}
    }
  }

  const posters = await db.select().from(s.posters);
  for (const p of posters) {
    if (p.imageUrl && (p.imageUrl.startsWith('http://') || p.imageUrl.startsWith('https://'))) {
      try {
        const urlObj = new URL(p.imageUrl);
        let pathname = urlObj.pathname;
        if (!pathname.startsWith('/')) pathname = '/' + pathname;
        await db.update(s.posters).set({ imageUrl: pathname }).where({ id: p.id });
        console.log(`Updated posters ${p.id}: ${pathname}`);
      } catch (e) {}
    }
  }

  const banners = await db.select().from(s.banners);
  for (const b of banners) {
    if (b.imageUrl && (b.imageUrl.startsWith('http://') || b.imageUrl.startsWith('https://'))) {
      try {
        const urlObj = new URL(b.imageUrl);
        let pathname = urlObj.pathname;
        if (!pathname.startsWith('/')) pathname = '/' + pathname;
        await db.update(s.banners).set({ imageUrl: pathname }).where({ id: b.id });
        console.log(`Updated banners ${b.id}: ${pathname}`);
      } catch (e) {}
    }
  }
  
  console.log('Finished updating DB to relative paths.');
  process.exit(0);
}

run().catch(console.error);
