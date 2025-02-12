import GameButton, { PlainGameButton } from '@/components/global/GameButton';
import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { useAccount } from 'wagmi';
import FormBounty from '../bounty/FormBounty';
import FormClaim from '../claims/FormClaim';

export default function NavBarMobile({
  type,
  bountyId,
}: {
  type: 'claim' | 'bounty';
  bountyId?: string;
}) {
  const [showForm, setShowForm] = useState(false);
  const account = useAccount();
  return (
    <>
      <nav className='fixed bottom-0 left-0 right-0 h-14 flex items-center justify-between px-8 z-50'>
        <div
          className='absolute inset-0 rounded-t-2xl bg-blue-300/80'
          style={{
            WebkitMask:
              'radial-gradient(circle at center 5px, transparent 60px, white 60px)',
            mask: 'radial-gradient(circle at center 5px, transparent 60px, white 60px)',
          }}
        />

        <p className='text-white font-semibold z-10'>create</p>

        <div className='w-[157px] h-[157px] -mt-8 relative z-10'>
          <div
            className='bg-transparent rounded-full'
            onClick={() => {
              if (account.address) {
                setShowForm(true);
                return;
              }
              toast.error('Please connect your wallet');
            }}
          >
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

        <p className='text-white font-semibold z-10'>{type}</p>
      </nav>

      {type === 'bounty' ? (
        <FormBounty open={showForm} onClose={() => setShowForm(false)} />
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
