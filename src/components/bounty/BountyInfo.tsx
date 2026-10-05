import { toast } from 'react-toastify';
import { toastError } from '@/utils/errors';
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

function BountyInfoHeaderSkeleton() {
  return (
    <div className='flex pt-6 flex-col justify-between lg:flex-row'>
      <div className='flex flex-col lg:w-[50%]'>
        <div className='h-10 lg:h-12 w-[80%] max-w-[420px] rounded-lg bg-white/10' />

        <div className='mt-5 space-y-3'>
          <div className='h-4 w-full rounded bg-white/10' />
          <div className='h-4 w-[92%] rounded bg-white/10' />
          <div className='h-4 w-[75%] rounded bg-white/10' />
          <div className='h-4 w-[85%] rounded bg-white/10' />
        </div>

        <div className='flex items-center mt-5 mb-4 gap-2'>
          <div className='h-4 w-24 rounded bg-white/10' />

          <div className='h-5 w-5 rounded-full bg-white/15' />

          <div className='h-4 w-28 rounded bg-white/10' />
        </div>

        <div className='flex items-center gap-3 mt-1 mb-5'>
          <div className='h-7 w-28 rounded bg-white/10' />
          <div className='h-5 w-20 rounded bg-white/10' />
        </div>
      </div>
    </div>
  );
}

