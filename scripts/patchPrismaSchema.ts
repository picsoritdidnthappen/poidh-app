import * as fs from 'fs/promises';
import * as path from 'path';
import serverEnv from '@/utils/serverEnv';

const PRISMA_DIR = path.resolve(__dirname, '..', 'prisma');

async function main() {
  const prismaFile = path.resolve(PRISMA_DIR, 'schema.prod.prisma');

  const file = await fs.readFile(prismaFile);

  const patchedFile = file
    .toString('utf-8')
    .replaceAll('{schema}', serverEnv.DATABASE_SCHEMA);

  await fs.writeFile(prismaFile, patchedFile);

  console.log('Prima file patched');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
