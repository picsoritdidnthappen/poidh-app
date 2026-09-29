'use client';

import { useEffect, useState } from 'react';
import { useConnect } from 'wagmi';
import {
  consumeSocialPending,
  readSocialSession,
} from '@/zerodev/socialSmartAccount';
import { zerodevConfigured } from '@/zerodev/config';

/**
 * One-click shortcut for the Google social smart-account connector
 * (also listed in the RainbowKit modal). Google OAuth is a full-page
 * redirect: after /social-callback lands, this button auto-connects the
 * freshly created session.
 */
export function SocialConnectButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { connectAsync, connectors } = useConnect();

  // Auto-connect right after the OAuth redirect completes.
  useEffect(() => {
    if (!zerodevConfigured() || !consumeSocialPending()) return;
    const connector = connectors.find((c) => c.id === 'zerodev-social');
    if (!connector) return;
    // A session was just created by /social-callback; connect silently.
    if (readSocialSession()) {
      setBusy(true);
      connectAsync({ connector })
        .catch((e) =>
          setError(e instanceof Error ? e.message : 'social login failed')
        )
        .finally(() => setBusy(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!zerodevConfigured()) return null;

  const onClick = async () => {
    setBusy(true);
    setError(null);
    try {
      const connector = connectors.find((c) => c.id === 'zerodev-social');
      if (!connector) throw new Error('social connector not registered');
      // No session yet: the connector starts the Google redirect and the
      // page navigates away (promise never resolves by design).
      await connectAsync({ connector });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'social login failed';
      if (!/redirecting to Google/i.test(msg)) setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className='inline-flex flex-col items-start'>
      <button
        onClick={onClick}
        disabled={busy}
        className='border-[#D1ECFF] rounded-lg backdrop-blur-sm bg-white/30 p-2 hover:bg-white/20 h-10 disabled:opacity-50'
        title='Log in with Google — smart account on Arbitrum, no seed phrase, no extension'
      >
        {busy ? 'google…' : '🔵 google'}
      </button>
      {error && <span className='text-xs text-red-500 max-w-40'>{error}</span>}
    </span>
  );
}
