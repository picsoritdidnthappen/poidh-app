/* eslint-disable simple-import-sort/imports */
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import imageCompression from 'browser-image-compression';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-toastify';

import { buildMetadata, uploadFile, uploadMetadata } from '@/lib';
import { createClaim } from '@/app/context';

const LINK_IPFS = 'https://beige-impossible-dragon-883.mypinata.cloud/ipfs';

export default function FormClaim({ bountyId }: { bountyId: string }) {
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

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });
  const [preview, setPreview] = useState('');
  const { primaryWallet } = useDynamicContext();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [imageURI, setImageURI] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const inputFile = useRef<HTMLInputElement>(null);

  const compressImage = async (image: File): Promise<File> => {
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
    };

    const compressedFile = await imageCompression(image, options);
    return compressedFile;
  };

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
          const compressedFile = await compressImage(file);
          const cid = await retryUpload(compressedFile);
          setImageURI(`${LINK_IPFS}/${cid}`);
        } catch (error) {
          toast.error('Trouble uploading file');
        }
        setUploading(false);
      }
    };

    uploadImage();
  }, [file]);

  const handleCreateClaim = async () => {
    if (!name || !description || !primaryWallet || !imageURI) {
      toast.error(
        'Please fill in all fields, upload an image, and connect wallet'
      );
      return;
    }

    try {
      const metadata = buildMetadata(imageURI, name, description);
      const metadataResponse = await uploadMetadata(metadata);
      const uri = `${LINK_IPFS}/${metadataResponse.IpfsHash}`;
      await createClaim(primaryWallet, name, uri, description, bountyId);
      toast.success('Claim created successfully!');
      window.location.reload();
    } catch (error: any) {
      if (error.info?.error?.code !== 4001) {
        toast.error('Failed to create claim');
      }
    }
  };

  return (
    <div className='mt-10 text-left flex-col text-white rounded-md border border-[#D1ECFF] p-5 flex w-full lg:min-w-[400px] justify-center backdrop-blur-sm bg-poidhBlue/60'>
      <div
        {...getRootProps()}
        className='flex items-center flex-col text-left text-white rounded-[30px] border border-[#D1ECFF] border-dashed p-5 w-full lg:min-w-[400px] justify-center cursor-pointer'
      >
        <input {...getInputProps()} />
        {isDragActive && <p>drop files here…</p>}
        {preview && (
          <img
            src={preview}
            alt='Preview'
            style={{
              width: '300px',
              height: '300px',
              marginTop: '10px',
              borderRadius: '10px',
              objectFit: 'contain',
            }}
          />
        )}
      </div>

      <span>name</span>
      <input
        type='text'
        value={name}
        onChange={(e) => setName(e.target.value)}
        className='border bg-transparent border-[#D1ECFF] py-2 px-2 rounded-md mb-4'
      />

      <span>description</span>
      <textarea
        rows={3}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className='border bg-transparent border-[#D1ECFF] py-2 px-2 rounded-md mb-4'
      ></textarea>

      <button disabled={uploading} onClick={() => inputFile.current?.click()}>
        {uploading ? 'uploading image...' : 'upload'}
      </button>

      <button
        className={`border bg-poidhRed mt-5 rounded-full px-5 py-2 ${
          !primaryWallet ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        onClick={() => {
          if (!primaryWallet) {
            toast.error('Please connect wallet to continue');
          } else {
            handleCreateClaim();
          }
        }}
      >
        create claim
      </button>
    </div>
  );
}
