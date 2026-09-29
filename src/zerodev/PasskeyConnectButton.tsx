'use client';

import { useState } from 'react';
import { useConnect } from 'wagmi';
import { zerodevConfigured } from '@/zerodev/config';

/**
 * One-click shortcut for the passkey smart-account connector (also
 * listed in the RainbowKit modal). First use runs a WebAuthn register
 * ceremony; returning sessions restore silently.
 */
export function PasskeyConnectButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { connectAsync, connectors } = useConnect();

  if (!zerodevConfigured()) return null;

  const onClick = async () => {
    setBusy(true);
    setError(null);
    try {
      const connector = connectors.find((c) => c.id === 'zerodev-passkey');
      if (!connector) throw new Error('passkey connector not registered');
      await connectAsync({ connector });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'passkey login failed');
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
        title='Log in with a device passkey — smart account on Arbitrum, no seed phrase, no extension'
      >
        {busy ? 'passkey…' : '🔑 passkey'}
      </button>
      {error && <span className='text-xs text-red-500 max-w-40'>{error}</span>}
    </span>
  );
}
