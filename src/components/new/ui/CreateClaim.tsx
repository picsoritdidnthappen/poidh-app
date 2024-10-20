import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

import FormClaim from '@/components/new/global/FormClaim';
import GameButton from '@/components/new/global/GameButton';
import ButtonCTA from '@/components/new/ui/ButtonCTA';

export default function CreateClaim({ bountyId }: { bountyId: string }) {
  const { primaryWallet } = useDynamicContext();

  const [showForm, setShowForm] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [deviceType, setDeviceType] = useState<'android' | 'ios' | 'laptop'>();

  let lastScrollY = 0;

  const handleOpenForm = () => {
    if (primaryWallet) {
      setShowForm(!showForm);
    } else {
      toast.error('Please connect wallet to continue');
    }
  };

  const controlButton = () => {
    if (deviceType === 'android' || deviceType === 'ios') {
      if (window.scrollY > lastScrollY) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      lastScrollY = window.scrollY;
    }
  };

  useEffect(() => {
    if (deviceType === 'android' || deviceType === 'ios') {
      window.addEventListener('scroll', controlButton);
      return () => {
        window.removeEventListener('scroll', controlButton);
      };
    }
  });

  useEffect(() => {
    const userAgent = navigator.userAgent;

    const isAndroid = userAgent.match(/Android/i);
    const isIOS = userAgent.match(/iPhone|iPad|iPod/i);

    if (isAndroid) {
      setDeviceType('android');
    } else if (isIOS) {
      setDeviceType('ios');
    } else {
      setDeviceType('laptop');
    }
  }, []);

  return (
    <div className='py-12 flex justify-center items-center lg:flex-col'>
      {(deviceType === 'laptop' || isVisible) && (
        <div
          className={`${
            !showForm ? '' : 'hidden'
          } fixed  bottom-12 left-1/2 -translate-x-1/2 lg:static lg:translate-x-0 z-20 flex flex-col items-center justify-center`}
          onClick={handleOpenForm}
        >
          <div className='button'>
            <GameButton />
          </div>
          <ButtonCTA> create claim </ButtonCTA>
        </div>
      )}

      {showForm && (
        <div className='absolute  z-40 w-[92%] md:w-auto top-24 left-1/2 -translate-x-1/2  '>
          <button
            onClick={() => setShowForm(!showForm)}
            className='right-0 absolute border border-[#D1ECFF] backdrop-blur-sm bg-white/30 rounded-full p-2'
          >
            <svg
              width='14'
              height='14'
              viewBox='0 0 14 14'
              fill='none'
              xmlns='http://www.w3.org/2000/svg'
            >
              <path
                d='M13 1L1 13M1 1L13 13'
                stroke='white'
                stroke-width='2'
                stroke-linecap='round'
                stroke-linejoin='round'
              />
            </svg>
          </button>
          <FormClaim bountyId={bountyId} />
        </div>
      )}
    </div>
  );
}
