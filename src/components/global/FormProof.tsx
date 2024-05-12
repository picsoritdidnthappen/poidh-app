import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import imageCompression from 'browser-image-compression';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-toastify';

import { createClaim } from '@/app/context/web3';

import { buildMetadata, uploadFile, uploadMetadata } from '../../lib/pinata';

interface FormProofProps {
  bountyId: string;
  showForm?: boolean;
}

const FormProof: React.FC<FormProofProps> = ({ bountyId }) => {
  const [walletMessage, setWalletMessage] = useState('');

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
  const [imageURI, setImageURI] = useState('');
  const [uploading, setUploading] = useState(false);
  const inputFile = useRef<HTMLInputElement>(null);

  const compressImage = async (image: File): Promise<File> => {
    const options = {
      maxSizeMB: 10,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
    };
    try {
      const compressedFile = await imageCompression(image, options);
      return compressedFile;
    } catch (error) {
      console.error('Error compressing image:', error);
      throw error;
    }
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
        setUploading(true);
        try {
          const compressedFile = await compressImage(file);
          const cid = await retryUpload(compressedFile);
          setImageURI(
            `https://beige-impossible-dragon-883.mypinata.cloud/ipfs/${cid}`
          );
        } catch (error) {
          console.error('Error uploading file:', error);
          alert('Trouble uploading file');
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
      const uri = `https://beige-impossible-dragon-883.mypinata.cloud/ipfs/${metadataResponse.IpfsHash}`;
      await createClaim(primaryWallet, name, uri, description, bountyId);
      toast.success('Claim created successfully!');
    } catch (error: unknown) {
      console.error('Error creating claim:', error);
      const errorCode = (error as any)?.info?.error?.code;
      if (errorCode === 4001) {
        toast.error('Transaction denied by user');
      } else {
        toast.error('Failed to create claim');
      }
    }
  };

  return (
    <div className='mt-10 flex text-left flex-col text-white rounded-md border border-[#D1ECFF] p-5 flex w-full lg:min-w-[400px] justify-center backdrop-blur-sm bg-white/30'>
      <div
        {...getRootProps()}
        className='flex items-center flex-col text-left text-white rounded-[30px] border border-[#D1ECFF] border-dashed p-5 w-full lg:min-w-[400px] justify-center cursor-pointer'
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Drop the files here ...</p>
        ) : (
          <p>drop the file here ...</p>
        )}
        {preview && (
          <img
            src={preview}
            alt='Preview'
            style={{ width: '200px', height: '200px', marginTop: '10px' }}
          />
        )}
      </div>

      <span>name</span>
      <input
        type='text'
        placeholder=''
        value={name}
        onChange={(e) => setName(e.target.value)}
        className='border bg-transparent border-[#D1ECFF] py-2 px-2 rounded-md mb-4'
      />

      <span>description</span>
      <textarea
        rows={3}
        placeholder=''
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className='border bg-transparent border-[#D1ECFF] py-2 px-2 rounded-md mb-4'
      ></textarea>

      <button disabled={uploading} onClick={() => inputFile.current?.click()}>
        {uploading ? 'uploading...' : 'upload'}
      </button>

      <button
        className={`border border-white mt-5 rounded-full px-5 py-2 ${
          !primaryWallet ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        onClick={() => {
          if (!primaryWallet) {
            toast.error('Please connect wallet to continue');
            // setWalletMessage("Please connect wallet to continue");
          } else {
            handleCreateClaim();
          }
        }}
        onMouseEnter={() => {
          if (!primaryWallet) {
            toast.error('Please connect wallet to continue');
            // setWalletMessage("Please connect wallet to continue");
          }
        }}
        onMouseLeave={() => {
          setWalletMessage('');
        }}
      >
        create claim
      </button>
      <span id='walletMessage'>{walletMessage}</span>
    </div>
  );
};

export default FormProof;
