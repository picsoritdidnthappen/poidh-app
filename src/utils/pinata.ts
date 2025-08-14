import axios from 'axios';

export async function compressImage(
  file: Blob,
  options: { maxDimension?: number; quality?: number } = {}
): Promise<Blob> {
  const { maxDimension = 1280, quality = 0.8 } = options;
  if (typeof window === 'undefined') return file;
  if (!file.type.startsWith('image/')) return file;
  if (file.size < 100 * 1024) return file;
  console.log('Compressing image');
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

const apiUrl =
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:3001'
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
