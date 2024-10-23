import { DynamicWidget, useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import {
  ArbitrumIcon,
  BaseIcon,
  DegenIcon,
} from '@/components/new/global/Icons';

interface nwProps {
  network: string;
  isClient: boolean;
}

const ConnectWallet = ({ network, isClient }: nwProps) => {
  const router = useRouter();
  const { walletConnector, isAuthenticated } = useDynamicContext();
  const [showNetwork, setShowNetwork] = useState(false);

  const switchNetwork = async ({
    chainId,
    chainPath,
  }: {
    chainId: number;
    chainPath: string;
  }) => {
    await walletConnector?.switchNetwork({ networkChainId: chainId });
    router.push(`/new/${chainPath}`);
  };

  const handleClick = () => {
    setShowNetwork(!showNetwork);
  };

  return (
    <>
      <div className='flex flex-row gap-1'>
        {isClient && isAuthenticated && (
          <div
            onClick={handleClick}
            className='rounded-[5px] cursor-pointer relative flex flex-col items-center justify-center bg-blur-white'
          >
            <span className='p-2 pointer'>network: {network}</span>
            <div
              className={`${
                !showNetwork
                  ? 'opacity-0 h-[0px] pointer-events-none '
                  : 'opacity-1 '
              } z-20 flex absolute top-[55px] left-0 bg-blur-white  rounded-[5px] flex-col w-full p-2  gap-2`}
            >
              <button
                className='flex  justify-between gap-2 flex-row'
                onClick={() =>
                  switchNetwork({ chainId: 42161, chainPath: 'arbitrum' })
                }
              >
                arbitrum
                <ArbitrumIcon width={20} height={20} />
              </button>
              <button
                className='flex  justify-between gap-2 flex-row'
                onClick={() =>
                  switchNetwork({ chainId: 666666666, chainPath: 'degen' })
                }
              >
                degen
                <DegenIcon width={20} height={20} />
              </button>
              <button
                className='flex  justify-between gap-2 flex-row'
                onClick={() =>
                  switchNetwork({ chainId: 8453, chainPath: 'base' })
                }
              >
                base
                <BaseIcon width={20} height={20} />
              </button>
            </div>
          </div>
        )}

        <div className='flex flex-col z-10'>
          <DynamicWidget
            innerButtonComponent={<div>connect</div>}
            variant='modal'
          />
        </div>
      </div>
    </>
  );
};

export default ConnectWallet;
