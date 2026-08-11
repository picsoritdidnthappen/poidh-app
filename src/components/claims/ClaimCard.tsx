import { useChainInfo } from '@/hooks/useChainInfo';
import { trpc } from '@/trpc/client';
import { Bounty, Claim } from '@/utils/types';
import { getBanSignatureFirstLine } from '@/utils/utils';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { useMutation } from '@tanstack/react-query';
import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useAccount, useSignMessage, useSwitchChain } from 'wagmi';
import {
  BanIcon,
  CloseIcon,
  ShareIcon2,
  ZoomInIcon,
  ZoomOutIcon,
} from '../global/Icons';
import TextWithLinks from '@/components/global/TextWithLinks';
import DisplayAddress from '@/components/global/DisplayAddress';
import {
  getDisplayUsername,
  shareToFarcaster,
  shareToTwitter,
} from '@/utils/share';

export type ClaimCardProps = {
  open: boolean;
  claim: Omit<Claim, 'issuer'> & {
    issuer: {
      address: string;
      scorePoidh: number;
    };
    bounty?: Bounty;
  };
  onClose: () => void;
};

export default function ClaimCard({ claim, open, onClose }: ClaimCardProps) {
  const account = useAccount();
  const utils = trpc.useUtils();
  const chain = useChainInfo();
  const switctChain = useSwitchChain();
  const { signMessageAsync } = useSignMessage();

  const [scale, setScale] = useState(1);
  const [isImageFullscreen, setIsImageFullscreen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const shareDropdownRef = useRef<HTMLDivElement>(null);
  const [isGeneratingCard, setIsGeneratingCard] = useState(false);

  const banClaimMutation = trpc.admin.banClaim.useMutation({});
  const isAdmin = trpc.admin.isAdmin.useQuery({ address: account.address });
  const isIssuer = trpc.bounties.isIssuer.useQuery({
    address: account.address,
    chainId: chain.id,
    bountyId: Number(claim.bountyId),
  });
  const bountyIssuer = trpc.users.fetchByAddress.useQuery(
    { address: claim.bounty?.issuer ?? '' },
    { enabled: shareOpen && !!claim.bounty?.issuer }
  );
  const claimIssuer = trpc.users.fetchByAddress.useQuery(
    { address: claim.issuer.address },
    { enabled: shareOpen }
  );
  const isClaimIssuer = account.address?.toLowerCase() === claim.issuer.address;

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.5, 3));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.5, 0.5));
  };

  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsImageFullscreen(false);
      setScale(1);
    }
  };

  const signMutation = useMutation({
    mutationFn: async ({
      claimId,
      bountyId,
    }: {
      claimId: number;
      bountyId: number;
    }) => {
      const chainId = await account.connector?.getChainId();
      if (chainId !== 8453) {
        //arbitrum has a problem with message signing, so all confirmations are on base
        await switctChain.switchChainAsync({ chainId: 8453 });
      }
      const message = getBanSignatureFirstLine({
        id: Number(claimId),
        chainId: chain.id,
        type: 'claim',
      });
      if (account.address) {
        const signature = await signMessageAsync({ message }).catch(() => null);
        if (!signature) {
          throw new Error('Failed to sign message');
        }

        await banClaimMutation.mutateAsync({
          id: Number(claimId),
          chainId: chain.id,
          bountyId: Number(bountyId),
          address: account.address,
          chainName: chain.slug,
          message,
          signature,
        });
      }
    },
    onSuccess: () => {
      toast.success('Claim banned');
    },
    onError: (error) => {
      toast.error('Failed to ban claim: ' + error.message);
    },
    onSettled: () => {
      utils.claims.fetchAcceptedClaimByBountyId.refetch();
    },
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        shareDropdownRef.current &&
        !shareDropdownRef.current.contains(event.target as Node)
      ) {
        setShareOpen(false);
      }
    }
    if (shareOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [shareOpen]);

  const handleShareTwitter = () => {
    const claimIssuerName = claimIssuer.data
      ? getDisplayUsername(claimIssuer.data, 'twitter')
      : claim.issuer.address.slice(0, 7);
    const bountyIssuerName = claimIssuer.data
      ? getDisplayUsername(bountyIssuer.data ?? null, 'twitter')
      : claim.bounty?.issuer.slice(0, 7);

    const text = `check out ${
      isClaimIssuer ? 'my' : `${claimIssuerName}'s`
    } claim on ${bountyIssuerName}'s @poidhxyz bounty`;

    shareToTwitter(text);
  };

  const handleShareFarcaster = async () => {
    const bountyIssuerUsername = getDisplayUsername(
      bountyIssuer.data,
      'farcaster'
    );
    const claimIssuerUsername = getDisplayUsername(
      claimIssuer.data,
      'farcaster'
    );
    const text = `check out ${
      isClaimIssuer ? 'my' : `${claimIssuerUsername}'s`
    } claim on ${bountyIssuerUsername}'s @poidhxyz bounty`;

    setIsGeneratingCard(true);
    try {
      const cardUrl = new URL(
        '/api/generate-claim-card',
        window.location.origin
      );
      if (claim.url) cardUrl.searchParams.set('image', claim.url);
      cardUrl.searchParams.set('title', claim.title.slice(0, 30));
      cardUrl.searchParams.set('issuer', claimIssuerUsername);

      if (claimIssuer.data?.pfpUrl) {
        cardUrl.searchParams.set('pfp', claimIssuer.data?.pfpUrl);
      }

      await shareToFarcaster({
        text,
        embedImage: cardUrl.toString(),
      });
    } catch (error) {
      await shareToFarcaster({ text, embedImage: claim.url ?? '' });
    } finally {
      setIsGeneratingCard(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} className='relative z-50'>
        <div className='fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4'>
          <DialogPanel className='w-[calc(100vw-2rem)] sm:w-[450px] max-w-[450px] rounded-xl p-3 bg-gradient-to-b from-[#2a81d5] to-[#70aae2] dark:from-[#0d1b2e] dark:to-[#1a3a5c]'>
            <div className='bg-blur rounded-lg p-2 sm:p-4 space-y-3 sm:space-y-4 border border-white/20'>
              <div
                className='bg-blur-white rounded-lg p-2 h-48 sm:h-64 flex items-center justify-center cursor-pointer relative'
                onClick={() => claim.url && setIsImageFullscreen(true)}
              >
                {claim.url && (
                  <div
                    className='absolute inset-0 rounded-lg opacity-30'
                    style={{
                      backgroundImage: `url(${claim.url})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat',
                    }}
                  />
                )}
                {claim.url ? (
                  <Image
                    src={claim.url}
                    alt={claim.title}
                    width={400}
                    height={400}
                    className='max-h-full max-w-full object-contain transition-transform relative z-20'
                  />
                ) : (
                  <div className='text-white/60'>No Image</div>
                )}
              </div>

              <DialogTitle className='text-lg sm:text-xl font-bold text-center border-b-2 border-white/20 pb-2 text-white break-words overflow-hidden'>
                <div className='px-2 truncate'>{claim.title}</div>
              </DialogTitle>

              <div
                className='h-[150px] sm:h-[200px] overflow-y-auto overflow-x-hidden'
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#38598b transparent',
                }}
              >
                <div className='pr-3'>
                  <p className='text-xs sm:text-sm text-white/90 break-words whitespace-pre-line'>
                    <TextWithLinks>{claim.description}</TextWithLinks>
                  </p>
                </div>
              </div>

              <div className='bg-blur rounded-lg p-2 sm:p-3 space-y-2'>
                <div className='flex justify-between items-center text-xs sm:text-sm'>
                  <span className='text-white'>issuer</span>
                  <DisplayAddress address={claim.issuer.address} pfpSize={18} />
                </div>

                <div className='bg-blur-white rounded p-1.5 sm:p-2 text-center text-[10px] sm:text-xs'>
                  <div className='text-white/80'>poidh score</div>
                  <div className='text-3xl sm:text-3xl flex items-center justify-center font-family-pixeloid bg-gradient-to-r text-poidhRed bg-clip-text [text-shadow:-0.5px_-0.5px_0_white,0.5px_-0.5px_0_white,-0.5px_0.5px_0_white,0.5px_0.5px_0_white]'>
                    {formatNumber(claim.issuer.scorePoidh)}
                  </div>
                </div>
              </div>
            </div>
            <div
              className={`flex gap-3 mt-3${
                isAdmin.data || isIssuer.data ? '' : ' justify-center'
              }`}
            >
              <div className='flex-1 relative group' ref={shareDropdownRef}>
                {shareOpen && (
                  <div className='absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 flex flex-col items-center justify-center w-[95%]'>
                    <div
                      className='rounded-lg shadow-lg font-family-pixeloid text-white text-sm py-2 px-0 flex flex-col items-stretch border border-[#D1ECFF] w-full'
                      style={{
                        backdropFilter: 'blur(8px)',
                        background:
                          'linear-gradient(to top, rgba(209,236,255,0.2) 10%, rgba(209,236,255,0.1) 30%, rgba(209,236,255,0.05) 50%)',
                        color: '#FFF',
                        marginTop: '0.25rem',
                        fontFamily: 'GeistMono-Regular',
                        fontSize: '0.875rem',
                      }}
                    >
                      <button
                        className='w-full px-6 py-2 text-left hover:bg-[#D1ECFF]/20 transition-colors border-b border-[#D1ECFF]/10 font-mono tracking-wide rounded-t-lg'
                        onClick={handleShareFarcaster}
                        style={{ fontFamily: 'GeistMono-Regular, monospace' }}
                      >
                        {isGeneratingCard
                          ? 'generating...'
                          : 'share to farcaster'}
                      </button>
                      <button
                        className='w-full px-6 py-2 text-left hover:bg-[#D1ECFF]/20 transition-colors font-mono tracking-wide rounded-b-lg'
                        onClick={handleShareTwitter}
                        style={{ fontFamily: 'GeistMono-Regular, monospace' }}
                      >
                        share to twitter
                      </button>
                    </div>
                  </div>
                )}
                <button
                  onClick={() => setShareOpen((v) => !v)}
                  className='w-full relative group'
                >
                  <div className='absolute inset-0 bg-[#cf5d5d] rounded-md transform translate-y-[2px]'></div>
                  <div className='relative bg-poidhRed text-white py-2 px-3 rounded-md text-xs font-bold transition-all duration-75 group-hover:-translate-y-[1px] group-active:translate-y-[2px] flex items-center justify-center gap-1.5 border-2 border-t-[#ff6e6e] border-l-[#ff6e6e] border-r-[#cf5d5d] border-b-[#cf5d5d]'>
                    <span className='w-3.5 h-3.5 flex items-center justify-center drop-shadow-[1px_1px_0px_rgba(0,0,0,0.5)]'>
                      <ShareIcon2 />
                    </span>
                    <span className='drop-shadow-[1px_1px_0px_rgba(0,0,0,0.5)] tracking-wide'>
                      share
                    </span>
                  </div>
                </button>
              </div>
              {(isAdmin.data || isIssuer.data) && (
                <button
                  onClick={async () =>
                    await signMutation.mutateAsync({
                      bountyId: claim.bountyId,
                      claimId: claim.id,
                    })
                  }
                  className='flex-1 relative group'
                >
                  <div className='absolute inset-0 bg-[#cf5d5d] rounded-md transform translate-y-[2px]'></div>
                  <div className='relative bg-poidhRed text-white py-2 px-3 rounded-md text-xs font-bold transition-all duration-75 group-hover:-translate-y-[1px] group-active:translate-y-[2px] flex items-center justify-center gap-1.5 border-2 border-t-[#ff6e6e] border-l-[#ff6e6e] border-r-[#cf5d5d] border-b-[#cf5d5d]'>
                    <BanIcon />
                    <span className='drop-shadow-[1px_1px_0px_rgba(0,0,0,0.5)] tracking-wide'>
                      ban
                    </span>
                  </div>
                </button>
              )}
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      <Dialog
        open={isImageFullscreen}
        onClose={() => {
          setIsImageFullscreen(false);
          setScale(1);
        }}
        className='relative z-[60]'
      >
        <div
          className='fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center'
          onClick={handleBackgroundClick}
        >
          <div className='relative w-full h-full flex items-center justify-center p-4'>
            <div className='absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10'>
              <div className='bg-blur rounded-lg border border-white/20 flex items-center'>
                <button
                  onClick={handleZoomOut}
                  className='text-white/80 hover:text-white p-2 transition-colors'
                >
                  <ZoomOutIcon size={20} />
                </button>
                <div className='px-3 text-white/90 text-sm border-l border-r border-white/20'>
                  {Math.round(scale * 100)}%
                </div>
                <button
                  onClick={handleZoomIn}
                  className='text-white/80 hover:text-white p-2 transition-colors'
                >
                  <ZoomInIcon size={20} />
                </button>
              </div>
            </div>
            <button
              onClick={() => {
                setIsImageFullscreen(false);
                setScale(1);
              }}
              className='absolute z-50 top-4 right-4 text-white/80 hover:text-white p-2 bg-blur rounded-lg border border-white/20'
            >
              <CloseIcon size={20} />
            </button>
            {claim.url && (
              <Image
                src={claim.url}
                alt={claim.title}
                width={400}
                height={400}
                className='max-w-full max-h-full object-contain transition-transform duration-200'
                style={{ transform: `scale(${scale})` }}
              />
            )}
          </div>
        </div>
      </Dialog>
    </>
  );
}

function formatNumber(num: number) {
  const [a, b] = num.toString().split('.');

  if (!b || !b.slice(0, 4).replaceAll('0', '')) {
    return a;
  }

  return a + '.' + b.slice(0, 4);
}
