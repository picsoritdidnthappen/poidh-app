import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import prisma from 'prisma/prisma';
import { authedProcedure, baseProcedure } from '../init';
import { CID_PATTERN, getVerifiedDraft } from '@/utils/draftAuthenticity';

const cidSchema = z.string().regex(CID_PATTERN);
const VOTE_BATCH_LIMIT = 200;
const FIVE_MINUTES = 5 * 60 * 1000;

async function requireRealDraft(cid: string) {
  try {
    const draft = await getVerifiedDraft(cid, null);
    if (!draft) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'draft not found' });
    }
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({
      code: 'SERVICE_UNAVAILABLE',
      message: 'draft verification is temporarily unavailable',
    });
  }
}

export const ideasRouter = {
  summaries: baseProcedure
    .input(z.object({
      cids: z.array(cidSchema).max(VOTE_BATCH_LIMIT),
      viewer: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const cids = [...new Set(input.cids)];
      if (!cids.length) return [];

      const session = await ctx.getSession();
      const address =
        session &&
        input.viewer?.toLowerCase() === session.address.toLowerCase()
          ? session.address.toLowerCase()
          : undefined;

      const [votes, comments] = await Promise.all([
        prisma.ideaVotes.findMany({
          where: { cid: { in: cids } },
          select: { cid: true, address: true, value: true },
        }),
        prisma.ideaComments.groupBy({
          by: ['cid'],
          where: { cid: { in: cids }, deletedAt: null },
          _count: { _all: true },
        }),
      ]);

      const stats = new Map(
        cids.map((cid) => [
          cid,
          {
            cid,
            upvotes: 0,
            downvotes: 0,
            score: 0,
            commentCount: 0,
            myVote: 0 as -1 | 0 | 1,
          },
        ])
      );

      for (const vote of votes) {
        const item = stats.get(vote.cid);
        if (!item) continue;

        if (vote.value === 1) item.upvotes++;
        if (vote.value === -1) item.downvotes++;

        if (address && vote.address.toLowerCase() === address) {
          item.myVote =
            vote.value === 1 ? 1 : vote.value === -1 ? -1 : 0;
        }
      }

      for (const count of comments) {
        const item = stats.get(count.cid);
        if (item) item.commentCount = count._count._all;
      }

      return [...stats.values()].map((item) => ({
        ...item,
        score: item.upvotes - item.downvotes,
      }));
    }),

  vote: authedProcedure
    .input(
      z.object({
        cid: cidSchema,
        value: z.union([
          z.literal(-1),
          z.literal(0),
          z.literal(1),
        ]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireRealDraft(input.cid);

      const address = ctx.session.address.toLowerCase();
      const where = {
        cid_address: { cid: input.cid, address },
      };

      if (input.value === 0) {
        await prisma.ideaVotes.deleteMany({
          where: { cid: input.cid, address },
        });
      } else {
        await prisma.ideaVotes.upsert({
          where,
          create: {
            cid: input.cid,
            address,
            value: input.value,
          },
          update: { value: input.value },
        });
      }

      return { ok: true };
    }),

  comments: baseProcedure
    .input(z.object({ cid: cidSchema }))
    .query(async ({ input }) => {
      return prisma.ideaComments.findMany({
        where: { cid: input.cid },
        select: {
          id: true,
          cid: true,
          userAddress: true,
          parentId: true,
          body: true,
          createdAt: true,
          deletedAt: true,
        },
        orderBy: { createdAt: 'asc' },
        take: 200,
      });
    }),

  comment: authedProcedure
    .input(
      z.object({
        cid: cidSchema,
        text: z.string().trim().min(1).max(5000),
        parentId: z.number().int().positive().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireRealDraft(input.cid);

      const address = ctx.session.address.toLowerCase();
      const since = new Date(Date.now() - FIVE_MINUTES);

      const [globalCount, ideaCount] = await Promise.all([
        prisma.ideaComments.count({
          where: {
            userAddress: address,
            createdAt: { gte: since },
          },
        }),
        prisma.ideaComments.count({
          where: {
            userAddress: address,
            cid: input.cid,
            createdAt: { gte: since },
          },
        }),
      ]);

      if (globalCount >= 20 || ideaCount >= 3) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: 'too many comments. try again in a few minutes.',
        });
      }

      if (input.parentId) {
        const parent = await prisma.ideaComments.findFirst({
          where: {
            id: input.parentId,
            cid: input.cid,
            deletedAt: null,
          },
          select: { id: true },
        });

        if (!parent) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'reply target not found on this idea',
          });
        }
      }

      return prisma.ideaComments.create({
        data: {
          cid: input.cid,
          userAddress: address,
          parentId: input.parentId,
          body: input.text.trim(),
        },
        select: { id: true },
      });
    }),

  deleteComment: authedProcedure
    .input(
      z.object({
        cid: cidSchema,
        id: z.number().int().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const address = ctx.session.address.toLowerCase();

      const comment = await prisma.ideaComments.findFirst({
        where: {
          cid: input.cid,
          id: input.id,
          deletedAt: null,
        },
        select: {
          id: true,
          userAddress: true,
        },
      });

      if (!comment) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      const isAdmin = (process.env.ADMINS ?? '')
        .split(',')
        .map((a) => a.trim().toLowerCase())
        .includes(address);

      if (
        comment.userAddress.toLowerCase() !== address &&
        !isAdmin
      ) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      await prisma.ideaComments.update({
        where: { id: comment.id },
        data: {
          deletedAt: new Date(),
          body: '[deleted]',
        },
      });

      return { ok: true };
    }),
};
