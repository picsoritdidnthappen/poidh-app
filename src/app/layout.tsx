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

const RootLayout = async ({ children }: { children: React.ReactNode }) => {
  const headersList = headers();
  const referer = headersList.get('referer');
  const url = referer ? String(referer) : '';

  const metadata = {
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
          url: `${`${
            process.env.NODE_ENV === 'development' ? 'http' : 'https'
          }://${headersList.get('host')}`}/images/poidh-preview-hero-v2.png`,
          width: 1200,
          height: 630,
          alt: "POIDH - Pics or it didn't happen",
        },
      ],
      siteName: 'POIDH',
      locale: 'en_US',
    },
  };

  return (
    <html>
      <head>
        <title>{metadata.title}</title>
        <meta name='description' content={metadata.description} />
        <meta property='og:title' content={metadata.openGraph.title} />
        <meta
          property='og:description'
          content={metadata.openGraph.description}
        />
        <meta property='og:type' content={metadata.openGraph.type} />
        <meta property='og:image' content={metadata.openGraph.images[0].url} />
        <meta
          property='og:image:width'
          content={String(metadata.openGraph.images[0].width)}
        />
        <meta
          property='og:image:height'
          content={String(metadata.openGraph.images[0].height)}
        />
        <meta
          property='og:image:alt'
          content={metadata.openGraph.images[0].alt}
        />
        <meta property='og:site_name' content={metadata.openGraph.siteName} />
        <meta property='og:locale' content={metadata.openGraph.locale} />
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
