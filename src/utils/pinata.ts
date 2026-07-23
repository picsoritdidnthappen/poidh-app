import axios from 'axios';

export async function compressImage(
  file: Blob,
  options: { maxDimension?: number; quality?: number } = {}
): Promise<Blob> {
  const { maxDimension = 1280, quality = 0.8 } = options;
  if (typeof window === 'undefined') return file;
  if (!file.type.startsWith('image/')) return file;

  // NOTE: we intentionally do NOT early-return on file.size or on
  // scale === 1 anymore. Every image, regardless of size or dimensions,
  // must pass through the canvas re-encode below — that step is what
  // strips EXIF/GPS/camera metadata. Skipping it for "already small
  // enough" images was letting metadata (including GPS coordinates)
  // through unstripped for anything <100KB or already <=maxDimension.

  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    const scale = Math.min(1, maxDimension / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
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

const apiUrl =
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000'
    : 'https://us-central1-plated-hangout-393021.cloudfunctions.net/poidh';

export const uploadFile = async (file: string | Blob) => {
  try {
    let processedFile: string | Blob = file;
    if (file instanceof Blob) {
      processedFile = await compressImage(file);
    }
    const formData = new FormData();
    formData.append('image', processedFile);
    const response = await axios.post(`${apiUrl}/uploadFile`, formData);
    return response.data;
  } catch (error) {
    console.error(error);
    return undefined;
  }
};

export const uploadMetadata = async (metadata: PinataMetadata) => {
  try {
    const response = await axios.post(`${apiUrl}/uploadMetadata`, {
      metadata,
    });
    return response.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

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
