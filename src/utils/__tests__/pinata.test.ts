import axios from 'axios';

import buildMetadata, { uploadFile, uploadMetadata } from '../pinata';

jest.mock('axios', () => ({
  __esModule: true,
  default: { post: jest.fn(), isAxiosError: jest.fn() },
}));
const post = axios.post as jest.MockedFunction<typeof axios.post>;
const isAxiosError = axios.isAxiosError as jest.MockedFunction<
  typeof axios.isAxiosError
>;
const originalUrl = process.env.NEXT_PUBLIC_IPFS_API_URL;
const originalToken = process.env.NEXT_PUBLIC_IPFS_API_TOKEN;
const token = 'test-only-public-upload-token';
const result = { IpfsHash: 'QmTestImage' };

beforeEach(() => {
  jest.resetAllMocks();
  delete process.env.NEXT_PUBLIC_IPFS_API_URL;
  process.env.NEXT_PUBLIC_IPFS_API_TOKEN = token;
  post.mockResolvedValue({ data: result });
});

afterEach(() => {
  if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_IPFS_API_URL;
  else process.env.NEXT_PUBLIC_IPFS_API_URL = originalUrl;
  if (originalToken === undefined)
    delete process.env.NEXT_PUBLIC_IPFS_API_TOKEN;
  else process.env.NEXT_PUBLIC_IPFS_API_TOKEN = originalToken;
});

test('image upload defaults to Railway and sends multipart image plus Bearer', async () => {
  const image = new Blob(['test image bytes'], { type: 'image/png' });
  await expect(uploadFile(image)).resolves.toEqual(result);
  const [url, body, options] = post.mock.calls[0];
  expect(url).toBe(
    'https://poidh-ipfs-service-production.up.railway.app/uploadFile'
  );
  expect(body).toBeInstanceOf(FormData);
  expect((body as FormData).get('image')).toBeInstanceOf(Blob);
  expect(((body as FormData).get('image') as Blob).size).toBe(image.size);
  expect(options).toEqual({
    headers: { Authorization: `Bearer ${token}` },
    timeout: 120000,
  });
});

test('metadata uses the same credentials and preserves the existing envelope', async () => {
  process.env.NEXT_PUBLIC_IPFS_API_URL = 'http://localhost:3001/';
  const metadata = buildMetadata('ipfs://QmImage', 'Receipt', 'Proof');
  await expect(uploadMetadata(metadata)).resolves.toEqual(result);
  expect(post).toHaveBeenCalledWith(
    'http://localhost:3001/uploadMetadata',
    { metadata },
    {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 120000,
    }
  );
});

test('missing token blocks both upload endpoints before network requests', async () => {
  delete process.env.NEXT_PUBLIC_IPFS_API_TOKEN;
  await expect(uploadFile(new Blob(['image']))).rejects.toThrow(
    'missing API token'
  );
  await expect(
    uploadMetadata(buildMetadata('ipfs://test', 'test', 'test'))
  ).rejects.toThrow('missing API token');
  expect(post).not.toHaveBeenCalled();
});

test('empty files and strings cannot become image form fields', async () => {
  await expect(uploadFile(new Blob([]))).rejects.toThrow('non-empty image');
  // @ts-expect-error Runtime protection for callers outside TypeScript.
  await expect(uploadFile('text')).rejects.toThrow('non-empty image');
  expect(post).not.toHaveBeenCalled();
});

test('upstream failures throw sanitized errors without leaking request headers', async () => {
  isAxiosError.mockReturnValue(true);
  post.mockRejectedValue({
    response: { status: 401 },
    config: { headers: { Authorization: token } },
  });
  await expect(uploadFile(new Blob(['image']))).rejects.toThrow(
    'Upload failed (HTTP 401)'
  );
  expect(post).toHaveBeenCalledTimes(1);
});

test('network errors and malformed success responses do not silently return undefined', async () => {
  post.mockRejectedValueOnce(new Error(token));
  await expect(uploadFile(new Blob(['image']))).rejects.toThrow(
    'Upload failed; please try again'
  );
  for (const data of [null, {}, { IpfsHash: '' }, { IpfsHash: 123 }]) {
    post.mockResolvedValueOnce({ data });
    await expect(
      uploadMetadata(buildMetadata('ipfs://test', 'test', 'test'))
    ).rejects.toThrow('invalid image/metadata CID');
  }
});
