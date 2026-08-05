const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const providers = await prisma.game_providers.findMany({
    where: { is_active: true },
    select: { name: true, icon_url: true }
  });
  console.log(providers);
}
main().finally(() => prisma.$disconnect());
