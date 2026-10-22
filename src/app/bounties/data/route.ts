import { NextRequest, NextResponse } from 'next/server';
import prisma from 'prisma/prisma';

const CHAIN_SLUGS: Record<number, string> = {
  1: 'mainnet',
  42161: 'arbitrum',
  8453: 'base',
  666666666: 'degen',
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=30, stale-while-revalidate=300',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(req: NextRequest) {
  const rawLimit = req.nextUrl.searchParams.get('limit');
  let limit = 20;
  if (rawLimit !== null) {
    limit = Number(rawLimit);
    if (
      rawLimit === '' ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100
    ) {
      return NextResponse.json(
        { error: 'limit must be an integer between 1 and 100' },
        { status: 400, headers: CORS_HEADERS }
      );
    }
  }

  const rawCursor = req.nextUrl.searchParams.get('cursor');
  let cursor: number | undefined;
  if (rawCursor !== null) {
    cursor = Number(rawCursor);
    if (rawCursor === '' || !Number.isInteger(cursor) || cursor < 0) {
      return NextResponse.json(
        { error: 'invalid cursor' },
        { status: 400, headers: CORS_HEADERS }
      );
    }
  }

  const bounties = await prisma.bounties.findMany({
    include: {
      claims: {
        take: 1,
        where: { ban: { none: {} } },
      },
      participations: {
        select: { userAddress: true },
        take: 2,
      },
      extra: { select: { amountSort: true } },
    },
    where: {
      inProgress: true,
      isCanceled: false,
      isVoting: false,
      ban: { none: {} },
      ...(cursor !== undefined ? { createdAt: { lt: cursor } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  const items = bounties.map(({ claims, participations, extra, ...b }) => ({
    ...b,
    createdAt: b.createdAt.toNumber(),
    hasClaims: claims.length > 0,
    hasParticipants: participations.length > 1,
    priceUsd: extra.amountSort,
    url: `https://poidh.xyz/${CHAIN_SLUGS[b.chainId]}/bounty/${b.id}`,
  }));

  const nextCursor =
    items.length === limit ? items[items.length - 1].createdAt : null;

  return NextResponse.json(
    { items, nextCursor },
    { headers: { ...CORS_HEADERS, ...CACHE_HEADERS } }
  );
}
