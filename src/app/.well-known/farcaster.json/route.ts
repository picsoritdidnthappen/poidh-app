import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // get viewer_fid from the query params
    return NextResponse.json({
      accountAssociation: {
        header:
          'eyJmaWQiOjIyMTAsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHg5MmQxODFiMDI5ZGI0MDQ3ODA5OTg4ODJBMjM0NjEzQzA3MjQwMzBkIn0',
        payload: 'eyJkb21haW4iOiJwb2lkaC54eXoifQ',
        signature:
          'MHhjNDY5OWM2ZDJlMWQ0NDM4ZmY3ZjAwNzY0MjI3NjU5ODA1YWI4ODcyZTQ4YzcxZjI3Mzg5OTYxMDg5MzJjNzM4MDM4ZjU4NTU0NDkyZmQwM2Y5YTBkMzc4MTdhZmQ0YmRiNzViNmJjZWZkZjM4ZmZlMTgwZDFlYjIyNGVmZGMxYjFj',
      },
      frame: {
        version: '1',
        name: 'poidh',
        iconUrl: 'https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/151dca9d-4e55-4a8f-0d4f-79cace50d000/original',
        homeUrl: 'https://poidh.xyz',
        splashImageUrl: 'https://poidh-app-theta.vercel.app/Logo_poidh.svg',
        splashBackgroundColor: '#eeccff',
        webhookUrl: 'https://poidh-app-theta.vercel.app/api/webhook',
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to fetch NFT owners with Farcaster profiles' },
      { status: 500 }
    );
  }
}
