import { z } from 'zod';
import { baseProcedure } from '../init';
import prisma from 'prisma/prisma';
import { addressSchema } from '../serverTypes';
import { checkIsIssuer } from './admin';

export const bountiesRouter = {
  fetch: baseProcedure
    .input(z.object({ id: z.number(), chainId: z.number() }))
    .query(async ({ input }) => {
      const bounty = await prisma.bounties.findUniqueOrThrow({
        where: {
          id_chainId: {
            ...input,
          },
        },
        include: {
          claims: {
            where: {
              ban: { none: {} },
            },
            select: { id: true },
            take: 1,
          },
          ban: { take: 1 },
          participations: {
            select: { userAddress: true },
            take: 2,
          },
          extra: true,
        },
      });

      const { claims, participations, extra, ...bountyData } = bounty;
      // extra may be null if no bountiesExtra row exists for this bounty
      const { amountSort, ...extraData } = extra ?? { amountSort: 0 };

      return {
        ...bountyData,
        extra: extraData,
        hasClaims: claims.length > 0,
        hasParticipants: participations.length > 1,
        amountSort,
      };
    }),

  fetchTransactions: baseProcedure
    .input(
      z.object({
        bountyId: z.number(),
        chainId: z.number(),
      })
    )
    .query(async ({ input }) => {
      return prisma.transactions.findMany({
        where: {
          bountyId: input.bountyId,
          chainId: input.chainId,
        },
        orderBy: { timestamp: 'desc' },
      });
    }),

  addToAlbum: baseProcedure
    .input(
      z.object({
        bountyId: z.number(),
        chainId: z.number(),
        album: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      return prisma.bountiesExtra.upsert({
        where: {
          bountyId_chainId: {
            bountyId: input.bountyId,
            chainId: input.chainId,
          },
        },
        create: {
          ...input,
          amountSort: 0,
        },
        update: {
          album: input.album,
        },
      });
    }),

  fetchAll: baseProcedure
    .input(
      z.object({
        status: z.enum(['open', 'progress', 'past']),
        sortType: z.enum(['value', 'date']).default('date'),
        limit: z.number().min(1).max(100).default(10),
        cursor: z
          .object({
            createdAt: z.coerce.number(),
            amountSort: z.number(),
            dates: z.array(z.number()),
          })
          .nullish(),
      })
    )
    .query(async ({ input }) => {
      const sortByDate = input.sortType === 'date';
      const sortByValue = input.sortType === 'value';

      let items = undefined;

      if (sortByValue) {
        // FIX: When sorting by value we must also include bounties that have NO
        // row in bountiesExtra (e.g. bounties 213 & 215 on arbitrum). Previously
        // the query only looked in bountiesExtra, which meant bounties without an
        // extra row were silently excluded from the "by value" listing.
        //
        // Strategy: query bounties directly and LEFT JOIN their extra row so that
        // bounties with no extra record still appear, treating their amountSort
        // as 0 (lowest value tier). We use Prisma's `include` with an optional
        // relation and coerce null -> 0 in application code.

        const statusFilter =
          input.status === 'open'
            ? { isVoting: false, inProgress: true, isCanceled: false }
            : input.status === 'progress'
            ? { isVoting: true, inProgress: true, isCanceled: false }
            : input.status === 'past'
            ? { inProgress: false, isCanceled: false }
            : { inProgress: true, isCanceled: false };

        // Fetch bounties directly (not via bountiesExtra) so that bounties
        // without an extra row are still included in the result set.
        const bounties = await prisma.bounties.findMany({
          where: {
            ban: { none: {} },
            ...statusFilter,
            // Cursor-based pagination: only return bounties whose effective
            // amountSort is less than the cursor value OR that have no extra row
            // (amountSort treated as 0). When cursor.amountSort > 0 we can safely
            // exclude rows with extra.amountSort >= cursor; when cursor is null
            // (first page) we return everything.
            ...(input.cursor
              ? {
                  OR: [
                    {
                      extra: {
                        amountSort: { lt: input.cursor.amountSort },
                      },
                    },
                    // Bounties with no extra row have effective amountSort == 0;
                    // include them only when the cursor allows it (cursor.amountSort > 0)
                    ...(input.cursor.amountSort > 0
                      ? [{ extra: null }]
                      : []),
                  ],
                }
              : {}),
          },
          include: {
            extra: true,
            claims: {
              take: 1,
              where: { ban: { none: {} } },
              orderBy: { isAccepted: 'desc' },
            },
            participations: {
              select: { userAddress: true },
              take: 2,
            },
          },
          orderBy: [
            // Bounties without an extra row will sort as if amountSort == 0;
            // Prisma sorts nulls last by default which is acceptable here since
            // missing-extra bounties are treated as lowest value (0).
            { extra: { amountSort: 'desc' } },
            // Secondary sort by createdAt descending for stable ordering when
            // multiple bounties share the same amountSort value.
            { createdAt: 'desc' },
          ],
          take: input.limit + 1,
        });

        // Normalise: attach effective amountSort (0 when extra row is absent)
        const normalisedBounties = bounties.map((b) => ({
          ...b,
          amountSort: b.extra?.amountSort ?? 0,
        }));

        const hasMore = normalisedBounties.length > input.limit;
        const page = hasMore
          ? normalisedBounties.slice(0, input.limit)
          : normalisedBounties;

        const lastItem = page[page.length - 1];
        const nextCursor = hasMore && lastItem
          ? {
              createdAt: lastItem.createdAt instanceof Date
                ? lastItem.createdAt.getTime()
                : Number(lastItem.createdAt),
              amountSort: lastItem.amountSort,
              dates: [],
            }
          : undefined;

        return {
          items: page,
          nextCursor,
        };
      }

      // ---- Sort by date (original logic preserved) ----
      if (sortByDate) {
        const statusFilter =
          input.status === 'open'
            ? { isVoting: false, inProgress: true, isCanceled: false }
            : input.status === 'progress'
            ? { isVoting: true, inProgress: true, isCanceled: false }
            : input.status === 'past'
            ? { inProgress: false, isCanceled: false }
            : { inProgress: true, isCanceled: false };

        const bounties = await prisma.bounties.findMany({
          where: {
            ban: { none: {} },
            ...statusFilter,
            ...(input.cursor
              ? { createdAt: { lt: new Date(input.cursor.createdAt) } }
              : {}),
          },
          include: {
            extra: true,
            claims: {
              take: 1,
              where: { ban: { none: {} } },
              orderBy: { isAccepted: 'desc' },
            },
            participations: {
              select: { userAddress: true },
              take: 2,
            },
          },
          orderBy: { createdAt: 'desc' },
          take: input.limit + 1,
        });

        const hasMore = bounties.length > input.limit;
        const page = hasMore ? bounties.slice(0, input.limit) : bounties;
        const lastItem = page[page.length - 1];
        const nextCursor = hasMore && lastItem
          ? {
              createdAt: lastItem.createdAt instanceof Date
                ? lastItem.createdAt.getTime()
                : Number(lastItem.createdAt),
              amountSort: lastItem.extra?.amountSort ?? 0,
              dates: [],
            }
          : undefined;

        return {
          items: page.map((b) => ({ ...b, amountSort: b.extra?.amountSort ?? 0 })),
          nextCursor,
        };
      }

      return { items: [], nextCursor: undefined };
    }),
};
