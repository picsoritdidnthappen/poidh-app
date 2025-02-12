import BountyCard from '@/components/frame/claims/Bounty';
import BountyErrorCard from '@/components/frame/claims/Error';
import { fetchBounty } from '@/utils/utils';
import { Button, createFrames } from 'frames.js/next';

const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000';
const frames = createFrames({
  basePath: `${baseUrl}/frames`,
});

const handleRequest = frames(async (ctx) => {
  const { searchParams } = new URL(ctx.url);
  const chainId = searchParams.get('chainId');
  const bountyId = searchParams.get('bountyId');
  console.log(chainId, bountyId);

  if (!chainId || !bountyId) {
    const returnMsg = 'No chain id provided';
    return {
      image: `/image?success=false&msg=${encodeURI(returnMsg)}`,
      buttons: [
        <Button key={'retry'} action='post' target={`/`}>
          Retry
        </Button>,
      ],
    };
  }

  try {
    const bountyData = await fetchBounty(chainId!, bountyId!);

    return {
      image: `/image?chainId=${chainId}&bountyId=${bountyId}`,
      buttons: [
        <Button
          key={'back'}
          action='post'
          target={`/claims?claimId=0&chainId=${chainId}&bountyId=${bountyId}`}
        >
          See Claims
        </Button>,
      ],
    };
  } catch {
    return {
      image: `/image?chainId=${chainId}&bountyId=${bountyId}`,
      buttons: [
        <Button
          key={'retry'}
          action='post'
          target={`/?chainId=${chainId}&bountyId=${bountyId}`}
        >
          Retry
        </Button>,
      ],
    };
  }
});
export const GET = handleRequest;
export const POST = handleRequest;
