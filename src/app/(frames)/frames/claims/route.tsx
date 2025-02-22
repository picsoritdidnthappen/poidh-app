// app/api/frames/route.ts
import { Button, createFrames } from 'frames.js/next';
import { fetchBounty } from '@/utils/utils';

const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000';
const frames = createFrames({
  basePath: `${baseUrl}/frames`,
});

const handleRequest = frames(async (ctx) => {
  const { searchParams } = new URL(ctx.url);
  const chainId = searchParams.get('chainId');
  const bountyId = searchParams.get('bountyId');

  if (!chainId || !bountyId) {
    return {
      image: `/claims/image?error=missing-params`,
      buttons: [
        <Button
          key='home'
          action='post'
          target={`/?chainId=${chainId}&bountyId=${bountyId}`}
        >
          Back to Home
        </Button>,
      ],
      imageOptions: {
        width: 570,
        height: 320,
      },
    };
  }

  try {
    const bountyData = await fetchBounty(chainId, bountyId);
    const claims = bountyData.bounty.claims;

    if (!claims || claims.length === 0) {
      return {
        image: `/claims/image?error=no-claims`,
        buttons: [
          <Button
            key='home'
            action='post'
            target={`/?chainId=${chainId}&bountyId=${bountyId}`}
          >
            Back to Home
          </Button>,
        ],
        imageOptions: {
          width: 570,
          height: 320,
        },
      };
    }

    const currentClaimId = searchParams.get('claimId') ?? '0';
    const currentClaimIndex = claims.findIndex(
      (claim, id) => id === Number(currentClaimId)
    );

    if (currentClaimIndex === -1) {
      return {
        image: `/claims/image?error=invalid-claim`,
        buttons: [
          <Button
            key='home'
            action='post'
            target={`/?chainId=${chainId}&bountyId=${bountyId}`}
          >
            Back to Home
          </Button>,
        ],
        imageOptions: {
          width: 570,
          height: 320,
        },
      };
    }

    const isLastClaim = currentClaimIndex === claims.length - 1;
    const nextClaimIndex = currentClaimIndex + 1;

    const nextTarget = isLastClaim
      ? `/?chainId=${chainId}&bountyId=${bountyId}`
      : `/claims?chainId=${chainId}&bountyId=${bountyId}&claimId=${nextClaimIndex}`;

    return {
      image: `/claims/image?chainId=${chainId}&bountyId=${bountyId}&claimId=${currentClaimId}`,
      buttons: [
        <Button key='navigation' action='post' target={nextTarget}>
          {isLastClaim ? 'Back to Home' : 'Next Claim'}
        </Button>,
      ],
      imageOptions: {
        width: 570,
        height: 320,
      },
    };
  } catch (error) {
    console.error('Error handling frame request:', error);
    return {
      image: `/claims/image?error=fetch-error`,
      buttons: [
        <Button
          key='home'
          action='post'
          target={`/?chainId=${chainId}&bountyId=${bountyId}`}
        >
          Back to Home
        </Button>,
      ],
      imageOptions: {
        width: 570,
        height: 320,
      },
    };
  }
});

export const GET = handleRequest;
export const POST = handleRequest;
