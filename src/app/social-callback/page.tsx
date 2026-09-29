'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createSocialSmartAccount,
  markSocialPending,
  socialLoginAuthorized,
} from '@/zerodev/socialSmartAccount';
import { zerodevConfigured } from '@/zerodev/config';

/**
 * OAuth landing page for ZeroDev social login. Google redirects here
 * after authentication; we verify the Magic session, derive the Kernel
 * smart account, persist it, and send the user home where the social
 * connector auto-connects.
 */
export default function SocialCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState('finishing Google login…');

  useEffect(() => {
    (async () => {
      try {
        if (!zerodevConfigured()) {
          throw new Error('ZeroDev is not configured on this deployment');
        }
        const authorized = await socialLoginAuthorized();
        if (!authorized) throw new Error('Google login was not completed');
        const session = await createSocialSmartAccount();
        markSocialPending();
        setStatus(`welcome ${session.address.slice(0, 10)}…`);
        router.replace('/');
      } catch (e) {
        setStatus(e instanceof Error ? e.message : 'social login failed');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className='flex min-h-[60vh] items-center justify-center'>
      <p className='opacity-70'>{status}</p>
    </div>
  );
}
