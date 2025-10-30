'use client';

import { useGetChain } from '@/hooks/useGetChain';
import { Currency } from '@/utils/types';
import { useAccount } from 'wagmi';
import { useState, useRef, useEffect } from 'react';
import { TwitterXIcon } from '@/components/global/Icons';
import {
  getAddressDisplayName,
  shareToFarcaster,
  shareToX,
} from '@/utils/share';
import { trpc } from '@/trpc/client';

export default function JoinBountySuccessModal({
  open,
  onClose,
  joinedAmount,
  bountyId,
}: {
  open: boolean;
  onClose: () => void;
  joinedAmount: string;
  bountyId?: string;
}) {
  const account = useAccount();
  const chain = useGetChain();
  const [shareOpen, setShareOpen] = useState(false);
  const shareBtnRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const bounty = trpc.bounty.useQuery(
    {
      id: Number(bountyId),
      chainId: chain.id,
    },
    {
      enabled: !!open && !!bountyId,
    }
  );

  const { data: usersDataNeynar } = trpc.usersDataNeynar.useQuery(
    {
      addresses: bounty.data?.issuer ? [bounty.data.issuer] : [],
    },
    {
      enabled: !!open && !!bounty.data?.issuer,
    }
  );

  useEffect(() => {
    function handleDocClick(e: MouseEvent) {
      if (
        !e.target ||
        dropdownRef.current === e.target ||
        dropdownRef.current?.contains(e.target as Node)
      ) {
        return;
      }
      setShareOpen(false);
    }

    if (shareOpen) {
      document.addEventListener('mousedown', handleDocClick);
    }
    return () => document.removeEventListener('mousedown', handleDocClick);
  }, [shareOpen]);

  const handleShareTwitter = async () => {
    const bountyIssuerUsername = await getAddressDisplayName(
      bounty.data?.issuer ?? '',
      'twitter',
      usersDataNeynar
    );

    const amountText = `${joinedAmount} ${chain.currency.toUpperCase()}`;
    const text = `I just added ${amountText} to ${bountyIssuerUsername}'s @poidhxyz bounty`;
    shareToX(text);
  };

  const handleShareFarcaster = async () => {
    const bountyIssuerUsername = await getAddressDisplayName(
      bounty.data?.issuer ?? '',
      'farcaster',
      usersDataNeynar
    );

    const amountText = `${joinedAmount} ${chain.currency.toUpperCase()}`;
    const text = `I just added ${amountText} to ${bountyIssuerUsername}'s /poidh bounty`;
    await shareToFarcaster(text);
  };

  if (!open) return null;

  return (
    <div
      className='fixed inset-0 z-[1400] flex items-center justify-center p-4 bg-black/50'
      onClick={onClose}
    >
      <div
        className='relative w-full max-w-xs bg-poidhBlue/95 rounded-xl text-white border border-[#D1ECFF]'
        onClick={(e) => e.stopPropagation()}
      >
        <div className='relative p-6'>
          <button
            onClick={onClose}
            className='absolute top-2 right-2 text-white/70 hover:text-white transition-colors'
            aria-label='Close'
          >
            <svg
              width='20'
              height='20'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
            >
              <line x1='18' y1='6' x2='6' y2='18' />
              <line x1='6' y1='6' x2='18' y2='18' />
            </svg>
          </button>
          <div className='flex flex-col items-center gap-4'>
            <p className='font-family-geist text-sm text-white/90 font-bold'>
              funds successfully added! <span className='bounce-emoji'>💰</span>
            </p>

            <div className='flex flex-col gap-2 w-full items-center'>
              <div className='relative w-3/4'>
                <button
                  ref={shareBtnRef}
                  onClick={() => setShareOpen((v) => !v)}
                  className='w-full rounded-lg lowercase bg-poidhRed text-white py-3 font-family-geist hover:bg-red hover:scale-[1.01] transition-transform'
                  aria-expanded={shareOpen}
                  aria-haspopup='menu'
                >
                  share bounty
                </button>

                {shareOpen && (
                  <div
                    ref={dropdownRef}
                    role='menu'
                    aria-label='share menu'
                    className='absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 p-2 rounded-xl shadow-lg min-w-[200px] ring-1 ring-white/5 bg-gradient-to-br from-[#4aa0ff]/80 via-[#3fb0e9]/70 to-[#2f8fd9]/60 backdrop-blur-md border border-white/10'
                  >
                    <div className='flex flex-col font-mono text-sm text-white'>
                      <button
                        onClick={handleShareFarcaster}
                        className='w-full text-left px-4 py-2 rounded-md hover:bg-white/5 flex items-center gap-3 text-white'
                      >
                        <img
                          src='/images/farcaster_arch.svg'
                          alt='farcaster'
                          className='w-5 h-5 filter brightness-200'
                        />
                        <span>farcaster</span>
                      </button>
                      <button
                        onClick={handleShareTwitter}
                        className='w-full text-left px-4 py-2 rounded-md hover:bg-white/5 flex items-center gap-3 text-white'
                      >
                        <TwitterXIcon width={18} height={18} />
                        <span className='lowercase'>x</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  if (account.address) {
                    window.location.href = `/account/${account.address}`;
                  }
                }}
                className='font-family-geist w-3/4 py-3 rounded-lg lowercase bg-[#7fb7ee] text-white shadow-md hover:bg-white/20 hover:scale-[1.01] transition-transform'
              >
                view your profile
              </button>
            </div>

            <div className='text-left w-full px-1'>
              <p className='font-family-geist text-sm text-white/80'>
                once the bounty is finalized, you'll receive this many poidh
                points:
              </p>
            </div>

            <div className='bg-poidhBlue/80 px-6 pb-2 rounded-lg'>
              <p className='font-family-pixeloid text-4xl text-poidhRed/95 font-semibold [text-shadow:-0.5px_-0.5px_0_white,0.5px_-0.5px_0_white,-0.5px_0.5px_0_white,0.5px_0.5px_0_white]'>
                {computePoidhPoints(Number(joinedAmount), chain.currency)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function computePoidhPoints(paid: number, currency: Currency) {
  if (currency === 'degen') return paid / 500;
  else return paid * 1000;
}
