import { getChainId } from '@/utils/utils';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

const CLANKER_DEPLOY_ENDPOINT =
  'https://www.clanker.world/api/tokens/deploy/split';
const POIDH_BOT_FID = 814040;
const POIDH_TEAM_ADDRESS = '0x7C7F6cb2dab9De9b242eEec29d2F61bD7d9750E0';

export async function POST(
  request: Request,
  { params }: { params: { chainName: string; bountyId: string } }
): Promise<Response> {
  try {
    const CLANKER_API_KEY = process.env.CLANKER_API_KEY;
    if (!CLANKER_API_KEY) {
      throw new Error('Missing Clanker API key');
    }

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
        extras: {
          select: {
            clanker_address: true,
          },
        },
      },
    });

    if (!bounty) {
      return NextResponse.json({ error: 'Bounty not found' }, { status: 404 });
    }

    if (bounty.extras?.clanker_address) {
      return NextResponse.json(
        { error: 'Bounty already clanked' },
        { status: 400 }
      );
    }

    // Create a request key by hashing the bounty id and chain id
    const requestKey = crypto
      .createHash('sha256')
      .update(`${bountyId}${chainId}`)
      .digest('base64')
      .slice(0, 32);

    // Get the image URL from the winning claim...
    const winningClaimUrl = bounty.claims.find(
      (claim) => claim.is_accepted
    )?.url;
    if (!winningClaimUrl) {
      return NextResponse.json(
        { error: 'No winning claim found' },
        { status: 400 }
      );
    }
    const winningClaimImage = await fetch(winningClaimUrl);
    const winningClaimImageJson = await winningClaimImage.json();
    const winningClaimImageUrl = winningClaimImageJson.image;

    // Create a new clanker
    const response = await fetch(CLANKER_DEPLOY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLANKER_API_KEY,
      },
      body: JSON.stringify({
        name: bounty.claims.find((claim) => claim.is_accepted)?.title,
        symbol: `poidh${chainName}${bountyId}`,
        image: winningClaimImageUrl,
        requestKey,
        requestorAddress: POIDH_TEAM_ADDRESS,
        creatorRewardsPercentage: 80,
        requestorFid: POIDH_BOT_FID,
        tokenPair: 'WETH',
        description: bounty.claims.find((claim) => claim.is_accepted)
          ?.description,
        platform: 'poidh',
        creatorRewardsAdmin: POIDH_TEAM_ADDRESS,
        groupAddresses: [
          bounty.claims.find((claim) => claim.is_accepted)?.issuer,
          bounty.issuer,
        ],
        initialMarketCap: 10,
      }),
    });

    const responseJson = await response.json();

    // Get the address of the new clanker
    const clankerAddress = responseJson.contract_address;

    // Update the bounty with the clanker address
    await prisma.bounties.update({
      where: { id_chain_id: { id: bountyIdNum, chain_id: chainId } },
      data: {
        extras: {
          update: {
            clanker_address: clankerAddress,
          },
        },
      },
    });

    return Response.json({
      clankerAddress,
      success: true,
    });
  } catch (error) {
    console.error(error);
    return Response.json({
      error: 'Failed to clank bounty',
      success: false,
    });
  }
}
