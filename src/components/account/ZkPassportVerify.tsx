'use client';

import { useState, useCallback, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ZKPassport } from '@zkpassport/sdk';
import { trpc } from '@/trpc/client';
import { ZkPassportIcon } from '@/components/global/Icons';
import { toast } from 'react-toastify';

type VerifyState = 'idle' | 'connecting' | 'waiting' | 'generating';

export default function ZkPassportVerify({ address }: { address: string }) {
  const [state, setState] = useState<VerifyState>('idle');
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const statusQuery = trpc.zkpassport.status.useQuery({ address });
  const verifyMutation = trpc.zkpassport.verify.useMutation({
    onSuccess: () => {
      toast.success('Verified successfully!');
      closeModal();
      statusQuery.refetch();
    },
  });

  const utils = trpc.useUtils();

  const closeModal = useCallback(() => {
    setShowModal(false);
    setState('idle');
    setQrUrl(null);
  }, []);

  useEffect(() => {
    if (!showModal) return;
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeModal();
    };
    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.body.style.overflow = originalStyle;
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [showModal, closeModal]);

  const startVerification = useCallback(async () => {
    setShowModal(true);
    setState('connecting');
    try {
      const zkPassport = new ZKPassport();

      const queryBuilder = await zkPassport.request({
        name: 'poidh',
        logo: 'https://poidh.xyz/images/poidh-logo.png',
        purpose: 'verify your nationality for your poidh profile badge',
        scope: 'poidh-profile-verification',
      });

      const {
        url,
        onRequestReceived,
        onGeneratingProof,
        onResult,
        onReject,
        onError,
      } = queryBuilder.disclose('nationality').done();

      setQrUrl(url);
      setState('waiting');

      onRequestReceived(() => {
        setState('waiting');
      });

      onGeneratingProof(() => {
        setState('generating');
      });

      onResult(async ({ verified, result }) => {
        if (verified && result.nationality?.disclose?.result) {
          const country = result.nationality.disclose.result as string;
          await verifyMutation.mutateAsync({
            address,
            country,
            uniqueIdentifier: 'verified',
          });
          utils.neynar.usersData.invalidate({ addresses: [address] });
        } else {
          toast.error('Verification failed. Please try again.');
          closeModal();
        }
      });

      onReject(() => {
        closeModal();
      });

      onError((err) => {
        toast.error(typeof err === 'string' ? err : 'An error occurred');
        closeModal();
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to start verification'
      );
      closeModal();
    }
  }, [address, verifyMutation, utils, closeModal]);

  useEffect(() => {
    return () => {
      setQrUrl(null);
    };
  }, []);

  if (statusQuery.data?.verified) {
    return null;
  }

  return (
    <>
      <button
        type='button'
        onClick={startVerification}
        className='hover:text-gray-200 cursor-pointer transition-colors'
        aria-label='Verify with zkPassport'
        title='Verify with zkPassport'
      >
        <ZkPassportIcon width={20} height={20} />
      </button>

      {showModal && (
        <div
          className='fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4'
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className='bg-poidhBlue/90 border border-[#D1ECFF] rounded-[30px] shadow-2xl w-full max-w-sm mx-auto transform transition-all'>
            <div className='flex items-center justify-between p-6 border-b border-white/20'>
              <div className='flex items-center gap-2'>
                <ZkPassportIcon width={20} height={20} />
                <h2 className='text-xl font-semibold text-white'>
                  Verify with zkPassport
                </h2>
              </div>
              <button
                onClick={closeModal}
                className='p-2 hover:bg-white/20 rounded-full transition-colors text-white'
                aria-label='Close'
              >
                <svg
                  width='20'
                  height='20'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                >
                  <path d='M18 6L6 18M6 6l12 12' />
                </svg>
              </button>
            </div>

            <div className='p-6'>
              <div className='flex flex-col items-center gap-4'>
                {state === 'connecting' && (
                  <div className='text-sm text-white/70 animate-pulse py-8'>
                    Connecting...
                  </div>
                )}

                {state === 'waiting' && qrUrl && (
                  <>
                    <p className='text-sm text-white/70 text-center'>
                      Scan with the zkPassport app on your phone
                    </p>
                    <div className='bg-white p-4 rounded-xl'>
                      <QRCodeSVG value={qrUrl} size={220} />
                    </div>
                    <a
                      href={qrUrl}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='text-sm text-white/70 hover:text-white underline'
                    >
                      Or open directly on this device
                    </a>
                  </>
                )}

                {state === 'generating' && (
                  <div className='flex flex-col items-center gap-3 py-8'>
                    <div className='w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin' />
                    <p className='text-sm text-white'>Generating proof...</p>
                    <p className='text-sm text-white/70'>
                      This may take a moment
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
