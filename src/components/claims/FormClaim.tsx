import { useCallback, useEffect, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-toastify';
import { useAtomValue, useSetAtom } from 'jotai';
import { useChainInfo } from '@/hooks/useChainInfo';
import { useScreenSize } from '@/hooks/useScreenSize';
import { cn } from '@/utils/utils';
import { useAccount, useSwitchChain, useWriteContract } from 'wagmi';
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
  const titleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const utils = trpc.useUtils();
  const setLoading = useSetAtom(setLoadingAtom);
  const setPollingChainId = useSetAtom(pollingChainIdAtom);
  const pollingChainId = useAtomValue(pollingChainIdAtom);

  const account = useAccount();
  const writeContract = useWriteContract({});
  const chain = useChainInfo();
  const switchChain = useSwitchChain();
  const isMobile = useScreenSize();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    setFile(file);
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      if (e.target?.result) {
        setPreview(e.target.result.toString());
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
    },
    onDropRejected: () => {
      toast.error('Please upload only image files');
    },
  });

  const retryUpload = async (file: File): Promise<string> => {
    const MAX_RETRIES = 6;
    const RETRY_DELAY = 3000;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const cid = await uploadFile(file);
        return cid.IpfsHash;
      } catch (error) {
        if (attempt === MAX_RETRIES) {
          throw error;
        }
        console.log(
          `Attempt ${attempt} failed, retrying in ${RETRY_DELAY}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      }
    }
    throw new Error('All attempts failed');
  };

  useEffect(() => {
    const uploadImage = async () => {
      if (file) {
        try {
          const cid = await retryUpload(file);
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
      const chainId = await account.connector?.getChainId();
      if (chain.id !== chainId) {
        setLoading({ isLoading: true, status: 'Switching network...' });
        await switchChain.switchChainAsync({ chainId: chain.id });
      }

      setLoading({ isLoading: true, status: 'Uploading metadata...' });
      const metadata = buildMetadata(imageURI, title, description);
      const metadataResponse = await uploadMetadata(metadata);
      const uri = `${LINK_IPFS}/${metadataResponse.IpfsHash}`;

      setLoading({ isLoading: true, status: 'Creating claim...' });
      setPollingChainId(chain.id);
      const tx = await writeContract.writeContractAsync({
        abi,
        address: chain.contracts.mainContract as `0x${string}`,
        functionName: 'createClaim',
        args: [BigInt(onChainBountyId), title, description, uri],
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
      toast.error('Failed to create claim: ' + error.message);
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
        maxWidth={isMobile ? false : 'xs'}
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          className: 'bg-poidhBlue/90 relative flex flex-col',
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
                  maxHeight: '90vh',
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
        {isMobile ? (
          <div className='flex items-center justify-between w-full sticky'>
            <div style={{ width: '40px' }} />{' '}
            <button
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
        ) : (
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              right: 10,
              top: 8,
              color: 'white',
              cursor: 'pointer',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
              transition: 'background-color 0.2s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                'rgba(255, 255, 255, 0.15)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                'transparent';
            }}
          >
            <CloseIcon size={12} />
          </button>
        )}
        <DialogContent
          sx={{
            position: 'relative',
            p: isMobile ? 2 : 3,
            pt: isMobile ? 1 : 3,
            mt: isMobile ? 0 : 1,
            ...(isMobile && {
              height: '100%',
              maxHeight: '100%',
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
            }),
          }}
        >
          <div
            {...getRootProps()}
            className={cn(
              'flex items-center flex-col text-center text-white rounded-3xl border-2 border-dashed p-8 w-full justify-center cursor-pointer transition-all duration-200',
              isDragActive
                ? 'border-white bg-white/10 scale-105'
                : 'border-[#D1ECFF] hover:border-white hover:bg-white/5'
            )}
          >
            <input {...getInputProps()} />
            {isDragActive ? (
              <div className='flex flex-col items-center gap-2'>
                <ImageIcon />
                <p className='text-sm font-medium'>Drop the image here...</p>
              </div>
            ) : (
              <div className='flex flex-col items-center gap-3'>
                {!imageURI && (
                  <svg
                    className='w-8 h-8 opacity-75'
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
                      : 'Drag & drop or click to upload'}
                  </p>
                  {!imageURI && (
                    <p className='text-xs opacity-70 mt-1'>
                      PNG, JPG, GIF, WebP, HEIC
                    </p>
                  )}
                </div>
              </div>
            )}
            {preview && (
              <Image
                src={preview}
                alt='Preview'
                width={280}
                height={280}
                className='w-full max-w-xs h-auto rounded-2xl object-contain mt-4 border border-white/20'
              />
            )}
          </div>
          <Box mt={2}>
            <span className={isMobile ? 'mb-2 text-base' : ''}>title</span>
            <input
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
            <span className={isMobile ? 'text-base mb-2' : ''}>
              description
            </span>
            <textarea
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
                isMobile ? 'text-base py-3 min-h-[120px]' : ''
              }`}
            ></textarea>
          </Box>
          <button
            className={cn(
              'flex flex-col items-center justify-center w-full mt-2',
              account.isDisconnected && 'opacity-50 cursor-not-allowed'
            )}
            onClick={() => {
              if (title && description && imageURI) {
                onClose();
                setShowConfirm(true);
              } else {
                toast.error(
                  'Please fill in all fields and check wallet connection.'
                );
              }
            }}
          >
            <div className='button'>
              <GameButton />
              <p className='text-center mt-1'>create claim</p>
            </div>
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}
