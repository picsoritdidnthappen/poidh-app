import axios from 'axios';

export async function compressImage(
  file: Blob,
  options: { maxDimension?: number; quality?: number } = {}
): Promise<Blob> {
  const { maxDimension = 1280, quality = 0.8 } = options;
  if (typeof window === 'undefined') return file;
  if (!file.type.startsWith('image/')) return file;
  if (file.size < 100 * 1024) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    const scale = Math.min(1, maxDimension / Math.max(width, height));
    if (scale === 1) return file;
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve) => {
      canvas.toBlob(
        (blob) => {
          resolve(blob ?? file);
        },
        'image/jpeg',
        quality
      );
    });
  } catch (err) {
    console.error('Image compression failed', err);
    return file;
  }
}

type PinataMetadata = {
  name: string;
  description: string;
  image: string;
  external_url: string;
  attributes: never[];
};

type UploadResult = {
  IpfsHash: string;
  PinSize?: number;
  Timestamp?: string;
};

function uploadConfig() {
  const token = process.env.NEXT_PUBLIC_IPFS_API_TOKEN?.trim();
  if (!token) {
    throw new Error('Image upload is not configured: missing API token');
  }
  const apiUrl = (
    process.env.NEXT_PUBLIC_IPFS_API_URL ||
    'https://poidh-ipfs-service-production.up.railway.app'
  ).replace(/\/+$/, '');
  return {
    apiUrl,
    options: {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 120000,
    },
  };
}

async function postUpload(
  endpoint: 'uploadFile' | 'uploadMetadata',
  body: FormData | { metadata: PinataMetadata }
): Promise<UploadResult> {
  const { apiUrl, options } = uploadConfig();
  let result: UploadResult;
  try {
    const response = await axios.post<UploadResult>(
      `${apiUrl}/${endpoint}`,
      body,
      options
    );
    result = response.data;
  } catch (error) {
    // Axios errors include request headers. Never propagate/log the Bearer token.
    const status = axios.isAxiosError(error)
      ? error.response?.status
      : undefined;
    throw new Error(
      status
        ? `Upload failed (HTTP ${status})`
        : 'Upload failed; please try again'
    );
  }
  if (
    !result ||
    typeof result.IpfsHash !== 'string' ||
    !result.IpfsHash.trim()
  ) {
    throw new Error('Upload service returned an invalid image/metadata CID');
  }
  return result;
}

export const uploadFile = async (file: Blob): Promise<UploadResult> => {
  if (!(file instanceof Blob) || file.size === 0) {
    throw new Error('Select a non-empty image file');
  }
  const processedFile = await compressImage(file);
  const formData = new FormData();
  formData.append('image', processedFile, 'upload');
  // Let the browser set the multipart boundary; the backend validates image bytes.
  return postUpload('uploadFile', formData);
};

export const uploadMetadata = async (
  metadata: PinataMetadata
): Promise<UploadResult> => postUpload('uploadMetadata', { metadata });

export const buildMetadata = (
  imageURI: string,
  name: string,
  description: string
): PinataMetadata => {
  const metadata = {
    description: description,
    external_url: 'https://poidh.xyz/',
    image: imageURI,
    name: name,
    attributes: [],
  };
  return metadata;
};

export default buildMetadata;
