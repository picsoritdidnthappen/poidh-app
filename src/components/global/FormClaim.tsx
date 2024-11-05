import imageCompression from 'browser-image-compression';
import { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-toastify';

import { useGetChain } from '@/hooks/useGetChain';
import { buildMetadata, uploadFile, uploadMetadata } from '@/utils';
import { useAccount, useSwitchChain, useWriteContract } from 'wagmi';
import abi from '@/constant/abi/abi';
import Image from 'next/image';
import { useMutation } from '@tanstack/react-query';

import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Box,
} from '@mui/material';

const LINK_IPFS = 'https://beige-impossible-dragon-883.mypinata.cloud/ipfs';

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
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);

  const account = useAccount();
  const writeContract = useWriteContract({});
  const chain = useGetChain();
  const switchChain = useSwitchChain();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      const reader = new FileReader();

      reader.onload = (e: ProgressEvent<FileReader>) => {
        if (e.target?.result) {
          setPreview(e.target.result.toString());
          handleImageUpload(selectedFile);
        }
      };

      reader.readAsDataURL(selectedFile);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
    },
    disabled: !!imageURI,
  });

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const compressedFile = await compressImage(file);
      const cid = await retryUpload(compressedFile);
      setImageURI(`${LINK_IPFS}/${cid}`);
    } catch (error) {
      toast.error('Error uploading image');
    } finally {
      setUploading(false);
    }
  };

  const compressImage = async (image: File): Promise<File> => {
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
    };
    return await imageCompression(image, options);
  };

  const retryUpload = async (file: File): Promise<string> => {
    const MAX_RETRIES = 6;
    const RETRY_DELAY = 3000;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const cid = await uploadFile(file);
        return cid.IpfsHash;
      } catch (error) {
        if (attempt === MAX_RETRIES) throw error;
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      }
    }
    throw new Error('All upload attempts failed');
  };

  const createClaimMutations = useMutation({
    mutationFn: async (bountyId: bigint) => {
      if (chain.id !== account.chainId) {
        await switchChain.switchChainAsync({ chainId: chain.id });
      }
      const metadata = buildMetadata(imageURI, name, description);
      const metadataResponse = await uploadMetadata(metadata);
      const uri = `${LINK_IPFS}/${metadataResponse.IpfsHash}`;
      await writeContract.writeContractAsync({
        __mode: 'prepared',
        abi,
        address: chain.contracts.mainContract as `0x${string}`,
        functionName: 'createClaim',
        args: [bountyId, name, uri, description],
      });
    },
  });

  useEffect(() => {
    if (createClaimMutations.isSuccess) {
      toast.success('Claim created successfully');
      onClose();
    }
    if (createClaimMutations.isError) {
      toast.error('Failed to create claim');
    }
  }, [createClaimMutations.isSuccess, createClaimMutations.isError, onClose]);

  return (
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
        },
      }}
    >
      <DialogContent>
        <div
          {...getRootProps()}
          style={{
            border: '2px dashed #D1ECFF',
            padding: '20px',
            borderRadius: '30px',
            textAlign: 'center',
            cursor: imageURI ? 'default' : 'pointer',
            marginBottom: '10px',
            opacity: imageURI ? 0.5 : 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            height: '300px',
          }}
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
              width={200}
              height={200}
              style={{
                marginTop: '10px',
                borderRadius: '10px',
                objectFit: 'contain',
              }}
            />
          )}
        </div>
        <Box mt={2} mb={-3}>
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
          ></textarea>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            if (name && description && account.isConnected && imageURI) {
              createClaimMutations.mutate(BigInt(bountyId));
            } else {
              toast.error(
                'Please fill in all fields, upload an image, and connect wallet'
              );
            }
          }}
          color='error'
          variant='contained'
          className='w-full rounded-full'
          disabled={
            account.isDisconnected ||
            !name ||
            !description ||
            uploading ||
            !imageURI
          }
        >
          {uploading ? <CircularProgress size={24} /> : 'Create Claim'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
