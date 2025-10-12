import GameButton, { PlainGameButton } from '@/components/global/GameButton';
import { useState } from 'react';
import { useAccount } from 'wagmi';
import FormBounty from '../bounty/FormBounty';
import FormClaim from '../claims/FormClaim';
import { useConnectModal } from '@rainbow-me/rainbowkit';

export default function NavBarMobile({
  type,
  bountyId,
  prefilledAlbum,
  showChainSelector = false,
}: {
  type: 'claim' | 'bounty';
  bountyId?: string;
  prefilledAlbum?: string;
  showChainSelector?: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const account = useAccount();
  const { openConnectModal } = useConnectModal();

  return (
    <>
      <nav
        className='fixed bottom-0 left-0 right-0 h-14 flex items-center justify-between px-8 z-50 how-it-works-hidden'
        onClick={(e) => {
          e.stopPropagation();
          if (account.address) {
            setShowForm(true);
            return;
          }
          openConnectModal?.();
        }}
      >
        <div
          className='absolute inset-0 rounded-t-2xl bg-blue-300/80'
          style={{
            WebkitMask:
              'radial-gradient(circle at center 5px, transparent 60px, white 60px)',
            mask: 'radial-gradient(circle at center 5px, transparent 60px, white 60px)',
          }}
        />

        <p className='text-white font-semibold z-10 text-xl'>create</p>

        <div className='w-[157px] h-[157px] -mt-8 relative z-10'>
          <div className='bg-transparent rounded-full'>
            <div className={type === 'claim' ? 'mr-2' : ''}>
              {showForm ? (
                <PlainGameButton />
              ) : (
                <div className='button'>
                  <GameButton />
                </div>
              )}
            </div>
          </div>
        </div>

        <p className='text-white font-semibold z-10 text-xl'>{type}</p>
      </nav>

      {type === 'bounty' ? (
        <FormBounty
          open={showForm}
          onClose={() => setShowForm(false)}
          prefilledAlbum={prefilledAlbum}
          showChainSelector={showChainSelector}
        />
      ) : (
        bountyId && (
          <FormClaim
            bountyId={bountyId}
            open={showForm}
            onClose={() => setShowForm(false)}
          />
        )
      )}
    </>
  );
}
