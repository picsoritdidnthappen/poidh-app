import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-toastify';
import { toastError } from '@/utils/errors';
import { useAtomValue, useSetAtom } from 'jotai';
import { useChainInfo } from '@/hooks/useChainInfo';
import { usePoidhWallet } from '@/hooks/usePoidhWallet';
import { useScreenSize } from '@/hooks/useScreenSize';
import { cn } from '@/utils/utils';
import { useAccount, useBalance, useWriteContract } from 'wagmi';
import abi from '@/constant/abi/abi';
import Image from 'next/image';
import { useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, Box } from '@mui/material';
import { decodeEventLog } from 'viem';
import { trpc, trpcClient } from '@/trpc/client';
import GameButton from '@/components/global/GameButton';
import { pollingChainIdAtom, setLoadingAtom } from '@/store/loading';
import ClaimConfirm from '@/components/claims/ClaimConfirm';
import ClaimSuccessModal from '@/components/claims/ClaimSuccessModal';
import { ImageIcon, CloseIcon } from '@/components/global/Icons';
import buildMetadata, { uploadFile, uploadMetadata } from '@/utils/pinata';

const LINK_IPFS = 'https://beige-impossible-dragon-883.mypinata.cloud/ipfs';

type SuccessPayload = {
  claimImage: string;
  claimTitle: string;
};

