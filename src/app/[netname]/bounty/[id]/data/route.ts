// app/[chain]/bounty/[id]/data/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from 'prisma/prisma';
import type { Netname, ChainId, Currency } from '@/utils/types';

const CHAIN_IDS: Record<Netname, ChainId> = {
  mainnet: 1,
  arbitrum: 42161,
  base: 8453,
  degen: 666666666,
};

const CURRENCIES: Record<Netname, Currency> = {
  mainnet: 'eth',
  arbitrum: 'eth',
  base: 'eth',
  degen: 'degen',
};

export async function GET(
  req: NextRequest,
  { params }: { params: { chain: string; id: string } }
) {
  const slug = params.chain as Netname;
  const chainId = CHAIN_IDS[slug];
  const id = Number(params.id);

  if (!chainId) {
    return NextResponse.json({ error: 'unknown chain' }, { status: 400 });
  }
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: 'invalid bounty id' }, { status: 400 });
  }

  try {
    const bounty = await prisma.bounties.findUniqueOrThrow({
      where: {
        id_chainId: { id, chainId },
      },
      include: {
        claims: {
          where: { ban: { none: {} } },
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
    const { amountSort, ...extraData } = extra;

    return NextResponse.json({
      ...bountyData,
      extra: extraData,
      hasClaims: claims.length > 0,
      hasParticipants: participations.length > 1,
      amountSort,
      currency: CURRENCIES[slug],
    });
  } catch {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
}
