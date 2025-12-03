import { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-toastify';
import { useAtomValue, useSetAtom } from 'jotai';

import { useChainInfo } from '@/hooks/useGetChain';
import { buildMetadata, cn, uploadFile, uploadMetadata } from '@/utils';
import { useAccount, useSwitchChain, useWriteContract } from 'wagmi';
import abi from '@/constant/abi/abi';
import Image from 'next/image';
import { useMutation } from '@tanstack/react-query';

import { Dialog, DialogContent, DialogActions, Box } from '@mui/material';
import { decodeEventLog } from 'viem';
import { trpc, trpcClient } from '@/trpc/client';
import GameButton from '@/components/global/GameButton';
import ButtonCTA from '@/components/global/ButtonCTA';
import { pollingChainIdAtom, setLoadingAtom } from '@/store/loading';
import ClaimConfirm from '@/components/claims/ClaimConfirm';
import ClaimSuccessModal from '@/components/claims/ClaimSuccessModal';

const LINK_IPFS = 'https://beige-impossible-dragon-883.mypinata.cloud/ipfs';

type SuccessPayload = {
  claimImage: string;
  claimTitle: string;
};

export default function FormClaim({
  bountyId,
  open,
  onClose,
}: {
  bountyId: string;
  open: boolean;
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
  const utils = trpc.useUtils();
  const setLoading = useSetAtom(setLoadingAtom);
  const setPollingChainId = useSetAtom(pollingChainIdAtom);
  const pollingChainId = useAtomValue(pollingChainIdAtom);

  const account = useAccount();
  const writeContract = useWriteContract({});
  const chain = useChainInfo();
  const switchChain = useSwitchChain();

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
    mutationFn: async (bountyId: bigint) => {
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
        args: [bountyId, title, uri, description],
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
      utils.bounties.claims.refetch();
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
        onConfirm={() => createClaimMutations.mutate(BigInt(bountyId))}
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
        maxWidth='xs'
        PaperProps={{
          className: 'bg-poidhBlue/80 relative',
          style: {
            borderRadius: '10px',
            color: 'white',
            border: '1px solid #D1ECFF',
          },
        }}
      >
        <button
          onClick={onClose}
          className='absolute top-4 right-4 text-white hover:opacity-70 transition-opacity'
          aria-label='Close'
        >
          <svg
            xmlns='http://www.w3.org/2000/svg'
            width='24'
            height='24'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
          >
            <line x1='18' y1='6' x2='6' y2='18'></line>
            <line x1='6' y1='6' x2='18' y2='18'></line>
          </svg>
        </button>
        <DialogContent className='pt-8'>
          <div
            {...getRootProps()}
            className='flex items-center flex-col text-left text-white rounded-[30px] border border-[#D1ECFF] border-dashed p-5 w-full justify-center cursor-pointer mt-4'
          >
            <input {...getInputProps()} />
            {isDragActive ? (
              <p>Drop the image here...</p>
            ) : (
              <p>
                {imageURI
                  ? 'Image uploaded'
                  : 'Drag & drop or click to upload an image'}
              </p>
            )}
            {preview && (
              <Image
                src={preview}
                alt='Preview'
                className='w-full max-w-[300px] h-auto max-h-[300px] mt-2 rounded-md object-contain'
              />
            )}
          </div>
          <Box mt={2} mb={-3}>
            <span>title</span>
            <input
              type='text'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className='border bg-transparent border-[#D1ECFF] py-2 px-2 rounded-md mb-4 w-full'
            />
            <span>description</span>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className='border bg-transparent border-[#D1ECFF] py-2 px-2 rounded-md mb-4 w-full'
            ></textarea>
          </Box>
        </DialogContent>
        <DialogActions className='pb-6'>
          <button
            className={cn(
              'flex flex-col items-center justify-center w-full',
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
        </DialogActions>
      </Dialog>
    </>
  );
}
