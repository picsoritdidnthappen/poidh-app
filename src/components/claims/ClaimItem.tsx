import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useChainInfo } from '@/hooks/useChainInfo';
import { trpc, trpcClient } from '@/trpc/client';
import { useAccount, useSwitchChain, useWriteContract } from 'wagmi';
import abi from '@/constant/abi/abi';
import { useMutation } from '@tanstack/react-query';
import DisplayAddress from '../global/DisplayAddress';
import CopyAddressButton from '../global/CopyAddressButton';
import ClaimCard from './ClaimCard';
import AcceptClaimConfirm from '../bounty/AcceptClaimConfirm';
import SubmitVotingConfirm from '../bounty/SubmitVotingConfirm';
import ConfirmBountySuccessModal from '../bounty/ConfirmBountySuccessModal';
import { useAtomValue, useSetAtom } from 'jotai';
import { setLoadingAtom } from '@/store/loading';
import { pollingChainIdAtom } from '@/store/loading';
import SocialMediaLinks from '@/components/global/SocialMediaLinks';
import TextWithLinks from '@/components/global/TextWithLinks';
import { ChainId, Claim } from '@/utils/types';

const VIDEO_EXTENSIONS = /\.(mp4|mov|webm|ogg)(\?.*)?$/i;
const IPFS_URL_PATTERN = /https?:\/\/[^\s"]+\/ipfs\/[a-zA-Z0-9]+[^\s"]*/g;

