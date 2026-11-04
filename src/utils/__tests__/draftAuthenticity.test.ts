/** @jest-environment node */
import { privateKeyToAccount } from 'viem/accounts';
import axios from 'axios';
import { getDraftPublishMessage } from '@/mcp/draftSigning';
import { getVerifiedDraft, isAuthenticDraft } from '../draftAuthenticity';

jest.mock('@/utils/config', () => ({
  chains: {
    base: { provider: { verifyMessage: jest.fn().mockResolvedValue(false) } },
  },
}));
jest.mock('next/dist/server/web/exports/next-response', () => ({
  __esModule: true,
  default: {
    json: (body: unknown, options?: { status?: number }) => ({
      status: options?.status ?? 200,
      body,
    }),
  },
}));
jest.mock('react', () => ({ ...jest.requireActual('react'), cache: (fn: unknown) => fn }));
jest.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }));
jest.mock('axios', () => ({
  __esModule: true,
  default: { get: jest.fn(), isAxiosError: jest.fn().mockReturnValue(false) },
}));
import { GET } from '@/app/d/[cid]/data/route';
const mockAxios = axios as jest.Mocked<typeof axios>;
const cid = `b${'a'.repeat(40)}`;
const account = privateKeyToAccount(`0x${'11'.repeat(32)}`);
const fields = {
  title: 'A title',
  description: 'Description',
  amount: '1',
  chain: 'base' as const,
  isOpenBounty: true,
  album: '',
};
const unsigned = {
  type: 'poidh-bounty-draft',
  version: 1,
  creator: account.address.toLowerCase(),
  ...fields,
  createdAt: '2026-01-01T00:00:00.000Z',
};
const pinList = (rows: unknown[]) =>
  jest.fn().mockResolvedValue({ ok: true, json: async () => ({ rows }) });
const request = () =>
  GET({ url: `https://poidh.xyz/d/${cid}/data` } as Request, {
    params: Promise.resolve({ cid }),
  });

beforeEach(() => {
  jest.clearAllMocks();
  process.env.PINATA_DRAFTS_READ_JWT = 'test';
  process.env.PINATA_DRAFT_GATEWAY_URL = 'https://gateway.example';
  global.fetch = pinList([]) as typeof fetch;
});

test('serves a valid signed draft and rejects tampered title or creator', async () => {
  const site = 'https://poidh.xyz';
  const nonce = 'testnonce123';
  const signature = await account.signMessage({
    message: getDraftPublishMessage({
      site,
      nonce,
      creator: unsigned.creator,
      draft: fields,
    }),
  });
  const draft = {
    ...unsigned,
    authorization: { method: 'eip191', site, nonce, signature },
  };
  expect(await isAuthenticDraft(cid, draft)).toBe(true);
  mockAxios.get.mockResolvedValue({ data: JSON.stringify(draft) });
  const signedResult = await request() as unknown as { status: number; body: Record<string, unknown> };
  expect(signedResult.status).toBe(200);
  expect(signedResult.body.createdAt).toBeUndefined();
  for (const changed of [
    { ...draft, title: 'Fake' },
    { ...draft, creator: `0x${'22'.repeat(20)}` },
  ]) {
    expect(await isAuthenticDraft(cid, changed)).toBe(false);
    mockAxios.get.mockResolvedValue({ data: JSON.stringify(changed) });
    expect((await request()).status).toBe(404);
  }
});

test('serves an exact poidh pin and rejects an unsigned unpinned draft', async () => {
  global.fetch = pinList([
    {
      ipfs_pin_hash: cid,
      metadata: {
        keyvalues: { type: 'bounty-draft', creator: unsigned.creator },
      },
    },
  ]) as typeof fetch;
  mockAxios.get.mockResolvedValue({ data: JSON.stringify(unsigned) });
  expect(await isAuthenticDraft(cid, unsigned)).toBe(true);
  expect((await request()).status).toBe(200);
  global.fetch = pinList([]) as typeof fetch;
  expect((await request()).status).toBe(404);
});

test('returns 502 when pin lookup fails', async () => {
  global.fetch = jest
    .fn()
    .mockResolvedValue({ ok: false, status: 503 }) as typeof fetch;
  mockAxios.get.mockResolvedValue({ data: JSON.stringify(unsigned) });
  await expect(isAuthenticDraft(cid, unsigned)).rejects.toThrow();
  expect((await request()).status).toBe(502);
});

test('does not accept a partial hash or mismatched pin metadata', async () => {
  for (const row of [
    { ipfs_pin_hash: `${cid}a`, metadata: { keyvalues: { type: 'bounty-draft', creator: unsigned.creator } } },
    { ipfs_pin_hash: cid, metadata: { keyvalues: { type: 'other', creator: unsigned.creator } } },
    { ipfs_pin_hash: cid, metadata: { keyvalues: { type: 'bounty-draft', creator: `0x${'22'.repeat(20)}` } } },
  ]) {
    global.fetch = pinList([row]) as typeof fetch;
    expect(await isAuthenticDraft(cid, unsigned, 'https://poidh.xyz')).toBe(false);
  }
});

test('rejects signatures for another site', async () => {
  const site = 'https://staging.poidh.xyz';
  const nonce = 'testnonce123';
  const signature = await account.signMessage({ message: getDraftPublishMessage({ site, nonce, creator: unsigned.creator, draft: fields }) });
  expect(await isAuthenticDraft(cid, { ...unsigned, authorization: { method: 'eip191', site, nonce, signature } }, 'https://poidh.xyz')).toBe(false);
});

