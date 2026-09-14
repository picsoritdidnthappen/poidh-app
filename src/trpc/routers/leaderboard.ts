import prisma from 'prisma/prisma';
import { baseProcedure } from '../init';
import { z } from 'zod';
import { addressSchema } from '../serverTypes';
import { scoreDegen, scoreETH } from './accounts';

export const leaderboardRouter = {
  fetch: baseProcedure
    .input(
      z
        .object({
          userAddress: addressSchema.optional(),
          page: z.number().min(1).default(1),
          limit: z.number().min(1).max(10).default(10),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const page = input?.page ?? 1;
      const limit = input?.limit ?? 10;
      const maxUsers = 100;
      const offset = (page - 1) * limit;

      const ignoreAddresses = [
        '0x574da84cb149f9424fcf3dd21ebeef1e160cd2bf',
        '0x0e7f38ee61156d57b2b8ab4baa1648b0daa40217',
        '0xbed82560c39c133a3d64516ecda82c71b72f3cd7',
        '0x7c7f6cb2dab9de9b242eeec29d2f61bd7d9750e0',
        '0x4200ac338555e25b20c8fe82ac02a5c8d4e5a5b4',
        '0x10fc964ef70c8467cd8c53e9ed9347422adf96a8',
        '0x5555fa783936c260f77385b4e153b9725fef1719',
      ];

      const supportedChainIds = [8453, 666666666, 42161, 1];

      type ScoreBreakdown = {
        degen: number | undefined;
        base: number | undefined;
        arbitrum: number | undefined;
        mainnet: number | undefined;
        total: number;
      };

      /*
       * Fetch complete leaderboard data for every wallet across every
       * supported chain before calculating rankings.
       *
       * Previously this endpoint only fetched the top 50 wallets by paid,
       * earned, and NFTs on each individual chain. That meant a wallet could
       * qualify for the overall leaderboard because of activity on one chain
       * while smaller scores on another chain were omitted entirely.
       */
      const leaderboardRows = await prisma.leaderboard.findMany({
        where: {
          AND: [
            { chainId: { in: supportedChainIds } },
            { address: { not: { in: ignoreAddresses } } },
          ],
        },
      });

      const leaderBoard = new Map<string, ScoreBreakdown>();

      leaderboardRows.forEach((user) => {
        const address = user.address.toLowerCase();

        const existing = leaderBoard.get(address) ?? {
          base: undefined,
          degen: undefined,
          arbitrum: undefined,
          mainnet: undefined,
          total: 0,
        };

        let base = existing.base;
        let degen = existing.degen;
        let arbitrum = existing.arbitrum;
        let mainnet = existing.mainnet;

        if (user.chainId === 8453) {
          base = scoreETH({
            earned: user.earned,
            paid: user.paid,
            NFTheld: user.nfts,
          });
        } else if (user.chainId === 666666666) {
          degen = scoreDegen({
            earned: user.earned,
            paid: user.paid,
            NFTheld: user.nfts,
          });
        } else if (user.chainId === 42161) {
          arbitrum = scoreETH({
            earned: user.earned,
            paid: user.paid,
            NFTheld: user.nfts,
          });
        } else if (user.chainId === 1) {
          mainnet = scoreETH({
            earned: user.earned,
            paid: user.paid,
            NFTheld: user.nfts,
          });
        }

        leaderBoard.set(address, {
          base,
          degen,
          arbitrum,
          mainnet,
          total:
            (base ?? 0) +
            (degen ?? 0) +
            (arbitrum ?? 0) +
            (mainnet ?? 0),
        });
      });

      const allAddresses = Array.from(leaderBoard.keys());

      /*
       * Load extra points for:
       * 1. wallets already present in the leaderboard table
       * 2. wallets that have extra points but no normal leaderboard data
       */
      const [extraPointsRows, extraPointsUsers] = await Promise.all([
        prisma.usersExtra.findMany({
          where: {
            address: { in: allAddresses },
          },
          select: {
            address: true,
            extraPoints: true,
          },
        }),
        prisma.usersExtra.findMany({
          where: {
            extraPoints: { gt: 0 },
            address: {
              notIn: [...allAddresses, ...ignoreAddresses],
            },
          },
          select: {
            address: true,
            extraPoints: true,
          },
        }),
      ]);

      const extraPointsMap = new Map(
        [...extraPointsRows, ...extraPointsUsers].map((row) => [
          row.address.toLowerCase(),
          Number(row.extraPoints),
        ])
      );

      /*
       * A wallet can theoretically have only manually assigned extra points
       * and no rows in the leaderboard table. Add those wallets so they can
       * still qualify for the top 100.
       */
      extraPointsUsers.forEach((user) => {
        const address = user.address.toLowerCase();

        if (!leaderBoard.has(address)) {
          leaderBoard.set(address, {
            base: undefined,
            degen: undefined,
            arbitrum: undefined,
            mainnet: undefined,
            total: 0,
          });
        }
      });

      /*
       * Calculate final totals after all chain scores and extra points have
       * been loaded, then rank globally.
       */
      const sortedLeaderboard = Array.from(leaderBoard.entries())
        .map(
          ([address, scores]) =>
            [
              address,
              {
                base: Math.round(scores.base ?? 0),
                degen: Math.round(scores.degen ?? 0),
                arbitrum: Math.round(scores.arbitrum ?? 0),
                mainnet: Math.round(scores.mainnet ?? 0),
                total: Math.round(
                  (scores.total ?? 0) + (extraPointsMap.get(address) ?? 0)
                ),
              },
            ] as [
              string,
              {
                base: number;
                degen: number;
                arbitrum: number;
                mainnet: number;
                total: number;
              }
            ]
        )
        .sort((a, b) => b[1].total - a[1].total);

      /*
       * If a connected wallet is supplied, calculate its score directly from
       * all of its chain rows so we can show its rank even when it falls
       * outside the visible top 100.
       */
      let userData: {
        rank: number;
        data: [
          string,
          {
            base: number;
            degen: number;
            arbitrum: number;
            mainnet: number;
            total: number;
          }
        ];
      } | null = null;

      if (input?.userAddress) {
        const userAddress = input.userAddress.toLowerCase();

        const userRows = await prisma.leaderboard.findMany({
          where: {
            address: userAddress,
            chainId: { in: supportedChainIds },
          },
        });

        const userExtra = await prisma.usersExtra.findUnique({
          where: {
            address: userAddress,
          },
          select: {
            extraPoints: true,
          },
        });

        /*
         * Preserve the existing behavior for normal leaderboard users,
         * while also allowing an extra-points-only wallet to have userData.
         */
        if (userRows.length > 0 || Number(userExtra?.extraPoints ?? 0) > 0) {
          let baseScore: number | undefined = undefined;
          let degenScore: number | undefined = undefined;
          let arbitrumScore: number | undefined = undefined;
          let mainnetScore: number | undefined = undefined;

          for (const row of userRows) {
            if (row.chainId === 8453) {
              baseScore = scoreETH({
                earned: row.earned,
                paid: row.paid,
                NFTheld: row.nfts,
              });
            } else if (row.chainId === 666666666) {
              degenScore = scoreDegen({
                earned: row.earned,
                paid: row.paid,
                NFTheld: row.nfts,
              });
            } else if (row.chainId === 42161) {
              arbitrumScore = scoreETH({
                earned: row.earned,
                paid: row.paid,
                NFTheld: row.nfts,
              });
            } else if (row.chainId === 1) {
              mainnetScore = scoreETH({
                earned: row.earned,
                paid: row.paid,
                NFTheld: row.nfts,
              });
            }
          }

          const totalScore =
            (baseScore ?? 0) +
            (degenScore ?? 0) +
            (arbitrumScore ?? 0) +
            (mainnetScore ?? 0) +
            Number(userExtra?.extraPoints ?? 0);

          const rounded = {
            base: Math.round(baseScore ?? 0),
            degen: Math.round(degenScore ?? 0),
            arbitrum: Math.round(arbitrumScore ?? 0),
            mainnet: Math.round(mainnetScore ?? 0),
            total: Math.round(totalScore),
          };

          const higherCount = sortedLeaderboard.filter(
            ([, scores]) => scores.total > rounded.total
          ).length;

          const rank = higherCount + 1;

          userData = {
            rank,
            data: [input.userAddress, rounded],
          };
        }
      }

      /*
       * The public leaderboard still contains at most 100 wallets.
       * Pagination remains 10 per page by default, so /leaderboard can
       * continue loading pages 1 through 10 exactly as before.
       */
      const limitedLeaderboard = sortedLeaderboard.slice(0, maxUsers);

      const paginatedLeaderboard = limitedLeaderboard.slice(
        offset,
        offset + limit
      );

      const totalUsers = Math.min(sortedLeaderboard.length, maxUsers);
      const totalPages = Math.ceil(totalUsers / limit);

      return {
        leaderboard: paginatedLeaderboard,
        userData,
        pagination: {
          currentPage: page,
          totalPages,
          totalUsers,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };
    }),
};