function BountyInfoSkeleton() {
  return (
    <div className='animate-pulse'>
      <BountyInfoHeaderSkeleton />

      <div className='max-w-3xl h-[46px] md:h-[50px] border border-white/20 rounded-lg bg-[#D1ECFF]/10 mt-5' />

      <div className='flex items-center gap-4 my-8 h-6'>
        <div className='h-4 w-28 rounded bg-white/10' />
        <div className='h-4 w-28 rounded bg-white/10' />
      </div>
    </div>
  );
}

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
  const { signMessageAsync } = useSignMessage();
  const setLoading = useSetAtom(setLoadingAtom);

  const validBountyId = !isNaN(bountyId);

  const isAdmin = trpc.admin.isAdmin.useQuery(
    {
      address: account.address,
    },
    {
      enabled: !!account.address,
      staleTime: 5 * 60_000,
      refetchOnWindowFocus: false,
    }
  );

  const banBountyMutation = trpc.admin.banBounty.useMutation({});

  const priceQuery = trpc.web3.fetchPrice.useQuery(
    {
      currency: chain.currency,
    },
    {
      enabled: Boolean(chain.currency),
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    }
  );

  const price = priceQuery.data ?? 0;

  const bounty = trpc.bounties.fetch.useQuery(
    {
      id: bountyId,
      chainId: chain.id,
    },
    {
      enabled: validBountyId,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    }
  );

  const participants = trpc.bounties.participations.useQuery(
    {
      bountyId,
      chainId: chain.id,
    },
    {
      enabled: validBountyId,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    }
  );

  const transactions = trpc.bounties.fetchTransactions.useQuery(
    {
      bountyId,
      chainId: chain.id,
    },
    {
      enabled: validBountyId,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    }
  );

  const signMutation = useMutation({
    mutationFn: async () => {
      if (!bounty.data) {
        throw new Error('Bounty data not found!');
      }

      // arbitrum has a problem with message signing,
      // so all confirmations are on base
      const chainId = await account.connector?.getChainId();

      if (chainId !== 8453) {
        await switctChain.switchChainAsync({
          chainId: 8453,
        });
      }

      const message =
        getBanSignatureFirstLine({
          id: Number(bounty.data.id),
          chainId: bounty.data.chainId,
          type: 'bounty',
        }) + JSON.stringify(bounty.data, undefined, 2);

      if (account.address) {
        const signature = await signMessageAsync({
          message,
        }).catch(() => null);

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
      toastError('Failed to ban bounty', error);
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
        setLoading({
          isLoading: true,
          status: 'Switching network...',
        });

        await switctChain.switchChainAsync({
          chainId: chain.id,
        });
      }

      if (!bounty.data) {
        throw new Error('Bounty data not found');
      }

      setLoading({
        isLoading: true,
        status: 'Waiting for approval',
      });

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
        setLoading({
          isLoading: true,
          status: `Indexing ${i}s...`,
        });

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
      setLoading({
        isLoading: false,
      });

      toast.success('Bounty canceled');
    },

    onError: (error) => {
      setLoading({ isLoading: false });
      toastError('Failed to cancel bounty', error);
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
        validBountyId && !!account.address && !!isCurrentUserAParticipant,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    }
  );

  const canClaimRefund =
    bounty.data?.isCanceled &&
    bounty.data?.isMultiplayer &&
    isCurrentUserAParticipant &&
    !hasClaimedRefund.data &&
    isV3Bounty(chain.id, bounty.data?.id) &&
    account.address?.toLowerCase() !== bounty.data?.issuer.toLowerCase();

  if (bounty.isError) {
    return <div className='pt-6 text-white/60'>Error loading bounty.</div>;
  }

  if (!bounty.data) {
    return <BountyInfoSkeleton />;
  }

  const rawAmount = formatEther(BigInt(bounty.data.amount));

  const [whole, decimals] = rawAmount.split('.');

  const displayAmount = decimals
    ? `${whole}.${decimals.slice(0, 5)}`.replace(/\.?0+$/, '')
    : whole;

  const amountStr = formatAmount({
    amount: displayAmount,
    currency: chain.currency,
    price: price.toString(),
  });

  const splitIdx = amountStr.indexOf(' (');

  const cryptoAmount = (
    splitIdx > -1 ? amountStr.slice(0, splitIdx) : amountStr
  ).toUpperCase();

  const usdAmount =
    splitIdx > -1
      ? `($${amountStr.slice(splitIdx + 2, -1).toUpperCase()})`
      : null;

  const displayDescription =
    bounty.data.id === 1267
      ? bounty.data.description.replaceAll('Kistmet.art', 'Kismet.art')
      : bounty.data.id === 1307
      ? bounty.data.description.replace(
          'Be sure to share your claim in either the /poetry or the /postcards channels!',
          'Be sure to share your claim in either the /poetry or the /postcards channels! Deadline to submit a claim is 17 August 2026.'
        )
      : bounty.data.id === 1326
      ? bounty.data.description.replace(
          'Bounty open until September 30th',
          'Submissions open until September 4th @ 11:59 PM PST.'
        )
      : bounty.data.id === 21
      ? bounty.data.description.replace(
          /Overall community enjoyment\r?\nReward/,
          'Overall community enjoyment\n\nReward'
        )
      : bounty.data.id === 1464
      ? bounty.data.description
          .replace(
            /\*\*How to enter:\*\*[\s\S]*?(?=\n\n\*\*Winner\*\*)/,
            `### How to Enter

1. Go to [giftedstock.com](https://giftedstock.com/) and buy at least one premium box.
2. Gift it to a friend: press Gift box in your profile and send it sealed.
3. Screenshot the send. The confirmation popup works, and if you close it too fast, the history tab in your profile shows the transfer.
4. Post that screenshot on X or Farcaster and tag [@alitiknazoglu](https://t.me/alitiknazoglu)
5. Submit a screenshot of your post as your poidh claim, with the post URL in the claim description.`
          )
          .replace('**Winner**', '### Winner')
          .replace('**Deadline**', '### Deadline')
      : bounty.data.id === 1190
      ? `### August Update

This bounty was updated in August to open submissions to politicians anywhere in the world. Please reference the comment section below for the bounty creator's original scope update.

We want direct, on-camera conversations with real politicians about crypto, decentralization, internet governance, and the future of our open networks.

Your mission is simple: interview a currently active politician from any country and discuss the 10 topics below on video.

The politician can serve at the national, regional, state/provincial, or local level. You must be able to prove that your interview subject is a real, currently active politician.

First legit claim wins.

You must cover all 10 topics in the interview, but feel free to tailor the wording to your country, region, and political context as you see fit.

1. Do you see crypto as speech, property, or financial plumbing — and how does that shape your approach to regulation?
2. How should crypto regulation protect small builders without entrenching large incumbents?
3. Should self-custody be an explicit legal right in your country or region?
4. Where's the line between consumer protection and killing permissionless innovation?
5. Do decentralized social protocols like Farcaster reduce platform monopoly risk — or just reshape it?
6. Should protocol-layer speech be regulated differently than corporate platforms?
7. How would you prevent regulatory capture by large crypto firms?
8. Do you support prediction markets (like Policast) as legitimate civic tools or view them as gambling?
9. Should governments be able to censor at the app layer if the protocol itself is neutral?
10. What would make you publicly post from a decentralized social network yourself?

### Rules

- Video format required
- Original interviews only
- Audio must be understandable
- Minor editing is allowed
- Short-form clips and full interviews are both acceptable
- AI-generated interviews or voice cloning are prohibited
- You may ask follow-up questions in addition to the required list
- Be prepared to provide clear proof that the interview subject is a real, currently active politician

First legit video, posted on the Farcaster /politics channel, wins 🏆`
      : bounty.data.description;

  return (
    <>
      <div className='flex pt-6 flex-col justify-between lg:flex-row'>
        <div className='flex flex-col lg:w-[50%]'>
          <p className='max-w-[30ch] overflow-hidden text-ellipsis text-2xl lg:text-4xl text-bold normal-case break-words'>
            {bounty.data.title}
          </p>

          <div className='mt-5 normal-case break-words'>
            <MarkdownContent>{displayDescription}</MarkdownContent>
          </div>

          <div className='flex flex-row mt-5 mb-4 normal-case break-all flex-wrap'>
            bounty issuer:&nbsp;
            <div className='flex flex-row items-center justify-end overflow-hidden'>
              <DisplayAddress
                address={bounty.data.issuer}
                pfpSize={20}
                showPfpIfExists
                showFallbackPfp
                showLoadingSkeleton
              />

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
                href={`/a/${bounty.data.extra.album}`}
                className='underline hover:opacity-80 cursor-pointer'
              >
                {bounty.data.extra.album}
              </Link>
            </p>
          )}

          <div className='flex flex-col sm:flex-row sm:items-center gap-5 mb-0 mt-1 sm:gap-3 sm:mb-5'>
            <div className='flex items-center gap-x-3'>
              <div className='flex items-center gap-2'>
                <span className='text-xl font-bold'>{cryptoAmount}</span>

                <DynamicChainIcon
                  chain={chain.slug}
                  size={chain.slug === 'base' ? 22 : 28}
                />
              </div>

              {usdAmount && (
                <span className='text-base opacity-60'>{usdAmount}</span>
              )}
            </div>

            {bounty.data.isMultiplayer &&
              bounty.data.inProgress &&
              (canWithdraw ? (
                <Withdraw
                  id={bounty.data.id}
                  onChainId={bounty.data.onChainId}
                />
              ) : (
                !bounty.data.isVoting && <JoinBounty bountyId={bountyId} />
              ))}
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

      {transactions.isLoading ? (
        <div className='max-w-3xl h-[46px] md:h-[50px] border border-white/20 rounded-lg bg-[#D1ECFF]/10 mt-5' />
      ) : (
        <BountyHistory
          transactions={(transactions.data ?? []).map((transaction) => {
            return {
              ...transaction,
              timestamp: Number(transaction.timestamp),
            };
          })}
        />
      )}

      <div className='flex flex-wrap items-center gap-4 my-8'>
        <div className='flex items-center gap-4'>
          {canClaimRefund && (
            <ClaimRefund
              id={bounty.data.id}
              onChainId={bounty.data.onChainId}
            />
          )}

          <button
            type='button'
            onClick={() => onShareModalStateChange?.(true)}
            className='flex items-center gap-1 underline hover:no-underline w-fit'
          >
            share bounty <ArrowIcon size={16} />
          </button>

          <button
            type='button'
            onClick={() => onHowItWorksModalStateChange?.(true)}
            className='flex items-center gap-1 underline hover:no-underline w-fit'
          >
            how it works <QuestionIcon size={22} />
          </button>
        </div>
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
