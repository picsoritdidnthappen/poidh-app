import { NextResponse } from 'next/server';

const header =
  process.env.NEXT_PUBLIC_HEADER ??
  'eyJmaWQiOjIyMTAsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHg5MmQxODFiMDI5ZGI0MDQ3ODA5OTg4ODJBMjM0NjEzQzA3MjQwMzBkIn0';
const payload =
  process.env.NEXT_PUBLIC_PAYLOAD ?? 'eyJkb21haW4iOiJwb2lkaC54eXoifQ';
const signature =
  process.env.NEXT_PUBLIC_SIGNATURE ??
  'MHhjNDY5OWM2ZDJlMWQ0NDM4ZmY3ZjAwNzY0MjI3NjU5ODA1YWI4ODcyZTQ4YzcxZjI3Mzg5OTYxMDg5MzJjNzM4MDM4ZjU4NTU0NDkyZmQwM2Y5YTBkMzc4MTdhZmQ0YmRiNzViNmJjZWZkZjM4ZmZlMTgwZDFlYjIyNGVmZGMxYjFj';

export async function GET() {
  const config = {
    accountAssociation: {
      header,
      payload,
      signature,
    },
    frame: {
      version: '1', // subject to change
      name: 'poidh',
      iconUrl: 'https://poidh.xyz/icon.png',
      splashImageUrl: 'https://poidh.xyz/mini-splash.png',
      splashBackgroundColor: '#6fa9e1',
      homeUrl: 'https://poidh.xyz/',
      heroImageUrl: 'https://poidh.xyz/images/poidh-preview-hero-v2.png',
      webhookUrl: `https://api.neynar.com/f/app/${process.env.NEYNAR_CLIENT_ID}/event`,
      subtitle: 'program reality',
      description: 'create, share, and crowdfund social bounties',
      primaryCategory: 'social',
      tags: ['bounties', 'tasks', 'incentives', 'blockchain'],
      tagline: 'social bounties to program reality',
      ogTitle: 'poidh',
      ogDescription: 'create, share, and crowdfund social bounties',
      ogImageUrl: 'https://poidh.xyz/images/poidh-preview-hero-v2.png',
    },
    baseBuilder: {
      allowedAddresses: ['0x1B18f76e65fC875da2469710282A2E20F1e521e0'],
    },
  };

  return NextResponse.json(config);
}

export const runtime = 'edge';
