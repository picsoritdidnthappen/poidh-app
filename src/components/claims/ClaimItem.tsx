import { useState, useEffect } from 'react';
import Image from 'next/image';
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

type MediaResult = {
  url: string | null;
  isVideo: boolean;
};

async function resolveMedia(claimUrl: string): Promise<MediaResult> {
  try {
    const res = await fetch(claimUrl);
    const contentType = res.headers.get('content-type') ?? '';

    // 1. direct media
    if (
      VIDEO_EXTENSIONS.test(claimUrl) ||
      contentType.startsWith('video/')
    ) {
      return { url: claimUrl, isVideo: true };
    }

    if (contentType.startsWith('image/')) {
      return { url: claimUrl, isVideo: false };
    }

    // 2. metadata
    const text = await res.text();

    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      return { url: null, isVideo: false };
    }

    const media =
      data?.animation_url ||
      data?.video ||
      data?.image ||
      null;

    if (!media) return { url: null, isVideo: false };

    return {
      url: media,
      isVideo: VIDEO_EXTENSIONS.test(media),
    };
  } catch {
    return { url: null, isVideo: false };
  }
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
  const switchChain = useSwitchChain();

  const utils = trpc.useUtils();

  const [openCard, setOpenCard] = useState(false);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mediaError, setMediaError] = useState(false);

  const [showAcceptConfirm, setShowAcceptConfirm] = useState(false);
  const [showVotingConfirm, setShowVotingConfirm] = useState(false);
  const [showConfirmSuccess, setShowConfirmSuccess] = useState(false);

  const setLoading = useSetAtom(setLoadingAtom);
  const setPollingChainId = useSetAtom(pollingChainIdAtom);
  const pollingChainId = useAtomValue(pollingChainIdAtom);

  const accountStats = trpc.accounts.stats.useQuery({
    address: claim.issuer,
  });

  const bounty = trpc.bounties.fetch.useQuery({
    id: claim.bountyId,
    chainId: claim.chainId,
  });

  // -------------------------
  // MEDIA RESOLUTION (FIXED)
  // -------------------------
  useEffect(() => {
    if (!claim?.url) return;

    let cancelled = false;

    const run = async () => {
      setIsLoading(true);
      setMediaError(false);

      const result = await resolveMedia(claim.url);

      if (cancelled) return;

      if (result.url) {
        setMediaUrl(result.url);
        setIsVideo(result.isVideo);
      } else {
        setMediaError(true);
        setMediaUrl(null);
      }

      setIsLoading(false);
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [claim?.url]);

  // -------------------------
  // MUTATIONS (unchanged logic)
  // -------------------------
  const acceptClaimMutation = useMutation({
    mutationFn: async ({ claimId }: { claimId: bigint }) => {
      if (!bounty.data) throw new Error('Bounty data not found!');

      const chainId = await account.connector?.getChainId();

      if (chain.id !== chainId) {
        setLoading({ isLoading: true, status: 'Switching network...' });
        await switchChain.switchChainAsync({ chainId: chain.id });
      }

      setPollingChainId(chain.id);
      setLoading({ isLoading: true, status: 'Waiting approval' });

      await writeContract.writeContractAsync({
        abi,
        address: chain.contracts.mainContract as `0x${string}`,
        functionName: 'acceptClaim',
        args: [
          BigInt(bounty.data.onChainId),
          BigInt(claim.onChainId),
        ],
        chainId: chain.id,
      });

      for (let i = 0; i < 60; i++) {
        const accepted = await trpcClient.claims.isAccepted.query({
          id: Number(claimId),
          chainId: pollingChainId ?? chain.id,
        });

        if (accepted) return;

        await new Promise((r) => setTimeout(r, 1000));
      }

      throw new Error('Failed to accept claim');
    },

    onSuccess: () => {
      setLoading({ isLoading: false });
      setShowConfirmSuccess(true);
    },
    onError: (e) => {
      setLoading({ isLoading: false });
      toast.error('Failed: ' + e.message);
    },
    onSettled: () => {
      utils.claims.fetchBountyClaims.refetch();
      setLoading({ isLoading: false, status: '' });
    },
  });

  const submitForVoteMutation = useMutation({
    mutationFn: async () => {
      if (!bounty.data) throw new Error('Bounty data not found!');

      const chainId = await account.connector?.getChainId();

      if (chain.id !== chainId) {
        await switchChain.switchChainAsync({ chainId: chain.id });
      }

      setPollingChainId(chain.id);
      setLoading({ isLoading: true, status: 'Waiting approval' });

      await writeContract.writeContractAsync({
        abi,
        address: chain.contracts.mainContract as `0x${string}`,
        functionName: 'submitClaimForVote',
        args: [
          BigInt(bounty.data.onChainId),
          BigInt(claim.onChainId),
        ],
        chainId: chain.id,
      });
    },
    onSuccess: () => {
      toast.success('Submitted for vote');
      window.location.reload();
    },
    onError: (e) => {
      toast.error('Failed: ' + e.message);
    },
    onSettled: () => {
      setLoading({ isLoading: false, status: '' });
    },
  });

  // -------------------------
  // RENDER
  // -------------------------
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
          claimImage={mediaUrl ?? ''}
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
        <div
          className='relative w-full aspect-square bg-[#12AAFF] dark:bg-[#132b47] rounded-[8px] overflow-hidden cursor-pointer'
          onClick={() => setOpenCard(true)}
        >
          {isLoading ? (
            <div className='flex items-center justify-center w-full h-full text-white/60'>
              Loading...
            </div>
          ) : mediaUrl ? (
            isVideo ? (
              <video
                src={mediaUrl}
                controls
                className='w-full h-full object-cover'
              />
            ) : (
              <Image
                src={mediaUrl}
                alt={claim.title || 'claim image'}
                fill
                className='object-cover'
                unoptimized
              />
            )
          ) : (
            <div className='flex items-center justify-center w-full h-full text-white/60'>
              {mediaError ? 'Error loading media' : 'No media'}
            </div>
          )}
        </div>

        <div className='p-3'>
          <p className='truncate'>{claim.title}</p>

          <p className='text-sm h-20 overflow-auto'>
            <TextWithLinks>{claim.description}</TextWithLinks>
          </p>

          <div className='mt-2 flex justify-between text-sm border-t border-dashed pt-2'>
            <div className='flex items-center gap-2'>
              issuer
              <DisplayAddress address={claim.issuer} />
              <CopyAddressButton address={claim.issuer} />
            </div>

            <SocialMediaLinks address={claim.issuer} />
          </div>
        </div>
      </div>
    </>
  );
}
