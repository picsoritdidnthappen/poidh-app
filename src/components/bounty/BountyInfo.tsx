import { toast } from 'react-toastify';
import { useChainInfo } from '@/hooks/useChainInfo';
import BountyMultiplayer from '@/components/bounty/BountyMultiplayer';
import { trpc, trpcClient } from '@/trpc/client';
import {
  useAccount,
  useSignMessage,
  useSwitchChain,
  useWriteContract,
} from 'wagmi';
import { useMutation } from '@tanstack/react-query';
import { formatEther } from 'viem';
import abi from '@/constant/abi/abi';
import { isV3Bounty } from '@/utils/utils';
import { cn } from '@/utils/utils';
import { formatAmount, getBanSignatureFirstLine } from '@/utils/utils';
import DisplayAddress from '@/components/global/DisplayAddress';
import CopyAddressButton from '@/components/global/CopyAddressButton';
import BountyHistory from './BountyHistory';
import Withdraw from './Withdraw';
import ClaimRefund from './ClaimRefund';
import JoinBounty from './JoinBounty';
import { useSetAtom } from 'jotai';
import { setLoadingAtom } from '@/store/loading';
import MarkdownContent from '@/components/global/MarkdownContent';
import SocialMediaLinks from '@/components/global/SocialMediaLinks';
import ShareBountyModal from '@/components/bounty/ShareBountyModal';
import { ArrowIcon, QuestionIcon } from '@/components/global/Icons';
import Link from 'next/link';
import HowItWorksModal from '@/components/bounty/HowItWorksModal';
import DynamicChainIcon from '@/components/global/DynamicChainIcon';
import { useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export default function BountyInfo({
  bountyId,
  isShareModalOpen,
  isHowItWorksModalOpen,
  onShareModalStateChange,
  onHowItWorksModalStateChange,
}: {
  bountyId: number;
  isShareModalOpen: boolean;
  isHowItWorksModalOpen: boolean;
  onShareModalStateChange?: (modalOpen: boolean) => void;
  onHowItWorksModalStateChange?: (modalOpen: boolean) => void;
}) {
  const chain = useChainInfo();
  const account = useAccount();
  const writeContract = useWriteContract({});
  const switctChain = useSwitchChain();
  const isAdmin = trpc.admin.isAdmin.useQuery({ address: account.address });
  const banBountyMutation = trpc.admin.banBounty.useMutation({});
  const { signMessageAsync } = useSignMessage();
  const setLoading = useSetAtom(setLoadingAtom);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isIndexing = searchParams.get('indexing') === 'true';

  const price =
    trpc.web3.fetchPrice.useQuery({ currency: chain.currency }).data ?? 0;

  const bounty = trpc.bounties.fetch.useQuery(
    {
      id: bountyId,
      chainId: chain.id,
    },
    {
      enabled: !isNaN(bountyId),
      // While the freshly-created bounty is still being indexed by the
      // backend, keep polling until the row appears.
      refetchInterval: isIndexing ? 1500 : false,
    }
  );

  // Show "Indexing..." loading bar after bounty creation redirects here.
  // Clear it (and strip the URL flag) once the bounty data is available.
  useEffect(() => {
    if (!isIndexing) return;
    if (!bounty.data) {
      setLoading({ isLoading: true, status: 'Indexing...' });
      return;
    }
    setLoading({ isLoading: false, status: '' });
    const params = new URLSearchParams(searchParams.toString());
    params.delete('indexing');
    router.replace(
      params.toString() ? `${pathname}?${params.toString()}` : pathname,
      { scroll: false }
    );
  }, [isIndexing, bounty.data, searchParams, router, pathname, setLoading]);

  const participants = trpc.bounties.participations.useQuery(
    {
      bountyId: bountyId,
      chainId: chain.id,
    },
    {
      enabled: !isNaN(bountyId),
    }
  );

  const transactions = trpc.bounties.fetchTransactions.useQuery({
    bountyId,
    chainId: chain.id,
  });

  const signMutation = useMutation({
    mutationFn: async () => {
      if (!bounty.data) {
        throw new Error('Bounty data not found!');
      }

      //arbitrum has a problem with message signing, so all confirmations are on base
      const chainId = await account.connector?.getChainId();
      if (chainId !== 8453) {
        await switctChain.switchChainAsync({ chainId: 8453 });
      }

      const message =
        getBanSignatureFirstLine({
          id: Number(bounty.data.id),
          chainId: bounty.data.chainId,
          type: 'bounty',
        }) + JSON.stringify(bounty.data, undefined, 2);
      if (account.address) {
        const signature = await signMessageAsync({ message }).catch(() => null);
        if (!signature) {
          throw new Error('Failed to sign message');
        }
        await banBountyMutation.mutateAsync({
          id: Number(bounty.data.id),
          chainId: bounty.data.chainId,
          address: account.address,
          chainName: chain.slug,
          message,
          signature,
        });
      }
    },
    onSuccess: () => {
      toast.success('Bounty banned');
    },
    onError: (error) => {
      toast.error('Failed to ban bounty: ' + error.message);
    },
    onSettled: () => {
      bounty.refetch();
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!bounty.data) {
        throw new Error('Bounty data not found!');
      }

      const chainId = await account.connector?.getChainId();
      if (chain.id !== chainId) {
        setLoading({ isLoading: true, status: 'Switching network...' });
        await switctChain.switchChainAsync({ chainId: chain.id });
      }

      if (!bounty.data) {
        throw new Error('Bounty data not found');
      }

      setLoading({ isLoading: true, status: 'Waiting approval' });
      await writeContract.writeContractAsync({
        abi,
        address: chain.contracts.mainContract as `0x${string}`,
        functionName: bounty.data.isMultiplayer
          ? 'cancelOpenBounty'
          : 'cancelSoloBounty',
        args: [BigInt(bounty.data.onChainId)],
        chainId: chain.id,
      });

      for (let i = 0; i < 60; i++) {
        setLoading({ isLoading: true, status: `Indexing ${i}s...` });
        const canceled = await trpcClient.bounties.isCanceled.query({
          id: Number(bounty.data.id),
          chainId: chain.id,
        });
        if (canceled) {
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 1_000));
      }
      throw new Error('Failed to cancel bounty');
    },
    onSuccess: () => {
      setLoading({ isLoading: false });
      toast.success('Bounty canceled');
    },
    onError: (error) => {
      setLoading({ isLoading: false });
      toast.error('Failed to cancel bounty: ' + error.message);
    },
    onSettled: () => {
      bounty.refetch();
    },
  });

  const isCurrentUserAParticipant = participants.data?.some(
    (participant) =>
      participant.userAddress.toLocaleLowerCase() ===
      account.address?.toLocaleLowerCase()
  );

  const canWithdraw =
    account.address?.toLocaleLowerCase() !==
      bounty.data?.issuer.toLocaleLowerCase() &&
    !bounty.data?.isVoting &&
    isCurrentUserAParticipant;

  const hasClaimedRefund = trpc.accounts.hasClaimedRefund.useQuery(
    {
      bountyId,
      chainId: chain.id,
      address: account.address as `0x${string}`,
    },
    {
      enabled:
        !isNaN(bountyId) && !!account.address && !!isCurrentUserAParticipant,
    }
  );

  const canClaimRefund =
    bounty.data?.isCanceled &&
    bounty.data?.isMultiplayer &&
    isCurrentUserAParticipant &&
    !hasClaimedRefund.data &&
    isV3Bounty(chain.id, bounty.data?.id) &&
    account.address?.toLowerCase() !== bounty.data?.issuer.toLowerCase();

  if (!bounty.data) {
    return null;
  }

  return (
    <>
      <div className='flex pt-6 flex-col justify-between lg:flex-row'>
        <div className='flex flex-col  lg:w-[50%]'>
          <p className='max-w-[30ch] overflow-hidden text-ellipsis text-2xl lg:text-4xl text-bold normal-case break-words'>
            {bounty.data.title}
          </p>
          <div className='mt-5 normal-case break-words'>
            <MarkdownContent>{bounty.data.description}</MarkdownContent>
          </div>
          <div className='flex flex-row mt-5 mb-4 normal-case break-all flex-wrap'>
            bounty issuer:&nbsp;
            <div className='flex flex-row  items-center justify-end overflow-hidden'>
              <DisplayAddress address={bounty.data.issuer} />
              <div className='ml-2 mr-2'>
                <CopyAddressButton address={bounty.data.issuer} />
              </div>
              <SocialMediaLinks address={bounty.data.issuer} />
            </div>
          </div>
          {isAdmin.data && (
            <button
              onClick={() => {
                if (isAdmin.data) {
                  signMutation.mutate();
                } else {
                  toast.error('You are not an admin');
                }
              }}
              disabled={bounty.data.ban.length > 0 || false}
              className={cn(
                'border border-poidhRed w-fit rounded-md py-2 px-5 mt-5',
                bounty.data.ban.length > 0
                  ? 'bg-red-400 text-white'
                  : 'hover:bg-red-400 hover:text-white'
              )}
            >
              {bounty.data.ban.length > 0 ? 'banned' : 'ban'}
            </button>
          )}
          {bounty.data?.extra?.album && (
            <p className='text-white mb-3'>
              📸{' '}
              <Link
                href={`${window.location.origin}/a/${bounty.data.extra.album}`}
                className='underline hover:opacity-80 cursor-pointer'
              >
                {bounty.data.extra.album}
              </Link>
            </p>
          )}
          <div className='text-lg mb-5 mt-1 font-bold flex items-center gap-2'>
            {formatAmount({
              amount: formatEther(BigInt(bounty.data.amount)),
              currency: chain.currency,
              price: price.toString(),
            })}{' '}
            <DynamicChainIcon
              chain={chain.slug}
              size={chain.slug === 'base' ? 18 : 24}
            />
          </div>
        </div>
        <div className='flex flex-col space-between'>
          {bounty.data.inProgress ? (
            account.address?.toLocaleLowerCase() ===
              bounty.data.issuer.toLocaleLowerCase() &&
            !bounty.data.isVoting &&
            isV3Bounty(chain.id, bounty.data.id) && (
              <button
                onClick={() => cancelMutation.mutate()}
                disabled={!bounty.data.inProgress}
                className='border border-poidhRed rounded-md w-fit py-2 px-5 mt-5 hover:bg-red-400 hover:text-white'
              >
                cancel
              </button>
            )
          ) : (
            <span className='border border-poidhRed w-fit rounded-md py-2 px-5 mt-5 bg-poidhRed text-white'>
              {bounty.data.isCanceled ? 'canceled' : 'accepted'}
            </span>
          )}
        </div>
      </div>
      {bounty.data.isMultiplayer && (
        <BountyMultiplayer chain={chain} bountyId={bountyId} />
      )}
      <BountyHistory
        transactions={(transactions.data ?? []).map((transaction) => {
          return { ...transaction, timestamp: Number(transaction.timestamp) };
        })}
      />
      <div className='flex flex-wrap items-center gap-4 my-8'>
        <div className='flex items-center gap-4'>
          {canClaimRefund && (
            <ClaimRefund
              id={bounty.data.id}
              onChainId={bounty.data.onChainId}
            />
          )}
          {bounty.data.isMultiplayer &&
            bounty.data.inProgress &&
            (canWithdraw ? (
              <Withdraw id={bounty.data.id} onChainId={bounty.data.onChainId} />
            ) : (
              !bounty.data.isVoting && <JoinBounty bountyId={bountyId} />
            ))}
          <button
            type='button'
            onClick={() => onShareModalStateChange?.(true)}
            className='flex items-center gap-1 underline hover:no-underline w-fit'
          >
            share bounty <ArrowIcon size={16} />
          </button>
        </div>
      </div>
      <div className='my-6'>
        <button
          type='button'
          onClick={() => onHowItWorksModalStateChange?.(true)}
          className='flex items-center gap-1 underline hover:no-underline w-fit'
        >
          how it works <QuestionIcon size={22} />
        </button>
      </div>
      {isShareModalOpen && (
        <ShareBountyModal
          onClose={() => {
            onShareModalStateChange?.(false);
          }}
          bountyIssuerAddress={bounty.data.issuer}
        />
      )}
      {isHowItWorksModalOpen && (
        <HowItWorksModal
          onClose={() => onHowItWorksModalStateChange?.(false)}
        />
      )}
    </>
  );
}
