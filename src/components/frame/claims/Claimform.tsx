import { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-toastify';
import Image from 'next/image';
import { useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogActions } from '@mui/material';
import { buildMetadata, cn, uploadFile, uploadMetadata } from '@/utils';
import { useGetChain } from '@/hooks/useGetChain';
import { trpc, trpcClient } from '@/trpc/client';
import Loading from '@/components/global/Loading';
import GameButton from '@/components/global/GameButton';
import { useAccount, usePublicClient, useWriteContract } from 'wagmi';
import abi from '@/constant/abi/abi';
import ButtonCTA from '@/components/global/ButtonCTA';

const LINK_IPFS = 'https://beige-impossible-dragon-883.mypinata.cloud/ipfs';

export default function ClaimForm({
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
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const utils = trpc.useUtils();
  const [uploading, setUploading] = useState(false);

  const account = useAccount();
  const chain = useGetChain();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

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
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      }
    }
    throw new Error('All attempts failed');
  };

  useEffect(() => {
    const uploadImage = async () => {
      if (file) {
        setUploading(true);
        try {
          const cid = await retryUpload(file);
          setImageURI(`${LINK_IPFS}/${cid}`);
        } catch (error) {
          console.error('Error uploading file:', error);
          toast.error('Trouble uploading file');
        }
        setUploading(false);
      }
    };

    uploadImage();
  }, [file]);

  const doTransaction = async (bountyId: bigint) => {
    try {
      setStatus('Sending transaction');
      const metadata = buildMetadata(imageURI, name, description);
      const metadataResponse = await uploadMetadata(metadata);
      const uri = `${LINK_IPFS}/${metadataResponse.IpfsHash}`;

      const hash = await writeContractAsync({
        abi,
        address: chain.contracts.mainContract as `0x${string}`,
        functionName: 'createClaim',
        args: [bountyId, name, uri, description],
        chainId: chain.id,
      });

      setStatus('Waiting for confirmation');
      const transaction = await publicClient?.waitForTransactionReceipt({
        hash,
      });

      await bountyMutation.mutate(BigInt(bountyId));
    } catch (error) {
      console.error(error);
      toast.error('Failed to create claim: ' + (error as any).message);
      setStatus('Failed to create claim');
    }
  };

  const bountyMutation = useMutation({
    mutationFn: async (bountyId: bigint) => {
      for (let i = 0; i < 60; i++) {
        setStatus('Indexing ' + i + 's');
        const claim = await trpcClient.isClaimCreated.query({
          id: Number(bountyId),
          chainId: chain.id,
        });
        if (claim) {
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 1_000));
      }

      throw new Error('Failed to index bounty');
    },
    onSuccess: () => {
      toast.success('Claim created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create claim: ' + error.message);
    },
    onSettled: () => {
      utils.bountyClaims.refetch();
      setName('');
      setDescription('');
      setImageURI('');
      setPreview('');
    },
  });

  return (
    <>
      <Loading open={bountyMutation.isPending} status={status} />
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth='xs'
        PaperProps={{
          className: 'bg-poidhBlue/80',
          style: {
            borderRadius: '10px',
            color: 'white',
            border: '1px solid #D1ECFF',
            background: '#12AAFF',
          },
        }}
      >
        <DialogContent>
          <div
            {...getRootProps()}
            className='flex items-center flex-col text-left text-white rounded-[30px] border border-[#D1ECFF] border-dashed p-5 w-full lg:min-w-[400px] justify-center cursor-pointer'
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
                className='w-[300px] h-[300px] mt-2 rounded-md object-contain'
                width={300}
                height={300}
              />
            )}
          </div>
          <div className='mt-4 mb-0'>
            <span>title</span>
            <input
              type='text'
              value={name}
              onChange={(e) => setName(e.target.value)}
              className='border bg-transparent border-[#D1ECFF] py-2 px-2 rounded-md mb-4 w-full'
            />
            <span>description</span>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className='border bg-transparent border-[#D1ECFF] py-2 px-2 rounded-md mb-4 w-full'
            />
          </div>
        </DialogContent>
        <DialogActions>
          <button
            className={cn(
              'flex flex-row items-center justify-center',
              account.isDisconnected && 'opacity-50 cursor-not-allowed'
            )}
            onClick={() => {
              if (name && description && imageURI && !uploading) {
                onClose();
                doTransaction(BigInt(bountyId));
              } else {
                toast.error(
                  'Please fill in all fields and check wallet connection.'
                );
              }
            }}
          >
            <div className='button'>
              <GameButton />
            </div>
            <ButtonCTA>create claim</ButtonCTA>
          </button>
        </DialogActions>
      </Dialog>
    </>
  );
}
