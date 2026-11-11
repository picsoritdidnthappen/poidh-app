import { useEffect, useRef, useState } from 'react';
import { toastError } from '@/utils/errors';
import { useChainInfo } from '@/hooks/useChainInfo';
import { trpc, trpcClient } from '@/trpc/client';
import { useAccount, useWriteContract } from 'wagmi';
import { usePoidhWallet } from '@/hooks/usePoidhWallet';
import abi from '@/constant/abi/abi';
import { useMutation } from '@tanstack/react-query';
import DisplayAddress from '../global/DisplayAddress';
import CopyAddressButton from '../global/CopyAddressButton';
import ClaimCard from './ClaimCard';
import { useClaimViewer } from './ClaimViewerContext';
import AcceptClaimConfirm from '../bounty/AcceptClaimConfirm';
import SubmitVotingConfirm from '../bounty/SubmitVotingConfirm';
import ConfirmBountySuccessModal from '../bounty/ConfirmBountySuccessModal';
import { useSetAtom } from 'jotai';
import { setLoadingAtom } from '@/store/loading';
import { pollingChainIdAtom } from '@/store/loading';
import SocialMediaLinks from '@/components/global/SocialMediaLinks';
import TextWithLinks from '@/components/global/TextWithLinks';
import { ChainId, Claim } from '@/utils/types';
import { useClaimMedia } from '@/hooks/useClaimMedia';
import {
  ClaimMedia,
  getGenerativePlaceholderImageUrl,
} from '@/components/claims/ClaimMediaParts';
import SubmitVotingSuccessModal from '../bounty/SubmitVotingSuccessModal';

