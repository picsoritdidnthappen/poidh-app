import { z } from 'zod';
import { baseProcedure } from '../init';
import prisma from 'prisma/prisma';

export const albumsRouter = {
  trending: baseProcedure
    .input(
      z.object({
        limit: z.number().default(10).optional(),
      })
    )
    .query(async ({ input }) => {
      const result = await prisma.$queryRaw<
        Array<{
          album: string;
          count: bigint;
          latest_timestamp: string;
        }>
      >`
      SELECT
        MIN(be.album) as album,
        COUNT(be.album)::bigint as count,
        MAX(b.created_at)::text as latest_timestamp
      FROM "BountiesExtra" be
      INNER JOIN "Bounties" b ON be.bounty_id = b.id AND be.chain_id = b.chain_id
      LEFT JOIN "Ban" ban ON b.id = ban.bounty_id AND b.chain_id = ban.chain_id
      WHERE b.is_canceled = false
        AND ban.id IS NULL
        AND b.in_progress = true
        AND b.is_voting = false
        AND be.album IS NOT NULL
        AND TRIM(be.album) != ''
      GROUP BY LOWER(be.album)
      ORDER BY MAX(b.created_at) DESC
      LIMIT ${input.limit || 10}
    `;

      return result.map((album) => ({
        name: album.album,
        count: Number(album.count),
      }));
    }),

  fetch: baseProcedure
    .input(
      z.object({
        contains: z.string(),
      })
    )
    .query(async ({ input }) => {
      const result = await prisma.$queryRaw<
        Array<{
          album: string;
          _count: bigint;
        }>
      >`
      SELECT
        LOWER(TRIM(album)) as album,
        COUNT(*)::bigint as _count
      FROM "BountiesExtra"
      WHERE TRIM(LOWER(album)) LIKE ${`%${input.contains.toLowerCase()}%`}
        AND album IS NOT NULL
      GROUP BY LOWER(TRIM(album))
      ORDER BY COUNT(*) DESC
    `;

      return result.map((item) => ({
        album: item.album,
        _count: {
          album: Number(item._count),
        },
      }));
    }),
};
