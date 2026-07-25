// app/bounties/data/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from 'prisma/prisma';

export async function GET(req: NextRequest) {
  const limit = Math.min(
    Number(req.nextUrl.searchParams.get('limit')) || 20,
    100
  );
  const cursor = req.nextUrl.searchParams.get('cursor');

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
      ...(cursor ? { createdAt: { lt: Number(cursor) } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  const items = bounties.map(({ claims, participations, extra, ...b }) => ({
    ...b,
    createdAt: b.createdAt.toNumber(),
    hasClaims: claims.length > 0,
    hasParticipants: participations.length > 1,
    amountSort: extra.amountSort,
  }));

  const nextCursor =
    items.length === limit ? items[items.length - 1].createdAt : null;

  return NextResponse.json({ items, nextCursor });
}
