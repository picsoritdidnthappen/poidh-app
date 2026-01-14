import '@/styles/globals.css';
import 'react-toastify/dist/ReactToastify.css';
import { headers } from 'next/headers';
import { TRPCProvider } from '@/trpc/client';
import '@rainbow-me/rainbowkit/styles.css';
import { WalletProvider } from '@/components/global/WalletProvider';
import { ToastContainer } from 'react-toastify';
import { LoadingLayout } from '@/components/global/LoadingLayout';
import ClientLayout from '@/app/layout.client';
import { Metadata } from 'next';
import CryptoWalletMobilePopup from '@/components/global/CryptoWalletMobilePopup';
import { Analytics } from '@vercel/analytics/next';

const APP_URL = process.env.NEXT_PUBLIC_URL || 'https://poidh.xyz';
const APP_NAME = 'poidh';
const APP_DESCRIPTION =
  "pics or it didn't happen - social bounties + collectible NFTs on Arbitrum, Base, or Degen Chain - we don't have a token, Google is lying to you";
const APP_OG_IMAGE_URL =
  `${process.env.NEXT_PUBLIC_URL}/images/poidh-preview-hero-v2.png` ||
  `https://poidh.xyz/images/poidh-preview-hero-v2.png`;
const APP_ICON_URL =
  `${process.env.NEXT_PUBLIC_URL}/icon.png` || 'https://poidh.xyz/icon.png';
const APP_SPLASH_URL =
  `${process.env.NEXT_PUBLIC_URL}/Logo_poidh.svg` ||
  'https://poidh.xyz/Logo_poidh.svg';
const APP_SPLASH_BACKGROUND_COLOR = '#2a81d5';
const APP_BUTTON_TEXT = 'launch poidh';

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
    metadataBase: new URL(APP_URL),
    title: "poidh - pics or it didn't happen - crypto bounties",
    description: APP_DESCRIPTION,
    viewport: {
      width: 'device-width',
      initialScale: 1,
      maximumScale: 1,
      userScalable: false,
      viewportFit: 'cover',
    },
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
            <LoadingLayout>
              <ClientLayout>{children}</ClientLayout>
              <ToastContainer />
              <CryptoWalletMobilePopup />
            </LoadingLayout>
          </WalletProvider>
        </TRPCProvider>
        <Analytics />
      </body>
    </html>
  );
}
