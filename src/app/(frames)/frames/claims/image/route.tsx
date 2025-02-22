// app/api/frames/image/route.ts
import { ImageResponse } from 'next/server';
import { fetchBounty } from '@/utils/utils';
import BountyErrorCard from '@/components/frame/claims/Error';
import ClaimShowcase from '@/components/frame/claims/claim';

export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const error = searchParams.get('error');

  // Handle error states
  if (error) {
    let errorMessage = 'Something went wrong';
    switch (error) {
      case 'missing-params':
        errorMessage = 'Missing required parameters';
        break;
      case 'no-claims':
        errorMessage = 'No claims found for this bounty';
        break;
      case 'invalid-claim':
        errorMessage = 'Invalid claim ID';
        break;
      case 'fetch-error':
        errorMessage = 'Failed to load bounty data';
        break;
    }

    return new ImageResponse(<BountyErrorCard message={errorMessage} />, {
      width: 570,
      height: 320,
    });
  }

  // Handle claim showcase
  try {
    const chainId = searchParams.get('chainId');
    const bountyId = searchParams.get('bountyId');
    const claimId = searchParams.get('claimId');

    if (!chainId || !bountyId || !claimId) {
      return new ImageResponse(
        <BountyErrorCard message='Missing required parameters' />,
        {
          width: 570,
          height: 320,
        }
      );
    }

    const bountyData = await fetchBounty(chainId, bountyId);
    const claim = bountyData.bounty.claims.find(
      (c, id) => id === Number(claimId)
    );

    if (!claim) {
      return new ImageResponse(<BountyErrorCard message='Claim not found' />, {
        width: 570,
        height: 320,
      });
    }

    const imgResFetch = await fetch(claim.url);
    const imgResData = await imgResFetch.json();

    return new ImageResponse(
      <ClaimShowcase claim={claim} url={imgResData.image} />,
      {
        width: 570,
        height: 320,
      }
    );
  } catch (error) {
    console.error('Error generating image:', error);
    return new ImageResponse(
      <BountyErrorCard message='Failed to generate image' />,
      {
        width: 570,
        height: 320,
      }
    );
  }
}
