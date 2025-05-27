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
import CryptoWalletMobilePopup from '@/components/global/CryptoWalletMobilePopup';
import { Provider } from 'jotai';

// Constants for metadata
const APP_URL = process.env.NEXT_PUBLIC_URL || 'https://poidh.xyz';
const APP_NAME = 'Poidh';
const APP_DESCRIPTION =
  "poidh - pics or it didn't happen - fully onchain bounties + collectible NFTs on Arbitrum, Base, or Degen Chain";
const APP_OG_IMAGE_URL =
  `${process.env.NEXT_PUBLIC_URL}/images/poidh-preview-hero-v1.png` ||
  `https://poidh.xyz/images/poidh-preview-hero-v1.png`;
const APP_ICON_URL =
  `${process.env.NEXT_PUBLIC_URL}/icon.png` || 'https://poidh.xyz/icon.png';
const APP_SPLASH_URL =
  `${process.env.NEXT_PUBLIC_URL}/Logo_poidh.svg` ||
  'https://poidh.xyz/Logo_poidh.svg';
const APP_SPLASH_BACKGROUND_COLOR = '#2a81d5';
const APP_BUTTON_TEXT = 'Launch Poidh';

export const metadataBase = new URL('https://poidh.xyz');

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const frame = {
    version: 'next',
    imageUrl: APP_OG_IMAGE_URL,
    button: {
      title: APP_BUTTON_TEXT,
      action: {
        type: 'launch_frame',
        name: APP_NAME,
        url: APP_URL,
        splashImageUrl: APP_SPLASH_URL,
        iconUrl: APP_ICON_URL,
        splashBackgroundColor: APP_SPLASH_BACKGROUND_COLOR,
      },
    },
  };

  return {
    title: "poidh - pics or it didn't happen - crypto bounties",
    description: APP_DESCRIPTION,
    openGraph: {
      type: 'website',
      url: APP_URL,
      title: "poidh - pics or it didn't happen - crypto bounties",
      description: APP_DESCRIPTION,
      siteName: 'POIDH',
      images: [
        {
          url: APP_OG_IMAGE_URL,
          width: 600,
          height: 400,
          alt: "poidh - pics or it didn't happen - crypto bounties",
        },
      ],
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: "poidh - pics or it didn't happen - crypto bounties",
      description: APP_DESCRIPTION,
      images: [APP_OG_IMAGE_URL],
    },
    other: {
      'fc:frame': JSON.stringify(frame),
    },
  };
}

const RootLayout = async ({ children }: { children: React.ReactNode }) => {
  const headersList = headers();
  const referer = headersList.get('referer');
  const url = referer ? String(referer) : '';

  return (
    <html lang='en'>
      <head>
        <link rel='canonical' href={url} />
      </head>
      <body className='bg-blue-300 text-white'>
        <TRPCProvider>
          <WalletProvider>
            <LoadingProvider>
              <Provider>
                <ClientLayout>{children}</ClientLayout>
                <ToastContainer />
                <CryptoWalletMobilePopup />
              </Provider>
            </LoadingProvider>
          </WalletProvider>
        </TRPCProvider>
      </body>
    </html>
  );
};

export default RootLayout;