export default function FormClaim({
  bountyId,
  onChainBountyId,
  open,
  onClose,
}: {
  bountyId: number;
  open: boolean;
  onChainBountyId: number;
  onClose: () => void;
}) {
  const [preview, setPreview] = useState<string>('');
  const [imageURI, setImageURI] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [successPayload, setSuccessPayload] = useState<SuccessPayload | null>(
    null
  );
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const titleId = useId();
  const descriptionId = useId();
  const titleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const utils = trpc.useUtils();
  const setLoading = useSetAtom(setLoadingAtom);
  const setPollingChainId = useSetAtom(pollingChainIdAtom);
  const pollingChainId = useAtomValue(pollingChainIdAtom);

  const account = useAccount();
  const writeContract = useWriteContract({});
  const chain = useChainInfo();
  const isZeroDev = account.connector?.id === 'zerodev-wallet';
  const { data: balance } = useBalance({
    address: account.address,
    chainId: chain.id,
  });
  const { prepareWallet, validatePoidhTx } = usePoidhWallet();
  const isMobile = useScreenSize();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = [
      'jpeg',
      'jpg',
      'png',
      'gif',
      'webp',
      'heic',
      'heif',
    ];

    if (!extension || !allowedExtensions.includes(extension)) {
      toast.error('Please upload only image files');
      return;
    }

    setFile(file);
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      if (e.target?.result) {
        setPreview(e.target.result.toString());
      }
    };
    reader.readAsDataURL(file);
  }, []);

  // Intentionally omit the HTML accept filter here.
  // On Android, an image-only accept filter can send Chrome straight to the
  // Photo Picker, which may hide the Camera option. We validate the selected
  // file ourselves in onDrop instead.
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    multiple: false,
    onDropRejected: () => {
      toast.error('Please select a single image');
    },
  });

  useEffect(() => {
    const uploadImage = async () => {
      if (file) {
        try {
          // Do not blindly retry pins: failures may still have stored the image.
          const { IpfsHash: cid } = await uploadFile(file);
          setImageURI(`${LINK_IPFS}/${cid}`);
        } catch (error) {
          console.error('Error uploading file:', error);
          alert('Trouble uploading file');
        }
      }
    };

    uploadImage();
  }, [file]);

  const createClaimMutations = useMutation({
    mutationFn: async () => {
      setShowConfirm(false);

      await prepareWallet(chain.id);
      const { contractAddress } = await validatePoidhTx(chain);

      setLoading({ isLoading: true, status: 'Uploading metadata...' });
      const metadata = buildMetadata(imageURI, title, description);
      const metadataResponse = await uploadMetadata(metadata);
      const uri = `${LINK_IPFS}/${metadataResponse.IpfsHash}`;

      setLoading({ isLoading: true, status: 'Creating claim...' });
      setPollingChainId(chain.id);

      const tx = await writeContract.writeContractAsync({
        abi,
        address: contractAddress,
        functionName: 'createClaim',
        args: [BigInt(onChainBountyId), title, description, uri],
        chainId: chain.id,
      });

      setLoading({ isLoading: true, status: 'Waiting for receipt...' });
      const receipt = await chain.provider.waitForTransactionReceipt({
        hash: tx,
      });

      const log = receipt.logs
        .map((log) => {
          try {
            return decodeEventLog({
              abi,
              data: log.data,
              topics: log.topics,
            });
          } catch (e) {
            return null;
          }
        })
        .find((log) => log?.eventName === 'ClaimCreated');

      if (!log) {
        throw new Error('No logs found');
      }

      if (log.eventName !== 'ClaimCreated') {
        throw new Error('Invalid event: ' + log.eventName);
      }

      const claimId = log.args.id.toString();

      for (let i = 0; i < 60; i++) {
        setLoading({ isLoading: true, status: `Indexing ${i}s...` });
        const claim = await trpcClient.claims.isCreated.query({
          id: Number(claimId),
          chainId: pollingChainId ?? chain.id,
        });

        if (claim) {
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 1_000));
      }

      throw new Error('Failed to index bounty');
    },
    onSuccess: () => {
      setLoading({ isLoading: false });
      setSuccessPayload({
        claimImage: imageURI,
        claimTitle: title,
      });
      toast.success('Claim created successfully');
      setShowSuccess(true);
    },
    onError: (error) => {
      setLoading({ isLoading: false });
      toastError('Failed to create claim', error);
    },
    onSettled: () => {
      utils.claims.fetchBountyClaims.refetch();
      setPollingChainId(null);
      setTitle('');
      setDescription('');
      setImageURI('');
      setPreview('');
      setFile(null);
    },
  });

  return (
    <>
      <ClaimConfirm
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        imageUrl={preview}
        onConfirm={() => createClaimMutations.mutate()}
      />
      <ClaimSuccessModal
        open={showSuccess}
        onClose={() => {
          setShowSuccess(false);
          setSuccessPayload(null);
        }}
        claimImage={successPayload?.claimImage ?? ''}
        claimTitle={successPayload?.claimTitle ?? ''}
        bountyId={bountyId}
        claimIssuer={account.address!}
      />
      <Dialog
        open={open}
        onClose={onClose}
        aria-label='create claim'
        maxWidth={false}
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          className:
            'bg-poidhBlue/90 dark:!bg-[#132b47] relative flex flex-col',
          sx: {
            borderRadius: isMobile ? '0px' : '30px',
            color: 'white',
            border: isMobile ? 'none' : '1px solid #D1ECFF',
            ...(isMobile
              ? {
                  m: 0,
                  height: '100vh',
                  maxHeight: '100vh',
                  '@supports (height: 100dvh)': {
                    height: '100dvh',
                    maxHeight: '100dvh',
                  },
                }
              : {
                  width: '92vw',
                  maxWidth: '1400px',
                  height: '90vh',
                  maxHeight: '900px',
                  m: 2,
                }),
          },
        }}
        sx={
          isMobile
            ? {
                '& .MuiDialog-paper': {
                  transform: open ? 'translateY(0)' : 'translateY(100%)',
                  transition: 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)',
                },
              }
            : {}
        }
      >
        {isMobile && (
          <div className='flex items-center justify-between w-full sticky'>
            <div style={{ width: '40px' }} />
            <button
              type='button'
              aria-label='close claim form'
              onClick={onClose}
              style={{
                color: 'white',
                padding: '6px',
                marginTop: '6px',
                marginRight: '6px',
                display: 'flex',
                alignItems: 'center',
                transition: 'background-color 0.2s ease',
              }}
            >
              <CloseIcon size={14} />
            </button>
          </div>
        )}
        <DialogContent
          sx={{
            position: 'relative',
            p: isMobile ? 2 : 3,
            pt: isMobile ? 1 : 3,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            overflowY: 'auto',
            ...(isMobile && {
              height: '100%',
              maxHeight: '100%',
            }),
          }}
        >
          {!isMobile && (
            <div className='mb-5 flex shrink-0 items-center justify-between gap-4'>
              <h2 className='font-mono text-2xl'>create claim</h2>
              <button
                type='button'
                aria-label='close claim form'
                onClick={onClose}
                className='flex items-center justify-center rounded-md p-2 transition-colors hover:bg-white/15'
              >
                <CloseIcon size={12} />
              </button>
            </div>
          )}

          <Box
            sx={
              isMobile
                ? undefined
                : {
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 3fr) minmax(260px, 2fr)',
                    flex: 1,
                    minHeight: 360,
                    gap: 4,
                  }
            }
          >
            <div
              {...getRootProps({
                role: 'button',
                'aria-label': 'upload claim image',
              })}
              className={cn(
                'flex w-full cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed text-center text-white transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
                isMobile ? 'p-8' : 'min-h-0 gap-4 bg-black/10 p-4',
                isMobile && isDragActive && 'scale-105',
                isDragActive
                  ? 'border-white bg-white/10'
                  : 'border-[#D1ECFF] hover:border-white hover:bg-white/5'
              )}
            >
              <input {...getInputProps()} />
              {!isMobile && preview && (
                <div className='relative min-h-0 w-full flex-1 overflow-hidden rounded-2xl bg-black/20'>
                  <Image
                    src={preview}
                    alt='Claim image preview'
                    fill
                    unoptimized
                    className='object-contain'
                  />
                </div>
              )}
              {isDragActive ? (
                <div className='flex flex-col items-center gap-2'>
                  <ImageIcon />
                  <p className='text-sm font-medium'>Drop the image here...</p>
                </div>
              ) : (
                <div className='flex flex-col items-center gap-3'>
                  {!imageURI && (isMobile || !preview) && (
                    <svg
                      className={cn(
                        'opacity-75',
                        isMobile ? 'h-8 w-8' : 'h-12 w-12'
                      )}
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={1.5}
                        d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'
                      />
                    </svg>
                  )}
                  <div>
                    <p className='text-sm font-medium'>
                      {imageURI
                        ? '✓ Image uploaded'
                        : !isMobile && preview
                        ? 'Click or drop an image to replace'
                        : isMobile
                        ? 'Tap to add photo'
                        : 'Drag & drop or click to upload'}
                    </p>
                    {!isMobile && preview && imageURI && (
                      <p className='mt-1 text-xs opacity-70'>
                        Click or drop an image to replace
                      </p>
                    )}
                    {!imageURI && (isMobile || !preview) && (
                      <p className='text-xs opacity-70 mt-1'>
                        PNG, JPG, GIF, WebP, HEIC
                      </p>
                    )}
                  </div>
                </div>
              )}
              {isMobile && preview && (
                <Image
                  src={preview}
                  alt='Preview'
                  width={280}
                  height={280}
                  className='w-full max-w-xs h-auto rounded-2xl object-contain mt-4 border border-white/20'
                />
              )}
            </div>
            <div className={isMobile ? 'mt-4' : 'flex min-w-0 flex-col gap-2'}>
              <label
                htmlFor={titleId}
                className={isMobile ? 'mb-2 text-base' : ''}
              >
                title
              </label>
              <input
                id={titleId}
                ref={titleRef}
                type='text'
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onFocus={() => {
                  if (isMobile && titleRef.current) {
                    titleRef.current.scrollIntoView({
                      behavior: 'smooth',
                      block: 'center',
                    });
                  }
                }}
                className={`border bg-transparent border-[#D1ECFF] py-2 px-2 rounded-md mb-4 w-full ${
                  isMobile ? 'text-base py-3' : ''
                }`}
              />
              <label
                htmlFor={descriptionId}
                className={isMobile ? 'text-base mb-2' : ''}
              >
                description
              </label>
              <textarea
                id={descriptionId}
                ref={descriptionRef}
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onFocus={() => {
                  if (isMobile && descriptionRef.current) {
                    descriptionRef.current.scrollIntoView({
                      behavior: 'smooth',
                      block: 'center',
                    });
                  }
                }}
                className={`border bg-transparent border-[#D1ECFF] py-2 px-2 rounded-md mb-4 w-full ${
                  isMobile
                    ? 'text-base py-3 min-h-[120px]'
                    : 'min-h-[144px] flex-1 resize-none'
                }`}
              ></textarea>
              <button
                type='button'
                className={cn(
                  'flex w-full shrink-0 flex-col items-center justify-center',
                  isMobile ? 'mt-2' : 'mt-auto',
                  account.isDisconnected && 'opacity-50 cursor-not-allowed'
                )}
                onClick={() => {
                  if (!title || !description || !imageURI) {
                    toast.error(
                      'Please fill in all fields and check wallet connection.'
                    );
                    return;
                  }
                  if (!isZeroDev && balance && balance.value === BigInt(0)) {
                    toast.error(
                      'your wallet needs gas to submit a claim, please add funds on the correct network'
                    );
                    return;
                  }
                  onClose();
                  setShowConfirm(true);
                }}
              >
                <div className='button'>
                  <GameButton />
                  <p className='text-center mt-1'>create claim</p>
                </div>
              </button>
            </div>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
}
