// import-albums.ts
import fs from 'node:fs';
import { parse } from 'csv-parse';
import * as dotenv from 'dotenv';
import z from 'zod';
import prisma from 'prisma/prisma';

dotenv.config();

const CHAIN_ID_MAP: Record<string, number> = {
  base: 8453,
  degen: 666666666,
  arbitrum: 42161,
};

const RowSchema = z.object({
  'bounty url': z.string().url(),
  album: z.string().min(1).trim(),
});

type Row = z.infer<typeof RowSchema>;

function parseBountyUrl(url: string): { chain: string; bountyId: number } {
  const m = url.match(/https?:\/\/[^/]+\/([^/]+)\/bounty\/(\d+)/i);
  if (!m) throw new Error(`Unrecognized bounty URL: ${url}`);
  const chain = m[1].toLowerCase();
  const bountyId = Number(m[2]);
  if (!Number.isFinite(bountyId)) throw new Error(`Invalid bounty id: ${url}`);
  return { chain, bountyId };
}

async function run(csvPath: string) {
  const updates: Promise<number>[] = [];
  let ok = 0,
    skip = 0;

  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(parse({ columns: true, trim: true }))
      .on('data', (raw) => {
        const row = RowSchema.safeParse(raw);
        if (!row.data) {
          skip++;
          return;
        }
        const { chain, bountyId } = parseBountyUrl(row.data['bounty url']);
        const chainId = CHAIN_ID_MAP[chain];
        if (!chainId) {
          skip++;
          console.warn(
            `Skip: unknown chain "${chain}" for ${row.data['bounty url']}`
          );
          return;
        }

        updates.push(
          prisma.bountiesExtra
            .upsert({
              where: {
                bounty_id_chain_id: {
                  bounty_id: bountyId,
                  chain_id: chainId,
                },
              },
              update: { album: row.data.album },
              create: {
                bounty_id: bountyId,
                chain_id: chainId,
                album: row.data.album,
              },
            })
            .then(() => ok++)
        );
      })
      .on('error', reject)
      .on('end', resolve);
  });

  await Promise.all(updates);

  console.log(`Done. Upserted: ${ok}, Skipped: ${skip}`);
}

const csvPath = process.argv[2];

if (!csvPath) {
  console.error('Usage: ts-node import-albums.ts <path-to-csv>');
  process.exit(1);
}
run(csvPath).catch((e) => {
  console.error(e);
  process.exit(1);
});