export default function ClaimItem({
  claim,
}: {
  claim: Claim & {
    isVotingOrAcceptedBounty: boolean;
  };
}) {
  const account = useAccount();
  const chain = useChainInfo();

  const writeContract = useWriteContract({});
  const { prepareWallet } = usePoidhWallet();

  const utils = trpc.useUtils();

  const media = useClaimMedia(claim.url);
  const { mediaUrl, mediaError } = media;

  const placeholderSeed = `${claim.chainId}-${claim.id}-${claim.issuer}`;

  // Shared claim viewer navigation state.
  // Keep local state as a fallback when used outside the provider.
  const viewer = useClaimViewer();
  const [openCard, setOpenCard] = useState(false);

  const isCardOpen = viewer
    ? viewer.activeClaimId === claim.id
    : openCard;

  const handleOpenCard = () => {
    if (viewer) {
      viewer.openClaim(claim.id);
    } else {
      setOpenCard(true);
    }
  };

  const handleCloseCard = () => {
    if (viewer) {
      viewer.closeClaim();
    } else {
      setOpenCard(false);
    }
  };

  const [showAcceptConfirm, setShowAcceptConfirm] = useState(false);
  const [showVotingConfirm, setShowVotingConfirm] = useState(false);
  const [showConfirmSuccess, setShowConfirmSuccess] = useState(false);
  const [nominationHash, setNominationHash] = useState<`0x${string}` | null>(null);
  const [showNominationStatus, setShowNominationStatus] = useState(false);

  const setLoading = useSetAtom(setLoadingAtom);
  const setPollingChainId = useSetAtom(pollingChainIdAtom);

  const accountStats = trpc.accounts.stats.useQuery({
    address: claim.issuer,
  });

  const bounty = trpc.bounties.fetch.useQuery({
    id: claim.bountyId,
    chainId: claim.chainId,
  });

  const nominationStorageKey = account.address
    ? `poidh:nomination:${chain.id}:${claim.bountyId}:${claim.id}:${account.address.toLowerCase()}`
    : null;

  const previousNominationKey = useRef<string | null>(null);

  // Keep the transaction hash through a refresh while the vote is indexing.
  useEffect(() => {
    const walletOrClaimChanged =
      previousNominationKey.current !== nominationStorageKey;
    previousNominationKey.current = nominationStorageKey;

    if (walletOrClaimChanged) {
      setNominationHash(null);
      setShowNominationStatus(false);
    }
    if (!nominationStorageKey) return;
    try {
      if (claim.isVotingOrAcceptedBounty) {
        sessionStorage.removeItem(nominationStorageKey);
        return;
      }
      if (!walletOrClaimChanged) return;
      const saved = JSON.parse(
        sessionStorage.getItem(nominationStorageKey) || 'null'
      ) as { hash?: string; savedAt?: number } | null;
      if (
        saved &&
        typeof saved.hash === 'string' &&
        /^0x[0-9a-fA-F]{64}$/.test(saved.hash) &&
        typeof saved.savedAt === 'number' &&
        Date.now() - saved.savedAt >= 0 &&
        Date.now() - saved.savedAt < 60 * 60 * 1000
      ) {
        setNominationHash(saved.hash as `0x${string}`);
        setShowNominationStatus(true);
      } else {
        sessionStorage.removeItem(nominationStorageKey);
      }
    } catch {
      // Session storage is optional.
    }
  }, [nominationStorageKey, claim.isVotingOrAcceptedBounty]);

  const canPickWinner =
    !!bounty.data &&
    bounty.data.inProgress &&
    !bounty.data.isCanceled &&
    account.address?.toLocaleLowerCase() ===
      bounty.data.issuer.toLocaleLowerCase() &&
    !claim.isVotingOrAcceptedBounty &&
    !nominationHash;

  const mustUseVoteFlow = trpc.bounties.mustUseVoteFlow.useQuery(
    {
      id: claim.bountyId,
      chainId: claim.chainId,
    },
    {
      enabled: canPickWinner,
    }
  );

  const acceptClaimMutation = useMutation({
    mutationFn: async ({ claimId }: { claimId: bigint }) => {
      if (!bounty.data) {
        throw new Error('Bounty data not found!');
      }

      if (!account.address) {
        throw new Error('Wallet not connected');
      }

      await prepareWallet(chain.id);

      setPollingChainId(chain.id);

      setLoading({
        isLoading: true,
        status: 'Waiting for approval',
      });

      await writeContract.writeContractAsync({
        abi,
        address: chain.contracts.mainContract as `0x${string}`,
        functionName: 'acceptClaim',
        args: [BigInt(bounty.data.onChainId), BigInt(claim.onChainId)],
        chainId: chain.id,
      });

      for (let i = 0; i < 60; i++) {
        setLoading({
          isLoading: true,
          status: `Indexing ${i}s...`,
        });

        const accepted = await trpcClient.claims.isAccepted.query({
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
      setLoading({
        isLoading: false,
      });

      setShowConfirmSuccess(true);
    },

    onError: (error) => {
      setLoading({
        isLoading: false,
      });

      toastError('Failed to accept claim', error);
    },

    onSettled: () => {
      utils.claims.fetchBountyClaims.refetch();

      setLoading({
        isLoading: false,
        status: '',
      });
    },
  });

  const submitForVoteMutation = useMutation({
    mutationFn: async () => {
      if (!bounty.data) {
        throw new Error('Bounty data not found!');
      }

      if (!account.address) {
        throw new Error('Wallet not connected');
      }

      await prepareWallet(chain.id);

      setPollingChainId(chain.id);

      setLoading({
        isLoading: true,
        status: 'Waiting for approval',
      });

      return writeContract.writeContractAsync({
        abi,
        address: chain.contracts.mainContract as `0x${string}`,
        functionName: 'submitClaimForVote',
        args: [BigInt(bounty.data.onChainId), BigInt(claim.onChainId)],
        chainId: chain.id,
      });
    },

    onSuccess: (hash) => {
      setNominationHash(hash);
      setShowNominationStatus(true);
      if (nominationStorageKey) {
        try {
          sessionStorage.setItem(
            nominationStorageKey,
            JSON.stringify({ hash, savedAt: Date.now() })
          );
        } catch {
          // The modal still works if storage is unavailable.
        }
      }
    },

    onError: (error) => {
      toastError('Failed to submit claim for vote', error);
    },

    onSettled: () => {
      setLoading({
        isLoading: false,
        status: '',
      });
    },
  });
  
  const resolvedClaimImage =
    mediaError || !mediaUrl
      ? getGenerativePlaceholderImageUrl(placeholderSeed)
      : mediaUrl;

  return (
    <>
      <ClaimCard
        claim={{
          ...claim,
          issuer: {
            address: claim.issuer.toLowerCase(),
            scorePoidh: Number(accountStats.data?.poidhScore) ?? 0,
          },
          bounty: bounty.data
            ? {
                ...bounty.data,
                chainId: bounty.data.chainId as ChainId,
              }
            : undefined,
        }}
        onClose={handleCloseCard}
        open={isCardOpen}
      />

      {bounty.data && (
        <ConfirmBountySuccessModal
          open={showConfirmSuccess}
          onClose={() => setShowConfirmSuccess(false)}
          claimImage={resolvedClaimImage}
          claimTitle={claim.title}
          claimIssuer={claim.issuer}
          bountyTitle={bounty.data.title}
          bountyAmount={bounty.data.amount}
          bountyIssuer={bounty.data.issuer}
        />
      )}

      <SubmitVotingSuccessModal
        open={showNominationStatus && !!nominationHash}
        hash={nominationHash}
        chainId={chain.id}
        onClose={(failed) => {
          setShowNominationStatus(false);
          if (failed) {
            setNominationHash(null);
            if (nominationStorageKey) {
              try {
                sessionStorage.removeItem(nominationStorageKey);
              } catch {
                // No persistent state to clear.
              }
            }
          }
        }}
      />

      <SubmitVotingConfirm
        isOpen={showVotingConfirm}
        onClose={() => setShowVotingConfirm(false)}
        imageUrl={resolvedClaimImage}
        onConfirm={() => {
          if (!submitForVoteMutation.isPending && !nominationHash) {
            submitForVoteMutation.mutate();
          }
          setShowVotingConfirm(false);
        }}
      />

      <AcceptClaimConfirm
        isOpen={showAcceptConfirm}
        onClose={() => setShowAcceptConfirm(false)}
        imageUrl={resolvedClaimImage}
        onConfirm={() => {
          acceptClaimMutation.mutate({
            claimId: BigInt(claim.id),
          });

          setShowAcceptConfirm(false);
        }}
      />

      <div className='p-[2px] text-white relative bg-poidhRed border-poidhRed border-2 rounded-xl'>
        <div className='left-5 top-5 absolute z-10 flex flex-col text-white'>
          {nominationHash && !claim.isVotingOrAcceptedBounty && (
            <button
              type='button'
              onClick={() => setShowNominationStatus(true)}
              className='cursor-pointer mt-5 text-white hover:bg-poidhRed bg-poidhRed bg-opacity-30 border border-poidhRed rounded-[8px] py-2 px-5'
            >
              view nomination status
            </button>
          )}
          {canPickWinner && mustUseVoteFlow.data !== undefined && (
            <button
              className='cursor-pointer mt-5 text-white hover:bg-poidhRed bg-poidhRed bg-opacity-30 border border-poidhRed rounded-[8px] py-2 px-5 disabled:opacity-60 disabled:cursor-not-allowed'
              disabled={submitForVoteMutation.isPending}
              onClick={() => {
                if (mustUseVoteFlow.data) {
                  setShowVotingConfirm(true);
                } else {
                  setShowAcceptConfirm(true);
                }
              }}
            >
              {mustUseVoteFlow.data ? 'propose winner' : 'accept'}
            </button>
          )}
        </div>

        {claim.isAccepted && (
          <div className='left-5 top-5 z-10 text-white bg-poidhRed border border-poidhRed rounded-[8px] py-2 px-5 absolute'>
            accepted
          </div>
        )}

        <div
          className='relative w-full aspect-square bg-[#12AAFF] dark:bg-[#132b47] rounded-[8px] overflow-hidden cursor-pointer'
          onClick={handleOpenCard}
        >
          <ClaimMedia
            media={media}
            seed={placeholderSeed}
            alt={claim.title || 'claim image'}
          />
        </div>

        <div className='p-3'>
          <div className='flex flex-col'>
            <p className='normal-case text-nowrap overflow-ellipsis overflow-hidden break-words'>
              {claim.title}
            </p>

            <p className='normal-case w-full h-20 overflow-y-auto overflow-x-hidden overflow-hidden break-words'>
              <TextWithLinks>{claim.description}</TextWithLinks>
            </p>
          </div>

          <div className='mt-2 py-2 flex flex-row items-center text-sm border-t border-dashed'>
            <span className='shrink-0 mr-2'>issuer&nbsp;</span>

            <div className='flex flex-row items-center w-full justify-end overflow-hidden'>
              <DisplayAddress
                address={claim.issuer}
                pfpSize={20}
                showPfpIfExists
                showFallbackPfp
                showLoadingSkeleton
              />

              <div className='ml-2'>
                <CopyAddressButton address={claim.issuer} />
              </div>
            </div>
          </div>

          <div className='flex flex-row items-center justify-between'>
            <span>claim id: {claim.id}</span>

            <SocialMediaLinks address={claim.issuer} />
          </div>
        </div>
      </div>
    </>
  );
}
