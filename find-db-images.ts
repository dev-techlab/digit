// @ts-nocheck
const { PrismaClient } = require('./lib/generated/prisma');
const prisma = new PrismaClient();
async function main() {
  const platforms = await prisma.game_platforms.findMany({ select: { icon_url: true } });
  const promos = await prisma.promotions.findMany({ select: { image_url: true } });

  const urls = new Set();
  platforms.forEach((p) => p.icon_url && urls.add(p.icon_url));
  promos.forEach((p) => p.image_url && urls.add(p.image_url));

  const fs = require('fs');
  const path = require('path');
  const missing = [];

  for (const url of urls) {
    if (url.startsWith('http')) continue;
    const fullPath = path.join('public', url.replace(/\//g, path.sep));
    if (!fs.existsSync(fullPath)) {
      missing.push(url);
    }
  }

  console.log('Missing DB Images:');
  missing.forEach((m) => console.log(m));
}
main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
