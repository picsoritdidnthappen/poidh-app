import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from 'generated/prisma/client';

export const prismaDevOptions = {
  logSlowQueries: true,
};

declare global {
  // eslint-disable-next-line no-var
  var cachedPrisma: PrismaClient;
}

let prisma: PrismaClient;
if (process.env.NODE_ENV === 'production') {
  prisma = createPrisma();
} else {
  if (!global.cachedPrisma) {
    global.cachedPrisma = createPrisma();
  }
  prisma = global.cachedPrisma;
}

function createPrisma() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL env var is required');
  }

  const poolMax = 5;
  const idleTimeoutMillis = 10_000;
  const connectionTimeoutMillis = 5_000;

  const adapter = new PrismaPg({
    connectionString: databaseUrl,
    max: poolMax,
    idleTimeoutMillis,
    connectionTimeoutMillis,
  });

  const prisma = new PrismaClient({
    adapter,
    log: [
      { level: 'query', emit: 'event' },
      { level: 'error', emit: 'stdout' },
      { level: 'warn', emit: 'stdout' },
    ],
  });

  prisma.$on('query', async (event: Prisma.QueryEvent) => {
    if (event.duration < 2_000) return;

    if (prismaDevOptions.logSlowQueries) {
      console.info(`Prisma: slow query - ${event.duration}ms - ${event.query}`);
    }
  });

  return prisma;
}

export default prisma;
