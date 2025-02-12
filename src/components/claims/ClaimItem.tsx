import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useGetChain } from '@/hooks/useGetChain';
import { trpc, trpcClient } from '@/trpc/client';
import { useAccount, useSwitchChain, useWriteContract } from 'wagmi';
import abi from '@/constant/abi/abi';
import { useMutation } from '@tanstack/react-query';
import Loading from '@/components/global/Loading';
import DisplayAddress from '../global/DisplayAddress';
import CopyAddressButton from '../global/CopyAddressButton';
import ClaimCard from './ClaimCard';

export default function ClaimItem({
  id,
  title,
  description,
  issuer,
  bountyId,
  accepted,
  url,
  isVotingOrAcceptedBounty,
}: {
  id: string;
  title: string;
  description: string;
  issuer: string;
  bountyId: string;
  accepted: boolean;
  url: string;
  isVotingOrAcceptedBounty: boolean;
}) {
  const account = useAccount();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const chain = useGetChain();
  const writeContract = useWriteContract({});
  const switctChain = useSwitchChain();
  const utils = trpc.useUtils();
  const [openCard, setOpenCard] = useState<boolean>(false);

  const accountStats = trpc.accountInfo.useQuery({
    address: issuer,
    chainId: chain.id,
  });

  const [status, setStatus] = useState<string>('');

  const bounty = trpc.bounty.useQuery(
    {
      id: Number(bountyId),
      chainId: chain.id,
    },
    {
      enabled: !!bountyId,
    }
  );

  const fetchImageUrl = async (url: string) => {
    const response = await fetch(url);
    const data = await response.json();
    setImageUrl(data.image);
  };

  useEffect(() => {
    fetchImageUrl(url);
  }, [url]);

  const acceptClaimMutation = useMutation({
    mutationFn: async ({
      bountyId,
      claimId,
    }: {
      bountyId: bigint;
      claimId: bigint;
    }) => {
      const chainId = await account.connector?.getChainId();
      if (chain.id !== chainId) {
        await switctChain.switchChainAsync({ chainId: chain.id });
      }
      setStatus('Waiting approval');
      await writeContract.writeContractAsync({
        abi,
        address: chain.contracts.mainContract as `0x${string}`,
        functionName: 'acceptClaim',
        args: [bountyId, claimId],
        chainId: chain.id,
      });

      for (let i = 0; i < 60; i++) {
        setStatus('Indexing ' + i + 's');
        const accepted = await trpcClient.isAcceptedClaim.query({
          id: Number(claimId),
          chainId: chain.id,
        });
        if (accepted) {
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 1_000));
      }

      throw new Error('Failed to accept claim');
    },

    onSuccess: () => {
      toast.success('Claim accepted');
    },
    onError: (error) => {
      toast.error('Failed to accept claim:' + error.message);
    },
    onSettled: () => {
      utils.bountyClaims.refetch();
      setStatus('');
    },
  });

  const submitForVoteMutation = useMutation({
    mutationFn: async ({
      bountyId,
      claimId,
    }: {
      bountyId: bigint;
      claimId: bigint;
    }) => {
      const chainId = await account.connector?.getChainId();
      if (chain.id !== chainId) {
        await switctChain.switchChainAsync({ chainId: chain.id });
      }
      setStatus('Waiting approval');
      await writeContract.writeContractAsync({
        abi,
        address: chain.contracts.mainContract as `0x${string}`,
        functionName: 'submitClaimForVote',
        args: [bountyId, claimId],
        chainId: chain.id,
      });
    },
    onSuccess: () => {
      toast.success('Claim submitted for vote successfully');
      window.location.reload();
    },
    onError: (error) => {
      toast.error('Failed to submit claim for vote: ' + error.message);
    },
    onSettled: () => {
      setStatus('');
    },
  });

  return (
    <>
      <Loading
        open={acceptClaimMutation.isPending || submitForVoteMutation.isPending}
        status={status}
      />
      <ClaimCard
        claim={{
          id,
          description,
          imageUrl,
          title,
          currency: chain.currency,
          issuer: {
            completedClaims: accountStats.data?.acceptedClaimsCount ?? 0,
            address: issuer,
            earnedAmount: accountStats.data?.totalEarn.amountCrypto ?? 0,
            scorePoidh: accountStats.data?.poidhScore ?? 0,
          },
          bountyId,
        }}
        onClose={() => setOpenCard(false)}
        open={openCard}
      />
      <div className='p-[2px] text-white relative bg-poidhRed border-poidhRed border-2 rounded-xl '>
        <div className='left-5 top-5 absolute  flex flex-col text-white'>
          {bounty.data &&
            bounty.data.inProgress &&
            account.address?.toLocaleLowerCase() ===
              bounty.data.issuer.toLocaleLowerCase() &&
            !isVotingOrAcceptedBounty && (
              <button
                className='cursor-pointer mt-5 text-white hover:bg-poidhRed bg-poidhRed bg-opacity-30 border border-poidhRed rounded-[8px] py-2 px-5'
                onClick={() => {
                  bounty.data.participations.length > 1
                    ? submitForVoteMutation.mutate({
                        bountyId: BigInt(bountyId),
                        claimId: BigInt(id),
                      })
                    : acceptClaimMutation.mutate({
                        bountyId: BigInt(bountyId),
                        claimId: BigInt(id),
                      });
                }}
              >
                {bounty.data.participations.length > 1
                  ? 'submit for vote'
                  : 'accept'}
              </button>
            )}
        </div>

        {accepted && (
          <div className='left-5 top-5 text-white bg-poidhRed border border-poidhRed rounded-[8px] py-2 px-5 absolute'>
            accepted
          </div>
        )}
        <div
          style={{ backgroundImage: `url(${imageUrl})` }}
          className='bg-[#12AAFF] bg-cover bg-center w-full aspect-w-1 aspect-h-1 rounded-[8px] overflow-hidden'
          onClick={() => setOpenCard(true)}
        />
        <div className='p-3'>
          <div className='flex flex-col'>
            <p className='normal-case text-nowrap overflow-ellipsis overflow-hidden break-words'>
              {title}
            </p>
            <p className='normal-case w-full h-20 overflow-y-auto overflow-x-hidden overflow-hidden break-words'>
              {description}
            </p>
          </div>
          <div className='mt-2 py-2 flex flex-row items-center text-sm border-t border-dashed'>
            <span className='shrink-0 mr-2'>issuer&nbsp;</span>
            <div className='flex flex-row  items-center w-full justify-end overflow-hidden'>
              <DisplayAddress chain={chain} address={issuer} />
              <div className='ml-2'>
                <CopyAddressButton address={issuer} />
              </div>
            </div>
          </div>
          <div>claim id: {id}</div>
        </div>
      </div>
    </>
  );
}
