'use client';

import { useEffect, useState } from 'react';
import { CloseIcon } from '@/components/global/Icons';
import { SESSION_TTL_DAYS } from '@/utils/authConfig';
import { getErrorMessage } from '@/utils/errors';

/**
 * Asks the user to sign in by signing a message with their wallet. Shown
 * right after they connect, and again when they try an offchain action
 * without a session.
 *
 * This is a plain overlay rather than a Headless UI dialog so the ZeroDev
 * approval sheet, which opens when a ZeroDev wallet signs, can sit on top of
 * it without the two fighting over focus.
 */
export default function SignInModal({
  expired,
  onSignIn,
  onClose,
}: {
  expired: boolean;
  onSignIn: () => Promise<void>;
  onClose: () => void;
}) {
  const [isSigning, setIsSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSignIn = async () => {
    setIsSigning(true);
    setError(null);

    try {
      await onSignIn();
    } catch (err) {
      console.error('Sign-in failed', err);
      setError(getErrorMessage(err));
      setIsSigning(false);
    }
  };

  return (
    <div
      className='fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4'
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role='dialog'
        aria-modal='true'
        aria-labelledby='sign-in-title'
        className='bg-poidhBlue/90 dark:bg-[#132b47] border border-[#D1ECFF] rounded-[30px] shadow-2xl w-full max-w-sm mx-auto'
      >
        <div className='flex items-center justify-between p-6 border-b border-white/20'>
          <h2 id='sign-in-title' className='text-xl font-semibold text-white'>
            {expired ? 'Sign in again' : 'Sign in'}
          </h2>
          <button
            onClick={onClose}
            className='p-2 hover:bg-white/20 rounded-full transition-colors text-white'
            aria-label='Close'
          >
            <CloseIcon size={20} />
          </button>
        </div>

        <div className='p-6 flex flex-col gap-4'>
          <p className='text-white/80 leading-relaxed'>
            {expired
              ? 'Your sign-in has expired. Sign a message with your wallet to keep going.'
              : 'Sign a message with your wallet so you can comment and vote without signing each time.'}{' '}
            It&apos;s free and doesn&apos;t send a transaction. You&apos;ll stay
            signed in for {SESSION_TTL_DAYS} days.
          </p>

          {error && <p className='text-sm text-red-200'>{error}</p>}

          <div className='flex gap-2'>
            <button
              onClick={handleSignIn}
              disabled={isSigning}
              className='flex-1 border border-white rounded-full px-5 py-2 bg-white/30 hover:bg-white/20 disabled:opacity-60 disabled:cursor-wait transition-colors'
            >
              {isSigning ? 'Check your wallet…' : 'Sign in'}
            </button>
            <button
              onClick={onClose}
              className='flex-1 rounded-full px-5 py-2 hover:bg-white/20 transition-colors'
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
