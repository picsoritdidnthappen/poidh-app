'use client';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { ethers } from 'ethers';
import { UsersRound } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useEffect, useState } from 'react';

import Button from '@/components/ui/Button';

interface BountyItemProps {
  id: string;
  title: string;
  description: string;
  amount: string | number | bigint;
  isMultiplayer: boolean;
}

const BountyItem: React.FC<BountyItemProps> = ({
  id,
  title,
  description,
  amount,
  isMultiplayer,
}) => {
  const shortDescription =
    description.length > 50
      ? `${description.substring(0, 50)}...`
      : description;
  const amountETH = ethers.formatEther(amount);
  const { network, networkConfigurations, walletConnector } =
    useDynamicContext();
  const [currentNetwork, setCurrentNetwork] = useState(network);
  const [currentNetworkName, setCurrentNetworkName] = useState('');
  const [isClient, setIsClient] = useState(false);

  const path = usePathname();

  useEffect(() => {
    setIsClient(true);
    const currentUrl = path.split('/')[1];
    if (currentUrl === '') {
      setCurrentNetworkName('base');
    } else {
      setCurrentNetworkName(currentUrl);
    }
  }, []);

  useEffect(() => {
    if (isClient && network && networkConfigurations) {
      const currentUrl = path.split('/')[1];
      const currentUrlNetwork = networkConfigurations['evm']?.find((net) =>
        net.name.toLowerCase().match(currentUrl)
      );

      let currentBountyNetwork = currentUrlNetwork?.name.toLowerCase();
      if (currentBountyNetwork === 'degen chain') {
        currentBountyNetwork = 'degen';
      }

      if (currentBountyNetwork) {
        setCurrentNetwork(network);
      }
    }
  }, [
    isClient,
    network,
    networkConfigurations,
    path,
    walletConnector,
    currentNetwork,
  ]);

  return (
    <>
      <div className='relative p-[2px] h-full  rounded-xl'>
        <div className='p-5 flex flex-col justify-between relative z-20 h-full lg:col-span-4'>
          <div className='z-[-1] absolute w-full h-full left-0 top-0 borderBox rounded-[6px]  bg-whiteblue '></div>
          <h3 className='normal-case'>{title}</h3>
          <p className='my-5 break-all normal-case'>{shortDescription}</p>

          <div className='flex items-end justify-between mt-5'>
            <div className='flex gap-2 items-center'>
              <div>
                {Number(amountETH)}{' '}
                {currentNetworkName === 'base' ||
                currentNetworkName === 'arbitrum'
                  ? 'eth'
                  : 'degen'}
              </div>
              {isMultiplayer && (
                <div>
                  <UsersRound />
                </div>
              )}
            </div>
            <Button>
              <Link href={`/${currentNetworkName}/bounty/${id}`}>
                see bounty
              </Link>
            </Button>
          </div>
        </div>
        <div className='z-10 bg-gradient rounded-[8px] h-full w-full absolute top-0 right-0 bottom-0 left-0'></div>
      </div>
    </>
  );
};

export default BountyItem;
