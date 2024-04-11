import axios from 'axios';

const apiUrl =
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:3001'
    : 'https://us-central1-plated-hangout-393021.cloudfunctions.net/poidh';

export const uploadFile = async (file: string | Blob) => {
  try {
    const formData = new FormData();
    formData.append('image', file);
    const response = await axios.post(`${apiUrl}/uploadFile`, formData);
    return response.data;
  } catch (error) {
    console.error(error);
    return undefined;
  }
};

export const uploadMetadata = async (metadata: any) => {
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

export const buildMetadata = (imageURI: any, name: any, description: any) => {
  const metadata = {
    description: description,
    external_url: 'https://kaspotz.github.io/pics-or-it/',
    image: imageURI,
    name: name,
    attributes: [],
  };
  return metadata;
};

export default buildMetadata;