async function resolveMediaUrl(url: string): Promise<{ mediaUrl: string; isVideo: boolean }> {
  try {
    const response = await fetch(url);
    const contentType = response.headers.get('content-type') ?? '';

    if (contentType.startsWith('video/') || VIDEO_EXTENSIONS.test(url)) {
      return { mediaUrl: url, isVideo: true };
    }

    if (contentType.startsWith('image/')) {
      return { mediaUrl: url, isVideo: false };
    }

    const text = await response.text();
    try {
      const data = JSON.parse(text);
      if (data.image) {
        return { mediaUrl: data.image, isVideo: VIDEO_EXTENSIONS.test(data.image) };
      }
    } catch {
      // not JSON
    }

    const matches = text.match(IPFS_URL_PATTERN);
    if (matches && matches.length > 0) {
      const videoMatch = matches.find((m) => VIDEO_EXTENSIONS.test(m));
      const chosen = videoMatch ?? matches[0];
      return { mediaUrl: chosen, isVideo: !!videoMatch };
    }
  } catch {
    // fetch failed
  }
  return { mediaUrl: url, isVideo: false };
}

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
  const switctChain = useSwitchChain();

  const utils = trpc.useUtils();

  const [openCard, setOpenCard] = useState(false);
  const [showAcceptConfirm, setShowAcceptConfirm] = useState(false);
  const [showVotingConfirm, setShowVotingConfirm] = useState(false);
  const [showConfirmSuccess, setShowConfirmSuccess] = useState(false);
  const setLoading = useSetAtom(setLoadingAtom);
  const setPollingChainId = useSetAtom(pollingChainIdAtom);
  const pollingChainId = useAtomValue(pollingChainIdAtom);

  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);

  useEffect(() => {
    if (!claim?.url) return;
    resolveMediaUrl(claim.url).then(({ mediaUrl, isVideo }) => {
      setMediaUrl(mediaUrl);
      setIsVideo(isVideo);
    });
  }, [claim?.url]);

  const accountStats = trpc.accounts.stats.useQuery({ address: claim.issuer });

  const bounty = trpc.bounties.fetch.useQuery({
    id: claim.bountyId,
    chainId: claim.chainId,
  });

  const acceptClaimMutation = useMutation({
    mutationFn: async ({ claimId }: { claimId: bigint }) => {
      if (!bounty.data) {
        throw new Error('Bounty data not found!');
      }

      const chainId = await account.connector?.getChainId();
      if (chain.id !== chainId) {
        setLoading({ isLoading: true, status: 'Switching network...' });
        await switctChain.switchChainAsync({ chainId: chain.id });
      }

      setPollingChainId(chain.id);
      setLoading({ isLoading: true, status: 'Waiting approval' });

      await writeContract.writeContractAsync({
        abi,
        address: chain.contracts.mainContract as `0x${string}`,
        functionName: 'acceptClaim',
        args: [BigInt(bounty.data.onChainId), BigInt(claim.onChainId)],
        chainId: chain.id,
      });

      for (let i = 0; i < 60; i++) {
        setLoading({ isLoading: true, status: `Indexing ${i}s...` });
        const accepted = await trpcClient.claims.isAccepted.query({
          id: Number(claimId),
          chainId: pollingChainId ?? chain.id,
        });
        if (accepted) {
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 1_000));
      }

      throw new Error('Failed to accept claim');
    },

    onSuccess: () => {
      setLoading({ isLoading: false });
      setShowConfirmSuccess(true);
    },
    onError: (error) => {
      setLoading({ isLoading: false });
      toast.error('Failed to accept claim:' + error.message);
    },
    onSettled: () => {
      utils.claims.fetchBountyClaims.refetch();
      setLoading({ isLoading: false, status: '' });
    },
  });

  const submitForVoteMutation = useMutation({
    mutationFn: async () => {
      if (!bounty.data) {
        throw new Error('Bounty data not found!');
      }

      const chainId = await account.connector?.getChainId();
      if (chain.id !== chainId) {
        await switctChain.switchChainAsync({ chainId: chain.id });
      }

      setPollingChainId(chain.id);
      setLoading({ isLoading: true, status: 'Waiting approval' });

      await writeContract.writeContractAsync({
        abi,
        address: chain.contracts.mainContract as `0x${string}`,
        functionName: 'submitClaimForVote',
        args: [BigInt(bounty.data.onChainId), BigInt(claim.onChainId)],
        chainId: pollingChainId ?? chain.id,
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
      setLoading({ isLoading: false, status: '' });
    },
  });

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
            ? { ...bounty.data, chainId: bounty.data.chainId as ChainId }
            : undefined,
        }}
        onClose={() => setOpenCard(false)}
        open={openCard}
      />
      {bounty.data && (
        <ConfirmBountySuccessModal
          open={showConfirmSuccess}
          onClose={() => setShowConfirmSuccess(false)}
          claimImage={mediaUrl ?? claim.url ?? ''}
          claimTitle={claim.title}
          claimIssuer={claim.issuer}
          bountyTitle={bounty.data.title}
          bountyAmount={bounty.data.amount}
          bountyIssuer={bounty.data.issuer}
        />
      )}
      <SubmitVotingConfirm
        isOpen={showVotingConfirm}
        onClose={() => setShowVotingConfirm(false)}
        imageUrl={mediaUrl ?? ''}
        onConfirm={() => {
          submitForVoteMutation.mutate();
          setShowVotingConfirm(false);
        }}
      />
      <AcceptClaimConfirm
        isOpen={showAcceptConfirm}
        onClose={() => setShowAcceptConfirm(false)}
        imageUrl={mediaUrl ?? ''}
        onConfirm={() => {
          acceptClaimMutation.mutate({
            claimId: BigInt(claim.id),
          });
          setShowAcceptConfirm(false);
        }}
      />
      <div className='p-[2px] text-white relative bg-poidhRed border-poidhRed border-2 rounded-xl'>
        <div className='left-5 top-5 absolute flex flex-col text-white'>
          {bounty.data &&
            bounty.data.inProgress &&
            !bounty.data.isCanceled &&
            account.address?.toLocaleLowerCase() ===
              bounty.data.issuer.toLocaleLowerCase() &&
            !claim.isVotingOrAcceptedBounty && (
              <button
                className='cursor-pointer mt-5 text-white hover:bg-poidhRed bg-poidhRed bg-opacity-30 border border-poidhRed rounded-[8px] py-2 px-5'
                onClick={() => {
                  if (bounty.data.hasParticipants) {
                    setShowVotingConfirm(true);
                  } else {
                    setShowAcceptConfirm(true);
                  }
                }}
              >
                {bounty.data.hasParticipants ? 'propose winner' : 'accept'}
              </button>
            )}
        </div>

        {claim.isAccepted && (
          <div className='left-5 top-5 text-white bg-poidhRed border border-poidhRed rounded-[8px] py-2 px-5 absolute'>
            accepted
          </div>
        )}

        <div
          className='bg-[#12AAFF] dark:bg-[#132b47] w-full aspect-w-1 aspect-h-1 rounded-[8px] overflow-hidden cursor-pointer'
          onClick={() => setOpenCard(true)}
        >
          {isVideo && mediaUrl ? (
            <video
              src={mediaUrl}
              className='w-full h-full object-cover'
              autoPlay
              muted
              loop
              playsInline
            />
          ) : mediaUrl ? (
            <div
              style={{ backgroundImage: `url(${mediaUrl})` }}
              className='w-full h-full bg-cover bg-center'
            />
          ) : (
            <div className='w-full h-full bg-[#12AAFF] dark:bg-[#132b47]' />
          )}
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
              <DisplayAddress address={claim.issuer} />
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
