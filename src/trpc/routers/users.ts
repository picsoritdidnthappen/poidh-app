import prisma from 'prisma/prisma';
import { Prisma } from '@prisma/client';
import { baseProcedure } from '../init';
import { z } from 'zod';

export const usersRouter = {
  fetchByKeyword: baseProcedure
    .input(
      z.object({
        search: z.string().optional().default(''),
        cursor: z.string().optional().default(''),
        limit: z.number().default(25),
      })
    )
    .query(async ({ input }) => {
      const search = `%${input.search}%`;
      const ignoreAddresses = [
        '0x574da84cb149f9424fcf3dd21ebeef1e160cd2bf',
        '0x0e7f38ee61156d57b2b8ab4baa1648b0daa40217',
        '0xbed82560c39c133a3d64516ecda82c71b72f3cd7',
        '0x7c7f6cb2dab9de9b242eeec29d2f61bd7d9750e0',
        '0x10fc964ef70c8467cd8c53e9ed9347422adf96a8',
        '0xb69e851658dd228eca3bd888aa3b011db3e3a5c5',
      ];

      const hasCursor = Boolean(input.cursor && input.cursor.trim().length > 0);
      const [cursorBountyCount, cursorAddress] = hasCursor
        ? (() => {
            const idx = input.cursor.indexOf(':');
            const bc = Number(input.cursor.slice(0, idx));
            const addr = input.cursor.slice(idx + 1);
            return [Number.isFinite(bc) ? bc : null, addr || null] as const;
          })()
        : ([null, null] as const);

      const rows = await prisma.$queryRaw<
        Array<
          Record<string, any> & {
            pfp_url: string | null;
            ens: string | null;
            degen_name: string | null;
            farcaster_tag: string | null;
            bounty_count: number;
          }
        >
      >`
        WITH user_bounties AS (
          SELECT
            pb."user_address" AS user_address,
            pb."bounty_id"    AS id,
            pb."chain_id"     AS chain_id
          FROM "ParticipationsBounties" pb
          JOIN "Bounties" b
            ON b."id"       = pb."bounty_id"
          AND b."chain_id" = pb."chain_id"
          WHERE
            COALESCE(b."is_canceled", FALSE) = FALSE
            AND NOT EXISTS (
              SELECT 1
              FROM "Ban" bn
              WHERE bn."bounty_id" = pb."bounty_id"
                AND bn."chain_id"  = pb."chain_id"
            )
        ),
        counts AS (
          SELECT
            ub.user_address,
            COUNT(*)::int AS bounty_count
          FROM user_bounties ub
          GROUP BY ub.user_address
        ),
        base AS (
          SELECT
            u.*,
            ux."pfp_url",
            ux."ens",
            ux."degen_name",
            ux."farcaster_tag",
            COALESCE(c.bounty_count, 0) AS bounty_count
          FROM "Users" u
          LEFT JOIN counts c
            ON c.user_address = u."address"
          LEFT JOIN "UsersExtra" ux
            ON ux."address" = u."address"
          WHERE
            u."address" NOT IN (${Prisma.join(ignoreAddresses)})
            AND CASE
              WHEN ux."farcaster_tag" IS NOT NULL THEN ux."farcaster_tag" ILIKE ${search}
              WHEN ux."ens"          IS NOT NULL THEN ux."ens"          ILIKE ${search}
              WHEN ux."degen_name"   IS NOT NULL THEN ux."degen_name"   ILIKE ${search}
              ELSE u."address" ILIKE ${search}
            END
        )
        SELECT *
        FROM base
        WHERE
          (
            ${cursorBountyCount}::int IS NULL
            OR ${cursorAddress}::text IS NULL
            OR bounty_count < ${cursorBountyCount}::int
            OR (bounty_count = ${cursorBountyCount}::int AND "address" > ${cursorAddress}::text)
          )
        ORDER BY bounty_count DESC, "address" ASC
        LIMIT ${input.limit}::int;
      `;

      const last = rows.at(-1);
      const nextCursor = last ? `${last.bounty_count}:${last.address}` : null;

      return { items: rows, nextCursor };
    }),
};
