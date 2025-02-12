import { useGetChain } from '@/hooks/useGetChain';
import { trpc } from '@/trpc/client';
import { Currency } from '@/utils/types';
import { getBanSignatureFirstLine } from '@/utils/utils';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { useMutation } from '@tanstack/react-query';
import Image from 'next/image';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { useAccount, useSignMessage, useSwitchChain } from 'wagmi';
import { BanIcon, CloseIcon, ZoomInIcon, ZoomOutIcon } from '../global/Icons';
import Link from 'next/link';
import { formatAddress } from '../account/AccountInfo';

export type ClaimCardProps = {
  open: boolean;
  claim: {
    id: string;
    title: string;
    description: string;
    imageUrl: string | null;
    currency: Currency;
    issuer: {
      address: string;
      scorePoidh: number;
      completedClaims: number;
      earnedAmount: number;
    };
    bountyId: string;
  };
  onClose: () => void;
};

export default function ClaimCard({ claim, open, onClose }: ClaimCardProps) {
  const account = useAccount();
  const utils = trpc.useUtils();
  const chain = useGetChain();
  const switctChain = useSwitchChain();
  const { signMessageAsync } = useSignMessage();

  const banClaimMutation = trpc.banClaim.useMutation({});
  const isAdmin = trpc.isAdmin.useQuery({ address: account.address });
  const isIssuer = trpc.isIssuer.useQuery({
    address: account.address,
    chainId: chain.id,
    bountyId: Number(claim.bountyId),
  });

  const [scale, setScale] = useState(1);
  const [isImageFullscreen, setIsImageFullscreen] = useState(false);

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
      claimId: string;
      bountyId: string;
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
      utils.bountyClaims.refetch();
    },
  });

  return (
    <>
      <Dialog open={open} onClose={onClose} className='relative z-50'>
        <div className='fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4'>
          <DialogPanel className='w-[calc(100vw-2rem)] sm:w-[450px] max-w-[450px] rounded-xl p-3 bg-gradient-to-b from-[#2a81d5] to-[#70aae2]'>
            <div className='bg-blur rounded-lg p-2 sm:p-4 space-y-3 sm:space-y-4 border border-white/20'>
              <div
                className='bg-blur-white rounded-lg p-2 h-48 sm:h-64 flex items-center justify-center cursor-pointer relative'
                onClick={() => claim.imageUrl && setIsImageFullscreen(true)}
              >
                {claim.imageUrl && (
                  <div
                    className='absolute inset-0 rounded-lg opacity-30'
                    style={{
                      backgroundImage: `url(${claim.imageUrl})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat',
                    }}
                  />
                )}
                {claim.imageUrl ? (
                  <Image
                    src={claim.imageUrl}
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
                    {claim.description}
                  </p>
                </div>
              </div>

              <div className='bg-blur rounded-lg p-2 sm:p-3 space-y-2'>
                <div className='flex justify-between items-center'>
                  <span className='font-semibold text-xs sm:text-sm text-white'>
                    Issuer
                  </span>
                  <Link
                    href={`/${chain.slug}/account/${claim.issuer.address}`}
                    className='text-xs sm:text-sm text-white/90 max-w-[15ch] overflow-hidden overflow-ellipsis hover:text-gray-200'
                  >
                    {formatAddress(claim.issuer.address)}
                  </Link>
                </div>

                <div className='grid grid-cols-3 gap-1 sm:gap-2 text-center text-[10px] sm:text-xs'>
                  <div className='bg-blur-white rounded p-1.5 sm:p-2'>
                    <div className='h-6 flex items-center justify-center'>
                      {formatNumber(claim.issuer.scorePoidh)}
                    </div>
                    <div className='text-white/80 mt-1'>Score</div>
                  </div>

                  <div className='bg-blur-white rounded p-1.5 sm:p-2'>
                    <div className='h-6 flex items-center justify-center'>
                      {claim.issuer.completedClaims}
                    </div>
                    <div className='text-white/80 mt-1'>Claims</div>
                  </div>

                  <div className='bg-blur-white rounded p-1.5 sm:p-2'>
                    <div className='h-6 flex items-center justify-center'>
                      {formatNumber(claim.issuer.earnedAmount)}
                    </div>
                    <div className='text-white/80 mt-1'>
                      Earned ({claim.currency})
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {(isAdmin.data || isIssuer.data) && (
              <div className='flex gap-3 mt-3'>
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
                  <div className='relative bg-[#f15e5f] text-white py-2 px-3 rounded-md text-xs font-bold transition-all duration-75 group-hover:-translate-y-[1px] group-active:translate-y-[2px] flex items-center justify-center gap-1.5 border-2 border-t-[#ff6e6e] border-l-[#ff6e6e] border-r-[#cf5d5d] border-b-[#cf5d5d]'>
                    <BanIcon />
                    <span className='drop-shadow-[1px_1px_0px_rgba(0,0,0,0.5)] tracking-wide'>
                      ban
                    </span>
                  </div>
                </button>
              </div>
            )}
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
                  <ZoomOutIcon width={20} height={20} />
                </button>
                <div className='px-3 text-white/90 text-sm border-l border-r border-white/20'>
                  {Math.round(scale * 100)}%
                </div>
                <button
                  onClick={handleZoomIn}
                  className='text-white/80 hover:text-white p-2 transition-colors'
                >
                  <ZoomInIcon width={20} height={20} />
                </button>
              </div>
            </div>
            <button
              onClick={() => {
                setIsImageFullscreen(false);
                setScale(1);
              }}
              className='absolute top-4 right-4 text-white/80 hover:text-white p-2 bg-blur rounded-lg border border-white/20'
            >
              <CloseIcon width={20} height={20} />
            </button>
            {claim.imageUrl && (
              <Image
                src={claim.imageUrl}
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
