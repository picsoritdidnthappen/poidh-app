fetchBountyClaims: baseProcedure
  .input(
    z.object({
      bountyId: z.number(),
      chainId: z.number(),
      limit: z.number().min(1).max(100).default(10),
      cursor: z.number().nullish(),
    })
  )
  .query(async ({ input }) => {
    const items = await prisma.claims.findMany({
      where: {
        bountyId: input.bountyId,
        chainId: input.chainId,
        ban: {
          none: {},
        },
        ...(input.cursor
          ? { isAccepted: false, id: { lt: input.cursor } }
          : {}),
      },
      orderBy: [
        !input.cursor ? { isAccepted: 'desc' } : {},
        { id: 'desc' },
      ],
      take: input.limit,
    });

    let nextCursor: number | undefined = undefined;

    if (items.length === input.limit) {
      nextCursor = items[items.length - 1].id;
    }

    return {
      items,
      nextCursor,
    };
  }),
