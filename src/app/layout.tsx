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

const headersList = headers();
const host = headersList.get('host');
const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';

export const metadata = {
  title: "poidh - pics or it didn't happen - crypto bounties",
  description:
    "poidh - pics or it didn't happen - fully onchain bounties + collectible NFTs - start your collection today on Arbitrum, Base, or Degen Chain",
  openGraph: {
    title: "poidh - pics or it didn't happen - crypto bounties",
    description:
      "poidh - pics or it didn't happen - fully onchain bounties + collectible NFTs - start your collection today on Arbitrum, Base, or Degen Chain",
    type: 'website',
    images: [
      {
        url: `${`${protocol}://${host}`}/images/poidh-preview-hero-v2.png`,
        width: 1200,
        height: 630,
        alt: "POIDH - Pics or it didn't happen",
      },
    ],
    siteName: 'POIDH',
    locale: 'en_US',
  },
};

const RootLayout = async ({ children }: { children: React.ReactNode }) => {
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
