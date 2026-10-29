import { useChainInfo } from '@/hooks/useChainInfo';
import { useClaimMedia } from '@/hooks/useClaimMedia';
import { GenerativePlaceholder } from '@/components/claims/ClaimMediaParts';
import { useClaimViewer } from '@/components/claims/ClaimViewerContext';
import { trpc } from '@/trpc/client';
import { Bounty, Claim } from '@/utils/types';
import { getBanMessage } from '@/utils/utils';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { useMutation } from '@tanstack/react-query';
import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';
import { toast } from 'react-toastify';
import { toastError } from '@/utils/errors';
import { useAccount, useSignMessage } from 'wagmi';
import { usePoidhWallet } from '@/hooks/usePoidhWallet';
import {
  BanIcon,
  CloseIcon,
  ShareIcon2,
  ZoomInIcon,
  ZoomOutIcon,
} from '../global/Icons';
import DisplayAddress from '@/components/global/DisplayAddress';
import {
  getDisplayUsername,
  shareToFarcaster,
  shareToTwitter,
} from '@/utils/share';
import { uploadFile } from '@/utils/pinata';
import MarkdownContent from '@/components/global/MarkdownContent';

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
  const { prepareWallet } = usePoidhWallet();
  const { signMessageAsync } = useSignMessage();
  const viewer = useClaimViewer();
  const position = viewer ? viewer.claimIds.indexOf(claim.id) + 1 : 0;
  const navigation =
    viewer && viewer.activeClaimId === claim.id && position > 0
      ? {
          position,
          total: viewer.totalClaims,
          onPrevious: viewer.canPrevious ? () => viewer.navigate(-1) : undefined,
          onNext: viewer.canNext ? () => viewer.navigate(1) : undefined,
        }
      : null;

  const { mediaUrl, isVideo, mediaError, setMediaError } = useClaimMedia(
    claim.url
  );

  const placeholderSeed = `${claim.chainId}-${claim.id}-${claim.issuer.address}`;

  const [scale, setScale] = useState(1);

  const [translate, setTranslate] = useState({
    x: 0,
    y: 0,
  });

  const [isImageFullscreen, setIsImageFullscreen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const shareDropdownRef = useRef<HTMLDivElement>(null);
  const [isGeneratingCard, setIsGeneratingCard] = useState(false);

  const lastTouchDistance = useRef<number | null>(null);

  const lastTouchPoint = useRef<{
    x: number;
    y: number;
  } | null>(null);

  const banClaimMutation = trpc.admin.banClaim.useMutation({});
  const { mutateAsync: getNonce } = trpc.auth.nonce.useMutation();

  const isAdmin = trpc.admin.isAdmin.useQuery({
    address: account.address,
  });

  const isIssuer = trpc.bounties.isIssuer.useQuery({
    address: account.address,
    chainId: chain.id,
    bountyId: Number(claim.bountyId),
  });

  const bountyIssuer = trpc.users.fetchByAddress.useQuery(
    {
      address: claim.bounty?.issuer ?? '',
    },
    {
      enabled: shareOpen && !!claim.bounty?.issuer,
    }
  );

  const claimIssuer = trpc.users.fetchByAddress.useQuery(
    {
      address: claim.issuer.address,
    },
    {
      enabled: shareOpen,
    }
  );

  const isClaimIssuer = account.address?.toLowerCase() === claim.issuer.address;

  const resetImageTransform = () => {
    setScale(1);

    setTranslate({
      x: 0,
      y: 0,
    });

    lastTouchDistance.current = null;
    lastTouchPoint.current = null;
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = () => {
    setScale((prev) => {
      const next = Math.max(prev - 0.5, 1);

      if (next === 1) {
        setTranslate({
          x: 0,
          y: 0,
        });
      }

      return next;
    });
  };

  const getTouchDistance = (touches: React.TouchList) => {
    const firstTouch = touches[0];
    const secondTouch = touches[1];

    return Math.hypot(
      secondTouch.clientX - firstTouch.clientX,
      secondTouch.clientY - firstTouch.clientY
    );
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      lastTouchDistance.current = getTouchDistance(e.touches);

      lastTouchPoint.current = null;

      return;
    }

    if (e.touches.length === 1 && scale > 1) {
      lastTouchPoint.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && lastTouchDistance.current !== null) {
      e.preventDefault();

      const distance = getTouchDistance(e.touches);

      const ratio = distance / lastTouchDistance.current;

      setScale((prev) => Math.min(Math.max(prev * ratio, 1), 4));

      lastTouchDistance.current = distance;
      lastTouchPoint.current = null;

      return;
    }

    if (e.touches.length === 1 && scale > 1 && lastTouchPoint.current) {
      e.preventDefault();

      const touch = e.touches[0];

      const dx = touch.clientX - lastTouchPoint.current.x;

      const dy = touch.clientY - lastTouchPoint.current.y;

      setTranslate((prev) => ({
        x: prev.x + dx,
        y: prev.y + dy,
      }));

      lastTouchPoint.current = {
        x: touch.clientX,
        y: touch.clientY,
      };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 0) {
      lastTouchDistance.current = null;
      lastTouchPoint.current = null;
    } else if (e.touches.length === 1 && scale > 1) {
      lastTouchDistance.current = null;

      lastTouchPoint.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }

    if (scale <= 1) {
      setScale(1);

      setTranslate({
        x: 0,
        y: 0,
      });
    }
  };

  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsImageFullscreen(false);
      resetImageTransform();
    }
  };

  const signMutation = useMutation({
    mutationFn: async ({ claimId }: { claimId: number }) => {
      // arbitrum has a problem with message signing,
      // so all confirmations are on base
      await prepareWallet(8453, { showLoading: false });

      const nonce = await getNonce();

      if (account.address) {
        const signature = await signMessageAsync({
          message: getBanMessage({
            type: 'claim',
            id: Number(claimId),
            chainId: chain.id,
            nonce,
          }),
        }).catch(() => null);

        if (!signature) {
          throw new Error('Failed to sign message');
        }

        await banClaimMutation.mutateAsync({
          id: Number(claimId),
          chainId: chain.id,
          address: account.address,
          chainName: chain.slug,
          signature,
          nonce,
        });
      }
    },

    onSuccess: () => {
      toast.success('Claim banned');
    },

    onError: (error) => {
      toastError('Failed to ban claim', error);
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
    } claim on ${bountyIssuerUsername}'s bounty`;

    setIsGeneratingCard(true);

    try {
      const cardUrl = new URL(
        '/api/generate-claim-card',
        window.location.origin
      );

      if (mediaUrl && !mediaError) {
        cardUrl.searchParams.set('image', mediaUrl);
      }

      cardUrl.searchParams.set('title', claim.title.slice(0, 30));

      cardUrl.searchParams.set('issuer', claimIssuerUsername);

      if (claimIssuer.data?.pfpUrl) {
        cardUrl.searchParams.set('pfp', claimIssuer.data.pfpUrl);
      }

      const response = await fetch(cardUrl.toString());

      if (!response.ok) {
        throw new Error('Failed to generate claim card');
      }

      const imageBlob = await response.blob();

      const uploadResult = await uploadFile(imageBlob);

      if (!uploadResult?.IpfsHash) {
        throw new Error('Failed to upload to Pinata');
      }

      const embedImageUrl = `https://gateway.pinata.cloud/ipfs/${uploadResult.IpfsHash}`;

      await shareToFarcaster({
        text,
        embedImage: embedImageUrl,
      });
    } catch {
      await shareToFarcaster({
        text,
        embedImage: !mediaError ? mediaUrl ?? claim.url ?? '' : '',
      });
    } finally {
      setIsGeneratingCard(false);
    }
  };

  // Left/right arrows work while reading the claim, not while zooming its image.
  useEffect(() => {
    if (!open || isImageFullscreen || !navigation) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const target = event.target;
      if (target instanceof HTMLElement) {
        if (target.isContentEditable || target.closest('input, textarea, select, [contenteditable="true"]')) return;
      }
      if (event.key === 'ArrowLeft' && navigation.onPrevious) {
        event.preventDefault();
        navigation.onPrevious();
      } else if (event.key === 'ArrowRight' && navigation.onNext) {
        event.preventDefault();
        navigation.onNext();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, isImageFullscreen, navigation]);

  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const suppressMediaClickRef = useRef(false);

  const handleViewerTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!navigation || event.touches.length !== 1) {
      swipeStartRef.current = null;
      return;
    }
    const target = event.target;
    if (
      target instanceof Element &&
      target.closest('button, a, input, textarea, select, video, [role="button"]')
    ) {
      swipeStartRef.current = null;
      return;
    }
    swipeStartRef.current = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY,
    };
  };

  const handleViewerTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start || !navigation || event.changedTouches.length !== 1) return;
    const dx = event.changedTouches[0].clientX - start.x;
    const dy = event.changedTouches[0].clientY - start.y;
    // Ignore ordinary vertical scrolling and short accidental movements.
    if (Math.abs(dx) < 65 || Math.abs(dx) < Math.abs(dy) * 1.5) return;

    const navigate = dx < 0 ? navigation.onNext : navigation.onPrevious;
    if (!navigate) return;
    if (event.cancelable) event.preventDefault();
    suppressMediaClickRef.current = true;
    window.setTimeout(() => { suppressMediaClickRef.current = false; }, 400);
    navigate();
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} className='relative z-50'>
        <div className='fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4'>
          <DialogPanel
            className='relative w-[calc(100vw-1.5rem)] sm:w-[450px] max-w-[450px] lg:w-[min(1200px,calc(100vw-7rem))] lg:max-w-[1200px] max-h-[calc(100dvh-1.5rem)] lg:h-[min(740px,calc(100dvh-3rem))] touch-pan-y overflow-y-auto lg:overflow-visible rounded-xl p-3 bg-gradient-to-b from-[#2a81d5] to-[#70aae2] dark:from-[#0d1b2e] dark:to-[#1a3a5c]'
            onTouchStart={handleViewerTouchStart}
            onTouchEnd={handleViewerTouchEnd}
            onTouchCancel={() => { swipeStartRef.current = null; }}
          >   
            <div className='sticky top-0 z-40 mb-2 flex h-10 items-center justify-end lg:absolute lg:right-3 lg:top-3 lg:mb-0 lg:h-auto'>
              <button
                type='button'
                aria-label='Close claim'
                onClick={onClose}
                className='flex h-9 w-9 items-center justify-center rounded-md text-white transition-colors hover:bg-white/15'
              >
                <span className='lg:hidden'>
                  <CloseIcon size={14} />
                </span>
                <span className='hidden lg:block'>
                  <CloseIcon size={12} />
                </span>
              </button>
            </div>
            <div className='bg-blur rounded-lg p-2 sm:p-4 border border-white/20 space-y-3 lg:space-y-0 lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-5 lg:h-full lg:min-h-0'>
              <div
                className='bg-blur-white rounded-lg h-48 sm:h-64 lg:h-full lg:min-h-0 flex items-center justify-center relative overflow-hidden'
                onClick={() => {
                  if (suppressMediaClickRef.current) {
                    suppressMediaClickRef.current = false;
                    return;
                  }
                  if (mediaUrl && !isVideo && !mediaError) {
                    setIsImageFullscreen(true);
                  }
                }}
              >
                {mediaError ? (
                  <GenerativePlaceholder seed={placeholderSeed} />
                ) : mediaUrl ? (
                  isVideo ? (
                    <video
                      src={mediaUrl}
                      controls
                      playsInline
                      preload='metadata'
                      onClick={(e) => e.stopPropagation()}
                      onError={() => {
                        setMediaError(true);
                      }}
                      className='relative z-20 h-full w-full max-h-full max-w-full object-contain'
                    />
                  ) : (
                    <>
                      
                      <div
                        className='absolute inset-0 rounded-lg opacity-30 pointer-events-none'
                        style={{
                          backgroundImage: `url(${mediaUrl})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          backgroundRepeat: 'no-repeat',
                          filter: 'blur(32px)',
                          transform: 'scale(1.1)',
                        }}
                      />

                      <Image
                        src={mediaUrl}
                        alt={claim.title}
                        width={400}
                        height={400}
                        unoptimized
                        onError={() => {
                          setMediaError(true);
                        }}
                        className='h-full w-full max-h-full max-w-full object-contain transition-transform relative z-20'
                      />
                    </>
                  )
                ) : (
                  <div className='absolute inset-0 bg-white/10 animate-pulse' />
                )}
              </div>

              <div className='min-w-0 lg:min-h-0 flex flex-col gap-3 lg:gap-4'>
              <DialogTitle className='text-lg sm:text-xl font-bold text-center lg:text-left lg:pr-10 border-b-2 border-white/20 pb-2 text-white break-words overflow-hidden'>
                <div className='px-2 lg:px-0 whitespace-normal break-words'>{claim.title}</div>
              </DialogTitle>

              <div
                className='h-[150px] sm:h-[200px] lg:h-auto lg:flex-1 lg:min-h-0 overflow-y-auto overflow-x-hidden'
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#38598b transparent',
                }}
              >
                <div className='pr-3'>
                  <div className='text-xs sm:text-sm lg:text-base text-white/90 break-words whitespace-pre-line'>
                    <MarkdownContent>{claim.description}</MarkdownContent>
                  </div>
                </div>
              </div>

              <div className='bg-blur rounded-lg p-2 sm:p-3 space-y-2'>
                <div className='flex justify-between items-center text-xs sm:text-sm'>
                  <span className='text-white'>issuer</span>

                  <DisplayAddress
                    address={claim.issuer.address}
                    pfpSize={18}
                    showPfpIfExists
                    showFallbackPfp
                    showLoadingSkeleton
                  />
                </div>

                <div className='bg-blur-white rounded p-1.5 sm:p-2 text-center text-[10px] sm:text-xs'>
                  <div className='text-white/80'>poidh score</div>

                  <div className='text-3xl sm:text-3xl flex items-center justify-center font-family-pixeloid bg-gradient-to-r text-poidhRed bg-clip-text [text-shadow:-0.5px_-0.5px_0_white,0.5px_-0.5px_0_white,-0.5px_0.5px_0_white,0.5px_0.5px_0_white]'>
                    {formatNumber(claim.issuer.scorePoidh)}
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
                        style={{
                          fontFamily: 'GeistMono-Regular, monospace',
                        }}
                      >
                        {isGeneratingCard
                          ? 'generating...'
                          : 'share to farcaster'}
                      </button>

                      <button
                        className='w-full px-6 py-2 text-left hover:bg-[#D1ECFF]/20 transition-colors font-mono tracking-wide rounded-b-lg'
                        onClick={handleShareTwitter}
                        style={{
                          fontFamily: 'GeistMono-Regular, monospace',
                        }}
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
                    await signMutation.mutateAsync({ claimId: claim.id })
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
              </div>
            </div>

            {navigation && (
              <>
                
                <button
                  type='button'
                  aria-label='Previous claim'
                  onClick={navigation.onPrevious}
                  disabled={!navigation.onPrevious}
                  className='hidden lg:flex absolute top-1/2 -translate-y-1/2 -left-12 h-12 w-12 items-center justify-center text-white hover:scale-110 transition-transform disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:scale-100'
                >
                  <svg
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='3'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    className='h-11 w-11 drop-shadow-lg'
                  >
                    <path d='m15 18-6-6 6-6' />
                  </svg>
                </button>
                <button
                  type='button'
                  aria-label='Next claim'
                  onClick={navigation.onNext}
                  disabled={!navigation.onNext}
                  className='hidden lg:flex absolute top-1/2 -translate-y-1/2 -right-12 h-12 w-12 items-center justify-center text-white hover:scale-110 transition-transform disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:scale-100'
                >
                  <svg
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='3'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    className='h-11 w-11 drop-shadow-lg'
                  >
                    <path d='m9 18 6-6-6-6' />
                  </svg>
                </button>
                <div className='flex lg:hidden items-center justify-between mt-3 text-xs text-white'>
                  <button type='button' disabled={!navigation.onPrevious} onClick={navigation.onPrevious} className='px-3 py-2 disabled:opacity-30'>← previous</button>
                  <span>{navigation.position} of {navigation.total}</span>
                  <button type='button' disabled={!navigation.onNext} onClick={navigation.onNext} className='px-3 py-2 disabled:opacity-30'>next →</button>
                </div>
                <div className='hidden lg:block absolute bottom-[-28px] inset-x-0 text-center text-xs text-white/85'>
                  {navigation.position} of {navigation.total} · use ← → to browse
                </div>
              </>
            )}
          </DialogPanel>
        </div>
      </Dialog>

      <Dialog
        open={isImageFullscreen}
        onClose={() => {
          setIsImageFullscreen(false);
          resetImageTransform();
        }}
        className='relative z-[60]'
      >
        <div
          className='fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center'
          onClick={handleBackgroundClick}
        >
          <div
            className='relative w-full h-full flex items-center justify-center p-4 overflow-hidden touch-none'
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
          >
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
                resetImageTransform();
              }}
              className='absolute z-50 top-4 right-4 text-white/80 hover:text-white p-2 bg-blur rounded-lg border border-white/20'
            >
              <CloseIcon size={20} />
            </button>

            {mediaUrl && !isVideo && !mediaError && (
              <Image
                src={mediaUrl}
                alt={claim.title}
                width={1200}
                height={1200}
                unoptimized
                draggable={false}
                onError={() => {
                  setMediaError(true);
                  setIsImageFullscreen(false);
                  resetImageTransform();
                }}
                className='max-w-full max-h-full object-contain select-none'
                style={{
                  transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
                  transformOrigin: 'center center',
                }}
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
