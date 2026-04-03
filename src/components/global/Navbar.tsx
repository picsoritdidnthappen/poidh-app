import GameButton, { PlainGameButton } from '@/components/global/GameButton';
import { useState } from 'react';
import { useAccount } from 'wagmi';
import FormBounty from '../bounty/FormBounty';
import FormClaim from '../claims/FormClaim';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useChainInfo } from '@/hooks/useChainInfo';
import { trpc } from '@/trpc/client';
import { useScreenSize } from '@/hooks/useScreenSize';
import ButtonCTA from './ButtonCTA';
import {
  ProfileIcon,
  LeaderboardIcon,
  ImageIcon,
  MagnifyingGlassIcon,
} from '@/components/global/Icons';
import Link from 'next/link';
import { toast } from 'react-toastify';

export default function Navbar({
  type,
  bountyId,
}: {
  type: 'claim' | 'bounty';
  bountyId?: string;
}) {
  const [showForm, setShowForm] = useState(false);
  const account = useAccount();
  const { openConnectModal } = useConnectModal();
  const chain = useChainInfo();
  const isMobile = useScreenSize();

  const user = trpc.users.fetchByAddress.useQuery(
    { address: account.address as `0x${string}` },
    {
      enabled: !!account.address,
    }
  );

  const bounty = trpc.bounties.fetch.useQuery(
    {
      id: Number(bountyId),
      chainId: chain.id,
    },
    {
      enabled: type === 'claim' && !!bountyId,
    }
  );

  const handleClick = () => {
    if (type === 'claim' && !bounty.data?.inProgress) {
      toast.error(
        'this bounty is now finalized, claims can no longer be submitted'
      );
      return;
    }

    if (account.address) {
      setShowForm(true);
      return;
    }
    openConnectModal?.();
  };

  if (isMobile) {
    return (
      <>
        <nav className='fixed bottom-0 left-0 right-0 h-20 z-40 how-it-works-hidden shadow-[0_4px_24px_0_rgba(80,160,220,0.14)] android:pb-10 pb-4'>
          <div className='absolute inset-0 rounded-t-3xl bg-gradient-to-b from-[#7db3e0] to-[#b3d8f7] dark:from-[#0d1b2e] dark:to-[#132b47] backdrop-blur-sm' />

          <div className='relative h-full flex items-center justify-between pt-2'>
            <Link
              href={account.address ? `/account/${account.address}` : '#'}
              onClick={(e) => {
                if (!account.address) {
                  e.preventDefault();
                  openConnectModal?.();
                }
              }}
              className='flex flex-col items-center justify-center gap-1 text-white z-10 w-16'
            >
              <div className='relative'>
                <ProfileIcon size={24} />
                {((user?.data?.withdrawalArbitrum ?? 0) > 0 ||
                  (user?.data?.withdrawalBase ?? 0) > 0 ||
                  (user?.data?.withdrawalDegen ?? 0) > 0) && (
                  <div className='absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full ring-1 ring-white' />
                )}
              </div>
              <span className='text-[10px] whitespace-nowrap'>profile</span>
            </Link>

            <Link
              href={`/leaderboard`}
              className='flex flex-col items-center justify-center gap-1 text-white z-10 w-16'
            >
              <LeaderboardIcon size={24} />
              <span className='text-[10px] whitespace-nowrap'>scores</span>
            </Link>

            <div className='relative flex flex-col items-center justify-center gap-1 z-20 w-24'>
              <div
                onClick={handleClick}
                className='cursor-pointer scale-75 -mt-16'
              >
                <div className='relative w-[88px] h-[88px] flex items-center justify-center mx-auto'>
                  <div className='absolute inset-0 rounded-full ring-[5px] ring-white/40' />
                  {showForm ? (
                    <PlainGameButton hideShadow={true} />
                  ) : (
                    <div className='button'>
                      <GameButton hideShadow={true} />
                    </div>
                  )}
                </div>
              </div>

              <span className='text-[10px] whitespace-nowrap text-white'>
                create {type}
              </span>
            </div>

            <Link
              href={`/feed`}
              className='flex flex-col items-center justify-center gap-1 text-white z-10 w-16'
            >
              <ImageIcon size={24} />
              <span className='text-[10px] whitespace-nowrap'>feed</span>
            </Link>

            <Link
              href='/explore'
              className='flex flex-col items-center justify-center gap-1 text-white z-10 w-16'
            >
              <MagnifyingGlassIcon size={24} />
              <span className='text-[10px] whitespace-nowrap'>explore</span>
            </Link>
          </div>
        </nav>

        {type === 'bounty' ? (
          <FormBounty open={showForm} onClose={() => setShowForm(false)} />
        ) : (
          bounty.data && (
            <FormClaim
              bountyId={bounty.data.id}
              onChainBountyId={bounty.data.onChainId}
              open={showForm}
              onClose={() => setShowForm(false)}
            />
          )
        )}
      </>
    );
  }

  // Desktop view
  return (
    <div className='fixed bottom-8 z-40 w-full flex justify-center items-center lg:flex-col how-it-works-hidden'>
      {!showForm && (
        <div
          className='absolute button -bottom-3 flex cursor-pointer flex-col items-center justify-center'
          onClick={handleClick}
        >
          <GameButton />
          <ButtonCTA>create {type}</ButtonCTA>
        </div>
      )}
      {type === 'bounty' ? (
        <FormBounty open={showForm} onClose={() => setShowForm(false)} />
      ) : (
        bounty.data && (
          <FormClaim
            bountyId={bounty.data.id}
            onChainBountyId={bounty.data.onChainId}
            open={showForm}
            onClose={() => setShowForm(false)}
          />
        )
      )}
    </div>
  );
}
