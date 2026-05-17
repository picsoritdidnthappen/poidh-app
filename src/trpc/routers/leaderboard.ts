import prisma from 'prisma/prisma';
import { baseProcedure } from '../init';
import { z } from 'zod';
import { addressSchema } from '../serverTypes';
import { scoreDegen, scoreETH } from './accounts';
import { Leaderboard } from 'generated/prisma/client';

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
      ];

      const fetchTop = (
        chainId: number,
        orderCol: 'paid' | 'earned' | 'nfts',
        take = 50
      ) =>
        prisma.leaderboard.findMany({
          where: {
            AND: [{ chainId }, { address: { not: { in: ignoreAddresses } } }],
          },
          orderBy: { [orderCol]: 'desc' },
          take,
        });

      const buildLeaderboard = async (chainId: number) => {
        const [byPaid, byEarned, byNfts] = await Promise.all([
          fetchTop(chainId, 'paid'),
          fetchTop(chainId, 'earned'),
          fetchTop(chainId, 'nfts'),
        ]);

        const uniq = new Map<string, Leaderboard>();
        [...byPaid, ...byEarned, ...byNfts].forEach((row) =>
          uniq.set(row.address.toLowerCase(), row)
        );

        return Array.from(uniq.values());
      };

      const [
        leaderboardBase,
        leaderboardDegen,
        leaderboardArbitrum,
        leaderboardMainnet,
      ] = await Promise.all([
        buildLeaderboard(8453),
        buildLeaderboard(666666666),
        buildLeaderboard(42161),
        buildLeaderboard(1),
      ]);

      const leaderBoard = new Map<
        string,
        {
          degen: number | undefined;
          base: number | undefined;
          arbitrum: number | undefined;
          mainnet: number | undefined;
          total: number;
        }
      >();

      [
        ...leaderboardBase,
        ...leaderboardDegen,
        ...leaderboardArbitrum,
        ...leaderboardMainnet,
      ].forEach((user) => {
        const initialScore = leaderBoard.get(user.address.toLowerCase());

        const chainScores: {
          base: number | undefined;
          degen: number | undefined;
          arbitrum: number | undefined;
          mainnet: number | undefined;
        } = {
          base:
            initialScore?.base ??
            (user.chainId === 8453
              ? scoreETH({
                  earned: user.earned,
                  paid: user.paid,
                  NFTheld: user.nfts,
                })
              : initialScore?.base),
          degen:
            initialScore?.degen ??
            (user.chainId === 666666666
              ? scoreDegen({
                  earned: user.earned,
                  paid: user.paid,
                  NFTheld: user.nfts,
                })
              : initialScore?.degen),
          arbitrum:
            initialScore?.arbitrum ??
            (user.chainId === 42161
              ? scoreETH({
                  earned: user.earned,
                  paid: user.paid,
                  NFTheld: user.nfts,
                })
              : initialScore?.arbitrum),
          mainnet:
            initialScore?.mainnet ??
            (user.chainId === 1
              ? scoreETH({
                  earned: user.earned,
                  paid: user.paid,
                  NFTheld: user.nfts,
                })
              : initialScore?.mainnet),
        };

        const newScore = {
          ...chainScores,
          total:
            (chainScores.base ?? 0) +
            (chainScores.degen ?? 0) +
            (chainScores.arbitrum ?? 0) +
            (chainScores.mainnet ?? 0),
        };

        leaderBoard.set(user.address.toLowerCase(), newScore);
      });

      const allAddresses = Array.from(leaderBoard.keys());
      const [extraPointsRows, extraPointsUsers] = await Promise.all([
        prisma.usersExtra.findMany({
          where: { address: { in: allAddresses } },
          select: { address: true, extraPoints: true },
        }),
        prisma.usersExtra.findMany({
          where: {
            extraPoints: { gt: 0 },
            address: { notIn: allAddresses },
          },
          select: { address: true, extraPoints: true },
        }),
      ]);

      const extraPointsMap = new Map(
        [...extraPointsRows, ...extraPointsUsers].map((r) => [
          r.address.toLowerCase(),
          Number(r.extraPoints),
        ])
      );

      if (extraPointsUsers.length > 0) {
        const missingAddresses = extraPointsUsers.map((r) =>
          r.address.toLowerCase()
        );
        const missingRows = await prisma.leaderboard.findMany({
          where: {
            address: { in: missingAddresses },
            chainId: { in: [8453, 666666666, 42161, 1] },
          },
        });

        missingRows.forEach((user) => {
          const addr = user.address.toLowerCase();
          const existing = leaderBoard.get(addr);
          const base =
            existing?.base ??
            (user.chainId === 8453
              ? scoreETH({
                  earned: user.earned,
                  paid: user.paid,
                  NFTheld: user.nfts,
                })
              : undefined);
          const degen =
            existing?.degen ??
            (user.chainId === 666666666
              ? scoreDegen({
                  earned: user.earned,
                  paid: user.paid,
                  NFTheld: user.nfts,
                })
              : undefined);
          const arbitrum =
            existing?.arbitrum ??
            (user.chainId === 42161
              ? scoreETH({
                  earned: user.earned,
                  paid: user.paid,
                  NFTheld: user.nfts,
                })
              : undefined);
          const mainnet =
            existing?.mainnet ??
            (user.chainId === 1
              ? scoreETH({
                  earned: user.earned,
                  paid: user.paid,
                  NFTheld: user.nfts,
                })
              : undefined);
          leaderBoard.set(addr, {
            base,
            degen,
            arbitrum,
            mainnet,
            total:
              (base ?? 0) + (degen ?? 0) + (arbitrum ?? 0) + (mainnet ?? 0),
          });
        });

        missingAddresses.forEach((addr) => {
          if (!leaderBoard.has(addr)) {
            leaderBoard.set(addr, {
              base: undefined,
              degen: undefined,
              arbitrum: undefined,
              mainnet: undefined,
              total: 0,
            });
          }
        });
      }

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
        const userRows = await prisma.leaderboard.findMany({
          where: {
            address: input.userAddress.toLowerCase(),
            chainId: { in: [8453, 666666666, 42161, 1] },
          },
        });

        if (userRows.length > 0) {
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

          const userExtra = await prisma.usersExtra.findUnique({
            where: { address: input.userAddress.toLowerCase() },
            select: { extraPoints: true },
          });

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
            ([, s]) => s.total > rounded.total
          ).length;
          const rank = higherCount + 1;

          userData = {
            rank,
            data: [input.userAddress, rounded],
          };
        }
      }

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
