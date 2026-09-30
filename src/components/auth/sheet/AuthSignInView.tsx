'use client';

import React, { useState } from 'react';
import {
  OAUTH_PROVIDERS,
  useAuthenticateOAuth,
  useLoginPasskey,
  useRegisterPasskey,
} from '@zerodev/wallet-react';
import { useAccount } from 'wagmi';
import { toast } from 'react-toastify';
import {
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetContent,
  SheetClose,
} from '@/components/ui/Sheet';
import { AlertCircle, Fingerprint, KeyRound, X } from 'lucide-react';

interface AuthSignInViewProps {
  onClose: () => void;
}

export default function AuthSignInView({ onClose }: AuthSignInViewProps) {
  const { isConnected } = useAccount();
  const loginPasskey = useLoginPasskey();
  const registerPasskey = useRegisterPasskey();
  const authenticateOAuth = useAuthenticateOAuth();

  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const isPending =
    loginPasskey.isPending ||
    registerPasskey.isPending ||
    authenticateOAuth.isPending;

  const handlePasskeyLogin = async () => {
    setAuthError(null);
    try {
      setActiveAction('passkey-login');
      await loginPasskey.mutateAsync();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('zerodev-auth-success'));
      }
      toast.success('Logged in with passkey');
      onClose();
    } catch (err: unknown) {
      const e = err as { message?: string; name?: string };
      const msg =
        e?.message?.includes('not found') || e?.name === 'NotAllowedError'
          ? 'No passkey found on this device. Create one below.'
          : e?.message || 'Passkey login failed';
      setAuthError(msg);
      if (e?.message?.includes('not found') || e?.name === 'NotAllowedError') {
        toast.info('No passkey found, create one below');
      } else {
        toast.error(msg);
      }
    } finally {
      setActiveAction(null);
    }
  };

  const handlePasskeyRegister = async () => {
    setAuthError(null);
    try {
      setActiveAction('passkey-register');
      await registerPasskey.mutateAsync();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('zerodev-auth-success'));
      }
      toast.success(isConnected ? 'Passkey device added' : 'Account created');
      onClose();
    } catch (err: unknown) {
      const e = err as { message?: string };
      const msg = e?.message || 'Passkey registration failed';
      setAuthError(msg);
      toast.error(msg);
    } finally {
      setActiveAction(null);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthError(null);
    try {
      setActiveAction('google');
      await authenticateOAuth.mutateAsync({
        provider: OAUTH_PROVIDERS.GOOGLE,
      });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('zerodev-auth-success'));
      }
      toast.success('Logged in with Google');
      onClose();
    } catch (err: unknown) {
      const e = err as { message?: string };
      const msg = e?.message || 'Google login failed';
      setAuthError(msg);
      toast.error(msg);
    } finally {
      setActiveAction(null);
    }
  };

  return (
    <>
      <SheetHeader className='pb-5'>
        <div className='flex items-start justify-between w-full'>
          <div>
            <SheetTitle className='text-lg font-bold text-white tracking-tight normal-case'>
              Sign In
            </SheetTitle>
            <SheetDescription className='text-xs text-white/50 mt-1 font-normal normal-case'>
              Choose a passkey or social account to continue
            </SheetDescription>
          </div>
          <SheetClose onClick={onClose} />
        </div>
      </SheetHeader>

      <SheetContent className='space-y-4 pt-5'>
        {authError && (
          <div className='p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-2.5 text-xs text-red-400 normal-case leading-relaxed'>
            <AlertCircle size={16} className='shrink-0 mt-0.5 text-red-400' />
            <div className='flex-1 break-words font-sans'>{authError}</div>
            <button
              type='button'
              onClick={() => setAuthError(null)}
              className='text-red-400/60 hover:text-red-400 p-0.5 rounded transition-colors'
              aria-label='Dismiss error'
            >
              <X size={13} />
            </button>
          </div>
        )}

        {/* Primary Passkey Action */}
        <button
          onClick={handlePasskeyLogin}
          disabled={isPending}
          className='w-full flex items-center justify-center gap-2.5 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/40 text-white font-semibold text-sm px-4 py-2.5 transition active:scale-[0.99] disabled:opacity-50 normal-case'
        >
          <Fingerprint size={16} className='text-white/80' />
          <span>
            {activeAction === 'passkey-login'
              ? 'Signing In...'
              : 'Sign In with Passkey'}
          </span>
        </button>

        {/* Create Passkey Account */}
        <button
          onClick={handlePasskeyRegister}
          disabled={isPending}
          className='w-full flex items-center justify-center gap-2.5 rounded-full bg-[#f15e5f] hover:bg-[#cf5d5d] text-white font-semibold text-sm px-4 py-2.5 transition active:scale-[0.99] disabled:opacity-50 shadow-sm normal-case'
        >
          <KeyRound size={16} className='text-white' />
          <span>
            {activeAction === 'passkey-register'
              ? 'Creating Account...'
              : 'Create Passkey Account'}
          </span>
        </button>

        {/* Hairline Divider */}
        <div className='relative flex items-center py-2'>
          <div className='flex-grow border-t border-white/10' />
          <span className='flex-shrink mx-3 text-[11px] font-medium text-white/40 uppercase tracking-widest'>
            or
          </span>
          <div className='flex-grow border-t border-white/10' />
        </div>

        {/* Google OAuth */}
        <button
          onClick={handleGoogleLogin}
          disabled={isPending}
          className='w-full flex items-center justify-center gap-2.5 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/40 text-white font-semibold text-sm px-4 py-2.5 transition active:scale-[0.99] disabled:opacity-50 normal-case'
        >
          <svg className='h-4 w-4' viewBox='0 0 24 24'>
            <path
              fill='#4285F4'
              d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
            />
            <path
              fill='#34A853'
              d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
            />
            <path
              fill='#FBBC05'
              d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z'
            />
            <path
              fill='#EA4335'
              d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z'
            />
          </svg>
          <span>
            {activeAction === 'google'
              ? 'Connecting Google...'
              : 'Continue with Google'}
          </span>
        </button>
      </SheetContent>
    </>
  );
}
