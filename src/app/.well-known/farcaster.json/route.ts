import { NextResponse } from 'next/server';

const appUrl = process.env.NEXT_PUBLIC_URL ?? 'https://poidh.xyz';
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
      version: "1", // subject to change
      name: "poidh",
      iconUrl: "https://poidh.xyz/icon.png",
      splashImageUrl: "https://poidh.xyz/splash.png",
      splashBackgroundColor: "#2a81d5",
      homeUrl: "https://poidh.xyz/",
      heroImageUrl: "https://poidh.xyz/images/poidh-preview-hero-v2.png",
      webhookUrl: "https://poidh.xyz/api/webhook",
      subtitle: "incentivize things",
      description: "create, share, and approve bounties on Farcaster",
      primaryCategory: "social",
      tags: ["bounties", "tasks", "incentives", "blockchain"],
      tagline: "incentivize things",
      ogTitle: "poidh",
      ogDescription: "incentivize tasks with bounties on Farcaster",
      ogImageUrl: "https://poidh.xyz/images/poidh-preview-hero-v2.png",
    },
  };

  return NextResponse.json(config);
}

export const runtime = 'edge';
