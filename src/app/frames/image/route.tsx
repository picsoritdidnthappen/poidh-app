// app/api/frame/route.tsx
import BountyCard from '@/components/frame/claims/Bounty';
import BountyErrorCard from '@/components/frame/claims/Error';
import { ImageResponse, NextRequest } from 'next/server';

export const runtime = 'edge';

type BountyResponse = {
  bounty: {
    id: number;
    chain_id: number;
    title: string;
    description: string;
    amount: string;
    issuer: {
      address: string;
    };
    status: {
      in_progress: boolean | null;
      is_joined_bounty: boolean | null;
      is_canceled: boolean | null;
      is_multiplayer: boolean | null;
      is_voting: boolean | null;
    };
    deadline: number | null;
    participants: Array<{
      address: string;
      amount: string;
      user: null;
    }>;
    claims: Array<{
      id: number;
      title: string;
      description: string;
      url: string;
      owner: string;
      issuer: {
        address: string;
      };
      is_accepted: boolean | null;
    }>;
  };
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const chainName = searchParams.get('chainName');
    const bountyId = searchParams.get('bountyId');

    if (!chainName || !bountyId) {
      return new ImageResponse(
        <BountyErrorCard message='Missing chain name or bounty ID' />,
        {
          width: 570,
          height: 320,
        }
      );
    }

    // Direct API call to fetch bounty data
    const response = await fetch(
      `https://poidh-app-theta.vercel.app/api/bounties/${chainName}/${bountyId}`,
      {
        headers: {
          Accept: 'application/json',
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const bountyData = (await response.json()) as BountyResponse;

    if (!bountyData || !bountyData.bounty) {
      throw new Error('Invalid bounty data received');
    }

    return new ImageResponse(
      <BountyCard bounty={bountyData.bounty} chainName={chainName} />,
      {
        width: 570,
        height: 320,
      }
    );
  } catch (error) {
    console.error('Error generating bounty image:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';

    return new ImageResponse(
      (
        <BountyErrorCard
          message={`Failed to generate bounty image: ${errorMessage}`}
        />
      ),
      {
        width: 570,
        height: 320,
      }
    );
  }
}
