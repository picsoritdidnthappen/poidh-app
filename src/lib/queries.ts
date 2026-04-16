import { prisma } from '@/lib/prisma';

export async function getBountiesForAlbum(slug: string) {
  try {
    const bounties = await prisma.bountyExtra.findMany({
      where: {
        category: slug.toLowerCase(),
      },
      orderBy: {
        createdAt: 'desc',
      },
      // Remove the limit to show all bounties instead of just 15
      include: {
        claims: {
          where: {
            accepted: true,
          },
          take: 1,
        },
        reactions: true,
        _count: {
          select: {
            claims: true,
            reactions: true,
          },
        },
      },
    });
    
    return bounties;
  } catch (error) {
    console.error('Error fetching bounties for album:', error);
    throw error;
  }
}

export async function getRecentBounties(limit: number = 10) {
  try {
    const bounties = await prisma.bountyExtra.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      include: {
        claims: {
          where: {
            accepted: true,
          },
          take: 1,
        },
        reactions: true,
        _count: {
          select: {
            claims: true,
            reactions: true,
          },
        },
      },
    });
    
    return bounties;
  } catch (error) {
    console.error('Error fetching recent bounties:', error);
    throw error;
  }
}

export async function getBountyById(id: string) {
  try {
    const bounty = await prisma.bountyExtra.findUnique({
      where: {
        id,
      },
      include: {
        claims: {
          orderBy: {
            createdAt: 'asc',
          },
        },
        reactions: true,
        _count: {
          select: {
            claims: true,
            reactions: true,
          },
        },
      },
    });
    
    return bounty;
  } catch (error) {
    console.error('Error fetching bounty by ID:', error);
    throw error;
  }
}

export async function searchBounties(query: string, limit: number = 20) {
  try {
    const bounties = await prisma.bountyExtra.findMany({
      where: {
        OR: [
          {
            title: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            description: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            category: {
              contains: query,
              mode: 'insensitive',
            },
          },
        ],
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      include: {
        claims: {
          where: {
            accepted: true,
          },
          take: 1,
        },
        reactions: true,
        _count: {
          select: {
            claims: true,
            reactions: true,
          },
        },
      },
    });
    
    return bounties;
  } catch (error) {
    console.error('Error searching bounties:', error);
    throw error;
  }
}