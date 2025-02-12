'use client';

import sdk from '@farcaster/frame-sdk';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const Claims = dynamic(() => import('@/components/frame/claims/claims'), {
  ssr: false,
});

export default function App({
  bountyId,
  chainId,
}: {
  bountyId: string;
  chainId: string;
}) {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  useEffect(() => {
    const load = async () => {
      sdk.actions.ready();
    };
    if (sdk && !isSDKLoaded) {
      setIsSDKLoaded(true);
      void load();
    }
  }, [isSDKLoaded]);
  return <Claims chainId={chainId} bountyId={bountyId} />;
}