test('accepts a pinned draft with malformed authorization and exposes only allowed fields', async () => {
  global.fetch = pinList([{ ipfs_pin_hash: cid, metadata: { keyvalues: { type: 'bounty-draft', creator: unsigned.creator } } }]) as typeof fetch;
  mockAxios.get.mockResolvedValue({ data: JSON.stringify({ ...unsigned, authorization: 'malformed', secret: 'private' }) });
  const result = await request() as unknown as { status: number; body: Record<string, unknown> };
  expect(result.status).toBe(200);
  expect(result.body.secret).toBeUndefined();
  expect(Object.keys(result.body).sort()).toEqual(['type', 'version', 'creator', 'title', 'description', 'amount', 'chain', 'isOpenBounty', 'album', 'createdAt', 'authorization', 'url'].sort());
});

test('uses contract wallet verification and propagates RPC failures', async () => {
  const { chains } = jest.requireMock('@/utils/config');
  const verify = chains.base.provider.verifyMessage as jest.Mock;
  const draft = { ...unsigned, authorization: { method: 'eip191', site: 'https://poidh.xyz', nonce: 'testnonce123', signature: '0x1234' } };
  verify.mockResolvedValueOnce(true);
  expect(await isAuthenticDraft(cid, draft, 'https://poidh.xyz')).toBe(true);
  verify.mockRejectedValueOnce(new Error('RPC unavailable'));
  await expect(isAuthenticDraft(cid, draft, 'https://poidh.xyz')).rejects.toThrow('RPC unavailable');
});

test('rejects a signed draft that fails the POST schema', async () => {
  const invalidFields = { ...fields, amount: '0' };
  const site = 'https://poidh.xyz';
  const nonce = 'testnonce123';
  const signature = await account.signMessage({ message: getDraftPublishMessage({ site, nonce, creator: unsigned.creator, draft: invalidFields }) });
  expect(await isAuthenticDraft(cid, { ...unsigned, ...invalidFields, authorization: { method: 'eip191', site, nonce, signature } }, site)).toBe(false);
});

test('throws for missing JWT and invalid Pinata rows', async () => {
  delete process.env.PINATA_DRAFTS_READ_JWT;
  await expect(isAuthenticDraft(cid, unsigned)).rejects.toThrow();
  process.env.PINATA_DRAFTS_READ_JWT = 'test';
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ rows: null }) }) as typeof fetch;
  await expect(isAuthenticDraft(cid, unsigned)).rejects.toThrow();
});


test('maps a gateway 404 to a cached not found response and retries lookup', async () => {
  mockAxios.get.mockReset().mockRejectedValueOnce({ response: { status: 404 } }).mockResolvedValue({ data: JSON.stringify(unsigned) });
  const result = await request() as unknown as { status: number };
  expect(result.status).toBe(404);
  global.fetch = pinList([{ ipfs_pin_hash: cid, metadata: { keyvalues: { type: 'bounty-draft', creator: unsigned.creator } } }]) as typeof fetch;
  expect(await getVerifiedDraft(cid, 'https://poidh.xyz')).not.toBeNull();
});

test('retries a failed lookup on the next call', async () => {
  mockAxios.get.mockReset().mockRejectedValueOnce({ code: 'ETIMEDOUT' }).mockResolvedValue({ data: JSON.stringify(unsigned) });
  global.fetch = pinList([{ ipfs_pin_hash: cid, metadata: { keyvalues: { type: 'bounty-draft', creator: unsigned.creator } } }]) as typeof fetch;
  await expect(getVerifiedDraft(cid, 'https://poidh.xyz')).rejects.toThrow();
  expect(await getVerifiedDraft(cid, 'https://poidh.xyz')).not.toBeNull();
});

test('accepts a pin when contract verification throws', async () => {
  const { chains } = jest.requireMock('@/utils/config');
  chains.base.provider.verifyMessage.mockRejectedValueOnce(new Error('RPC unavailable'));
  global.fetch = pinList([{ ipfs_pin_hash: cid, metadata: { keyvalues: { type: 'bounty-draft', creator: unsigned.creator } } }]) as typeof fetch;
  const draft = { ...unsigned, authorization: { method: 'eip191', site: 'https://poidh.xyz', nonce: 'testnonce123', signature: '0x1234' } };
  expect(await isAuthenticDraft(cid, draft, 'https://poidh.xyz')).toBe(true);
});

test('caches verdicts by CID and site for 60 seconds', async () => {
  jest.resetModules();
  const entries = new Map<string, unknown>();
  const configurations: { keys: string[]; revalidate: number }[] = [];
  jest.doMock('next/cache', () => ({
    unstable_cache: (fn: (...args: unknown[]) => Promise<unknown>, keys: string[], options: { revalidate: number }) => {
      configurations.push({ keys, revalidate: options.revalidate });
      return async (...args: unknown[]) => {
        const key = JSON.stringify([keys, args]);
        if (entries.has(key)) return entries.get(key);
        const value = await fn(...args);
        entries.set(key, value);
        return value;
      };
    },
  }));
  const { getVerifiedDraft: lookup } = await import('../draftAuthenticity');
  (jest.requireMock('axios').default.get as jest.Mock).mockReset().mockResolvedValue({ data: JSON.stringify(unsigned) });
  global.fetch = pinList([{ ipfs_pin_hash: cid, metadata: { keyvalues: { type: 'bounty-draft', creator: unsigned.creator } } }]) as typeof fetch;
  await lookup(cid, 'https://poidh.xyz');
  await lookup(cid, 'https://poidh.xyz');
  expect(global.fetch).toHaveBeenCalledTimes(1);
  await lookup(cid, 'https://staging.poidh.xyz');
  expect(global.fetch).toHaveBeenCalledTimes(2);
  expect(configurations).toContainEqual({ keys: ['poidh-draft-verdict-v1'], revalidate: 60 });
});
