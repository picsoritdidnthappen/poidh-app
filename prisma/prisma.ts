import { PrismaClient } from '@prisma/client';

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
  const prisma = new PrismaClient({
    log: [
      { level: 'query', emit: 'event' },
      { level: 'error', emit: 'stdout' },
      { level: 'warn', emit: 'stdout' },
    ],
  });

  prisma.$on('query', async (e) => {
    if (e.duration < 2_000) return;

    if (prismaDevOptions.logSlowQueries) {
      console.info(`Prisma: slow query - ${e.duration}ms - ${e.query}`);
    }
  });

  return prisma;
}

export default prisma;
