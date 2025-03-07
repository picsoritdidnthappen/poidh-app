import '@/styles/globals.css';
import '@/styles/colors.css';
import 'react-toastify/dist/ReactToastify.css';
import { headers } from 'next/headers';
import React from 'react';
import { TRPCProvider } from '@/trpc/client';
import '@rainbow-me/rainbowkit/styles.css';
import { WalletProvider } from '@/components/global/WalletProvider';
import { ToastContainer } from 'react-toastify';
import { LoadingProvider } from '@/components/global/LoadingProvider';
import ClientLayout from '@/app/layout.client';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "poidh - pics or it didn't happen - crypto bounties",
  description:
    "poidh - pics or it didn't happen - fully onchain bounties + collectible NFTs - start your collection today on Arbitrum, Base, or Degen Chain",
  openGraph: {
    type: 'website',
    url: 'https://poidh.xyz',
    images: [
      {
        url: `https://poidh.xyz/images/poidh-preview-hero-v2.png`,
        width: 1200,
        height: 630,
        alt: "poidh - pics or it didn't happen - crypto bounties",
      },
    ],
  },
};

const RootLayout = async ({ children }: { children: React.ReactNode }) => {
  const headersList = headers();
  const referer = headersList.get('referer');
  const url = referer ? String(referer) : '';

  return (
    <html>
      <head>
        <link rel='canonical' href={url} />
      </head>
      <body className='bg-blue-300 text-white'>
        <TRPCProvider>
          <WalletProvider>
            <LoadingProvider>
              <ClientLayout>{children}</ClientLayout>
              <ToastContainer />
            </LoadingProvider>
          </WalletProvider>
        </TRPCProvider>
      </body>
    </html>
  );
};

export default RootLayout;
