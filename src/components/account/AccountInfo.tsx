'use client';

import { useEffect, useState } from 'react';
import { formatEther } from 'viem';

import { useGetChain } from '@/hooks/useGetChain';
import BountyList from '@/components/ui/BountyList';
import { trpc } from '@/trpc/client';
import { cn } from '@/utils';
import { formatWalletAddress } from '@/utils/web3';
import FilterButton from '@/components/ui/FilterButton';
import NftList from '../nft/NftList';
import ClaimsListAccount from '../claim/ClaimListAccount';

type Section = 'nfts' | 'bounties' | 'claims';

export default function AccountInfo({ address }: { address: string }) {
  const chain = useGetChain();
  const bounties = trpc.userBounties.useQuery(
    {
      address,
      chainId: chain.id,
    },
    {
      enabled: !!address,
    }
  );
  const claims = trpc.userClaims.useQuery(
    {
      address,
      chainId: chain.id,
    },
    {
      enabled: !!address,
    }
  );
  const NFTs = trpc.userNFTs.useQuery(
    {
      address,
      chainId: chain.id,
    },
    {
      enabled: !!address,
    }
  );

  const [currentSection, setCurrentSection] = useState<Section>('nfts');

  const [ETHinContract, setETHinContract] = useState<string>('0');
  const [totalETHPaid, setTotalETHPaid] = useState<string>('0');
  const [totalETHEarn, setTotalETHEarn] = useState<string>('0');
  const [poidhScore, setPoidhScore] = useState<number>(0);

  useEffect(() => {
    let totalAmount = BigInt(0);
    bounties.data
      ?.filter((bounty) => !bounty.inProgress)
      .forEach((bounty) => {
        totalAmount += BigInt(bounty.amount);
      });
    setTotalETHPaid(formatEther(totalAmount));
    totalAmount = BigInt(0);
    bounties.data
      ?.filter((bounty) => bounty.inProgress)
      .forEach((bounty) => {
        totalAmount += BigInt(bounty.amount);
      });
    setETHinContract(formatEther(totalAmount));
  }, [bounties]);

  useEffect(() => {
    const totalAmount =
      claims.data
        ?.filter((claim) => claim.is_accepted)
        .flatMap((claim) => claim.bounty!.amount)
        .reduce((prev, curr) => BigInt(prev) + BigInt(curr), BigInt(0)) ||
      BigInt(0);
    setTotalETHEarn(formatEther(totalAmount));
  }, [claims]);

  useEffect(() => {
    const poidhScore =
      Number(totalETHEarn) * 1000 +
      Number(totalETHPaid) * 1000 +
      (NFTs.data?.length ?? 0) * 10;
    setPoidhScore(Number(poidhScore.toFixed(2)));
  }, [totalETHEarn, totalETHPaid, NFTs]);

  return (
    <>
      {address && (
        <div>
          <div className='flex flex-col lg:flex-row lg:justify-between lg:items-start p-8'>
            <div>
              <div className='flex flex-col border-b border-dashed'>
                <span>user</span>
                <span className='text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl'>
                  {formatWalletAddress(address)}
                </span>
              </div>
              <div className='flex flex-col'>
                <div>
                  completed bounties:{' '}
                  <span className='font-bold'> {NFTs.data?.length ?? 0}</span>
                </div>
                <div>
                  total {chain.currency} paid:{' '}
                  <span className='font-bold'>{totalETHPaid}</span>{' '}
                </div>
                <div>
                  in progress bounties:{' '}
                  <span className='font-bold'>
                    {bounties.data?.length ?? 0}
                  </span>{' '}
                </div>
                <div>
                  total {chain.currency} in contract:{' '}
                  <span className='font-bold'>{ETHinContract}</span>{' '}
                </div>
                <div>
                  completed claims:{' '}
                  <span className='font-bold'>
                    {claims.data?.filter((claim) => claim.is_accepted).length ??
                      0}
                  </span>
                </div>
                <div>
                  total {chain.currency} earned:{' '}
                  <span className='font-bold'>{totalETHEarn}</span>
                </div>
              </div>
            </div>
            <div className='flex flex-col '>
              <span>poidh score:</span>
              <span className='text-4xl text-poihRed border-y border-dashed'>
                {poidhScore}
              </span>
            </div>
          </div>

          <div className='flex flex-row overflow-x-scroll items-center py-6 border-b border-white justify-center gap-x-5 w-full px-3'>
            <div
              id='btn-container'
              className={cn(
                'flex flex-nowrap border border-white rounded-full transition-all bg-gradient-to-r h-[42px] gap-2 md:gap-4 md:text-base sm:text-sm text-xs',
                currentSection == 'nfts' && 'from-red-500 to-40%',
                currentSection == 'bounties' &&
                  'via-red-500 from-transparent to-transparent from-[23.33%] to-[76.66%]',
                currentSection == 'claims' &&
                  'from-transparent from-60% to-red-500'
              )}
            >
              <button
                onClick={() => setCurrentSection('nfts')}
                className='flex-grow sm:flex-grow-0 md:px-5 px-3 h-full flex items-center justify-center'
              >
                NFTs({NFTs.data?.length ?? 0})
              </button>
              <button
                onClick={() => setCurrentSection('bounties')}
                className='flex-grow sm:flex-grow-0 md:px-5 px-3 h-full flex items-center justify-center'
              >
                bounties ({bounties.data?.length ?? 0})
              </button>
              <button
                onClick={() => setCurrentSection('claims')}
                className='flex-grow sm:flex-grow-0 md:px-5 px-3 h-full flex items-center justify-center'
              >
                claims ({claims.data?.length ?? 0})
              </button>
            </div>
          </div>

          <div>
            {currentSection === 'nfts' && (
              <div className='lg:px-20 px-8'>
                <NftList NFTs={NFTs.data ?? []} />
              </div>
            )}
            {currentSection === 'bounties' && (
              <BountyList bounties={bounties.data ?? []} />
            )}
            {currentSection === 'claims' && (
              <div className='lg:px-20 px-8'>
                <ClaimsListAccount
                  claims={
                    claims.data?.map((claim) => {
                      return {
                        id: claim.id.toString(),
                        title: claim.title,
                        description: claim.description,
                        issuer: claim.issuer,
                        bountyId: claim.bounty!.id.toString(),
                        accepted: claim.is_accepted || false,
                        url: claim.url,
                      };
                    }) ?? []
                  }
                />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
