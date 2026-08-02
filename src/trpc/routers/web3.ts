import prisma from 'prisma/prisma';
import { baseProcedure } from '../init';
import { z } from 'zod';
import { mainnetPublicClient, degenPublicClient } from '@/utils/publicClients';
import { DEGENNAMERESABI, WEINAMESABI, GWEINAMESABI } from '@/constant';

export const web3Router = {
  fetchPrice: baseProcedure
    .input(
      z.object({
        currency: z.enum(['eth', 'degen']),
      })
    )
    .query(async ({ input }) => {
      const rate = await prisma.price.findFirst({
        take: 1,
        orderBy: { id: 'desc' },
      });

      if (!rate) {
        const response = await fetch(
          `https://api.coinbase.com/v2/exchange-rates?currency=${input.currency}`
        );
        const body = await response.json();
        return Number(body.data.rates.USD);
      }

      return input.currency === 'degen'
        ? Number(rate.degenUsd)
        : Number(rate.ethUsd);
    }),

  fetchHumanReadableName: baseProcedure
    .input(
      z.object({
        address: z.string(),
      })
    )
    .query(async ({ input }) => {
      return getHumanReadableName(input.address);
    }),
};

export async function getHumanReadableName(address: string) {
  const tenDays = 10 * 24 * 60 * 60 * 1000;
  const tenDaysAgo = new Date(Date.now() - tenDays);
  const user = await prisma.usersExtra.findFirst({
    where: {
      address: address.toLowerCase(),
    },
  });

  if (!user || !user.gwei || user.lastUpdated < tenDaysAgo) {
    try {
      const gweiName = await mainnetPublicClient.readContract({
        abi: GWEINAMESABI,
        address: '0x9D51D507BC7264d4fE8Ad1cf7Fe191933A0a81d6',
        functionName: 'reverseResolve',
        args: [address as `0x${string}`],
      });

      if (gweiName) {
        await prisma.usersExtra.upsert({
          where: { address: address.toLowerCase() },
          update: { gwei: gweiName, lastUpdated: new Date() },
          create: {
            address: address.toLowerCase(),
            gwei: gweiName,
            lastUpdated: new Date(),
          },
        });

        return gweiName;
      }
    } catch {}
  }

  if (user?.gwei) {
    return user.gwei;
  }

  if (!user || !user.wei || user.lastUpdated < tenDaysAgo) {
    try {
      const weiName = await mainnetPublicClient.readContract({
        abi: WEINAMESABI,
        address: '0x0000000000696760E15f265e828DB644A0c242EB',
        functionName: 'reverseResolve',
        args: [address as `0x${string}`],
      });

      if (weiName) {
        await prisma.usersExtra.upsert({
          where: { address: address.toLowerCase() },
          update: { wei: weiName, lastUpdated: new Date() },
          create: {
            address: address.toLowerCase(),
            wei: weiName,
            lastUpdated: new Date(),
          },
        });

        return weiName;
      }
    } catch {}
  }

  if (user?.wei) {
    return user.wei;
  }

  if (!user || !user.ens || user.lastUpdated < tenDaysAgo) {
    try {
      const ensName = await mainnetPublicClient.getEnsName({
        address: address as `0x${string}`,
      });

      if (ensName) {
        await prisma.usersExtra.upsert({
          where: { address: address.toLowerCase() },
          update: { ens: ensName, lastUpdated: new Date() },
          create: {
            address: address.toLowerCase(),
            ens: ensName,
            lastUpdated: new Date(),
          },
        });

        return ensName;
      }
    } catch {}
  }

  if (user?.ens) {
    return user.ens;
  }

  if (!user || !user.degenName || user.lastUpdated < tenDaysAgo) {
    try {
      const degenName = await degenPublicClient.readContract({
        abi: DEGENNAMERESABI,
        address: '0x4087fb91A1fBdef05761C02714335D232a2Bf3a1',
        functionName: 'defaultNames',
        args: [address as `0x${string}`],
      });

      if (degenName) {
        await prisma.usersExtra.upsert({
          where: { address: address.toLowerCase() },
          update: {
            degenName: `${degenName}.degen`,
            lastUpdated: new Date(),
          },
          create: {
            address: address.toLowerCase(),
            degenName: `${degenName}.degen`,
            lastUpdated: new Date(),
          },
        });

        return `${degenName}.degen`;
      }
    } catch {}
  }

  return user?.degenName ?? null;
}
