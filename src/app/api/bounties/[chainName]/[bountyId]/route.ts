// app/api/bounties/[chainName]/[bountyId]/route.ts
import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

// Define valid chain names as a type
type ChainName = 'base' | 'degen' | 'arbitrum';

// Chain ID mapping with proper typing
// Chain ID mapping with proper typing
const CHAIN_IDS: Record<ChainName, number> = {
  base: 8453,
  degen: 666666666,
  arbitrum: 42161,
};

// Helper function to validate chain name with proper typing
function getChainId(chainName: string): number {
  // Type guard to check if the chain name is valid
  function isValidChainName(name: string): name is ChainName {
    return name.toLowerCase() in CHAIN_IDS;
  }

  if (!isValidChainName(chainName)) {
    throw new Error(
      `Invalid chain name: ${chainName}. Valid chains are: ${Object.keys(
        CHAIN_IDS
      ).join(', ')}`
    );
  }

  return CHAIN_IDS[chainName.toLowerCase() as ChainName];
}

// Define types for the response structure
type UserInfo = {
  address?: string;
  ens?: string | null;
  degen_name?: string | null;
};

type ClaimResponse = {
  id: number;
  title: string;
  description: string;
  url: string;
  owner: string;
  issuer: UserInfo;
  is_accepted: boolean | null;
};

type ParticipantResponse = {
  address: string;
  amount: string;
  user: {
    ens: string | null;
    degen_name: string | null;
  } | null;
};

export type BountyResponse = {
  bounty: {
    id: number;
    chain_id: number;
    title: string;
    description: string;
    amount: string;
    issuer: UserInfo;
    status: {
      in_progress: boolean | null;
      is_joined_bounty: boolean | null;
      is_canceled: boolean | null;
      is_multiplayer: boolean | null;
      is_voting: boolean | null;
    };
    deadline: number | null;
    participants: ParticipantResponse[];
    claims: ClaimResponse[];
  };
};

export async function GET(
  request: Request,
  { params }: { params: { chainName: string; bountyId: string } }
) {
  try {
    const { chainName, bountyId } = params;

    // Validate parameters
    if (!chainName || !bountyId) {
      return NextResponse.json(
        { error: 'Invalid parameters' },
        { status: 400 }
      );
    }

    const chainId = getChainId(chainName);
    const bountyIdNum = parseInt(bountyId);

    if (isNaN(bountyIdNum)) {
      return NextResponse.json({ error: 'Invalid bounty ID' }, { status: 400 });
    }

    // Fetch bounty with related data
    const bounty = await prisma.bounties.findUnique({
      where: {
        id_chain_id: {
          id: bountyIdNum,
          chain_id: chainId,
        },
      },
      include: {
        claims: {
          include: {
            issuerUser: {
              select: {
                address: true,
              },
            },
          },
        },
        issuerUser: {
          select: {
            address: true,
          },
        },
        participations: {
          include: {
            user: {
              select: {
                address: true,
              },
            },
          },
        },
      },
    });

    if (!bounty) {
      return NextResponse.json({ error: 'Bounty not found' }, { status: 404 });
    }

    // Format the response with proper typing
    const response: BountyResponse = {
      bounty: {
        id: bounty.id,
        chain_id: bounty.chain_id,
        title: bounty.title,
        description: bounty.description,
        amount: bounty.amount,
        issuer: {
          address: bounty.issuer,
        },
        status: {
          in_progress: bounty.in_progress,
          is_joined_bounty: bounty.is_joined_bounty,
          is_canceled: bounty.is_canceled,
          is_multiplayer: bounty.is_multiplayer,
          is_voting: bounty.is_voting,
        },
        deadline: bounty.deadline,
        participants: bounty.participations.map((p) => ({
          address: p.user_address,
          amount: p.amount,
          user: null,
        })),
        claims: bounty.claims.map((claim) => ({
          id: claim.id,
          title: claim.title,
          description: claim.description,
          url: claim.url,
          owner: claim.owner,
          issuer: {
            address: claim.issuer,
          },
          is_accepted: claim.is_accepted,
        })),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith('Invalid chain name')
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Error fetching bounty:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
