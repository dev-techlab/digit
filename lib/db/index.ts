import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '@/lib/env';

const connectionString = env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const globalForDb = globalThis as unknown as { prisma?: PrismaClient };

let prisma: PrismaClient;

if (env.NODE_ENV === 'production') {
  const adapter = new PrismaPg({ connectionString });
  prisma = new PrismaClient({ adapter });
} else {
  if (!globalForDb.prisma) {
    const adapter = new PrismaPg({ connectionString });
    globalForDb.prisma = new PrismaClient({ adapter });
  }
  prisma = globalForDb.prisma;
}

export const db = prisma;
export type Database = typeof prisma;
