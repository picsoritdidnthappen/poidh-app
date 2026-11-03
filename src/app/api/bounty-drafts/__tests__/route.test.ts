/** @jest-environment node */
import { privateKeyToAccount } from 'viem/accounts';
import { verifyMessage } from 'viem';
import { getDraftPublishMessage } from '@/mcp/draftSigning';
import { claimNonce, isNonceUsable } from '@/trpc/nonce';
import { createContext } from '@/trpc/context';

jest.mock('viem', () => ({ ...jest.requireActual('viem'), verifyMessage: jest.fn(jest.requireActual('viem').verifyMessage) }));
jest.mock('@/trpc/context', () => ({ createContext: jest.fn() }));
jest.mock('@/trpc/nonce', () => ({
  DRAFT_NONCE_PREFIX: 'draft',
  claimNonce: jest.fn(),
  isNonceUsable: jest.fn(),
}));
const mockGetCode = jest.fn();
const mockVerifyMessage = jest.fn();
jest.mock('@/utils/config', () => ({
  chains: { base: { provider: {
    getCode: (...args: unknown[]) => mockGetCode(...args),
    verifyMessage: (...args: unknown[]) => mockVerifyMessage(...args),
  } } },
}));

// Jest 27 does not provide fetch globals in its node environment.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const undici = require('next/dist/compiled/undici') as Pick<typeof globalThis, 'Headers' | 'Request' | 'Response'>;
Object.assign(globalThis, { Headers: undici.Headers, Request: undici.Request, Response: undici.Response });
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { POST } = require('../route') as typeof import('../route');

const account = privateKeyToAccount(`0x${'11'.repeat(32)}`);
const site = 'https://poidh.xyz';
const nonce = 'draft123456789';
const draft = { title: 'Title', description: 'Description', amount: '0.01', chain: 'base' as const, isOpenBounty: true, album: '' };
const mockFetch = jest.fn();

async function request(options: { body?: typeof draft; signed?: typeof draft; nonce?: string; site?: string; signer?: typeof account; wrapped?: boolean } = {}) {
  const requestNonce = options.nonce ?? nonce;
  const requestSite = options.site ?? site;
  const signature = await (options.signer ?? account).signMessage({ message: getDraftPublishMessage({ site: requestSite, creator: account.address, nonce: requestNonce, draft: options.signed ?? draft }) });
  return POST(new Request(`${requestSite}/api/bounty-drafts`, { method: 'POST', headers: {
    'content-type': 'application/json', 'x-poidh-agent-publish': '1', 'x-poidh-agent-creator': account.address,
    'x-poidh-agent-nonce': requestNonce, 'x-poidh-agent-signature': options.wrapped ? `${signature}6492649264926492649264926492649264926492649264926492649264926492` : signature,
  }, body: JSON.stringify(options.body ?? draft) }));
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.PINATA_JWT = 'upload';
  process.env.PINATA_DRAFTS_READ_JWT = 'read';
  global.fetch = mockFetch as unknown as typeof fetch;
  mockFetch.mockImplementation(async (url: string) => url.includes('pinList')
    ? { ok: true, json: async () => ({ rows: [] }) }
    : { ok: true, json: async () => ({ IpfsHash: 'bafy123' }) });
  jest.mocked(isNonceUsable).mockResolvedValue(true);
  jest.mocked(claimNonce).mockResolvedValue(true);
  mockGetCode.mockResolvedValue('0x');
  mockVerifyMessage.mockResolvedValue(false);
});

test('valid signed draft is pinned', async () => {
  expect((await request()).status).toBe(200);
  expect(claimNonce).toHaveBeenCalledWith(nonce);
  expect(mockFetch).toHaveBeenCalledTimes(3);
  expect(mockGetCode).not.toHaveBeenCalled();
  expect(jest.mocked(verifyMessage).mock.invocationCallOrder[0]).toBeLessThan(mockFetch.mock.invocationCallOrder[0]);
  expect(jest.mocked(claimNonce).mock.invocationCallOrder[0]).toBeLessThan(mockFetch.mock.invocationCallOrder[0]);
  expect(jest.mocked(claimNonce).mock.invocationCallOrder[0]).toBeLessThan(mockFetch.mock.invocationCallOrder[2]);
});
test('invalid signature claims nonce without rate lookup or contract verification', async () => {
  const signer = privateKeyToAccount(`0x${'22'.repeat(32)}`);
  expect((await request({ signer })).status).toBe(401);
  expect(claimNonce).toHaveBeenCalledTimes(1);
  expect(mockFetch).not.toHaveBeenCalled();
  expect(mockVerifyMessage).not.toHaveBeenCalled();
});
test('replayed nonce cannot be claimed', async () => {
  jest.mocked(claimNonce).mockResolvedValue(false);
  expect((await request()).status).toBe(401);
  expect(mockFetch).not.toHaveBeenCalled();
});
test('expired or already used nonce is rejected before verification', async () => {
  jest.mocked(isNonceUsable).mockResolvedValue(false);
  expect((await request()).status).toBe(401);
  expect(claimNonce).not.toHaveBeenCalled();
  expect(mockFetch).not.toHaveBeenCalled();
});
test('wrong site is forbidden', async () => {
  expect((await request({ site: 'https://example.com' })).status).toBe(403);
});
test('edited content invalidates signature', async () => {
  expect((await request({ body: { ...draft, title: 'Edited' } })).status).toBe(401);
  expect(claimNonce).toHaveBeenCalledTimes(1);
});
test('non-draft nonce is rejected', async () => {
  expect((await request({ nonce: 'other123456789' })).status).toBe(401);
  expect(claimNonce).not.toHaveBeenCalled();
});
test('rate limit unavailable returns 503 after claiming a valid nonce', async () => {
  mockFetch.mockRejectedValue(new Error('unavailable'));
  const response = await request();
  expect(response.status).toBe(503);
  expect(claimNonce).toHaveBeenCalledTimes(1);
  expect(jest.mocked(claimNonce).mock.invocationCallOrder[0]).toBeLessThan(mockFetch.mock.invocationCallOrder[0]);
  expect((await response.json()).error).toContain('prepare_save_draft');
});

test.each([true, false])('rate limit messages preserve browser behavior (agent: %s)', async (agent) => {
  jest.mocked(createContext).mockResolvedValue({ getSession: async () => ({ address: account.address }) } as never);
  mockFetch.mockImplementation(async (url: string) => ({ ok: true, json: async () => ({ rows: url.includes('creator') ? [{
    date_pinned: new Date().toISOString(), metadata: { keyvalues: { type: 'bounty-draft', creator: account.address.toLowerCase() } },
  }] : [] }) }));
  const response = agent ? await request() : await POST(new Request(`${site}/api/bounty-drafts`, {
    method: 'POST', headers: { origin: site, 'content-type': 'application/json' }, body: JSON.stringify(draft),
  }));
  expect(response.status).toBe(429);
  expect(response.headers.get('Retry-After')).toBeTruthy();
  expect((await response.json()).error).toBe(agent
    ? 'Too many drafts saved. Please try again later. Call prepare_save_draft again and re-sign.'
    : 'Too many drafts saved. Please try again later.');
  expect(claimNonce).toHaveBeenCalledTimes(agent ? 1 : 0);
});

test('browser rate limit failure keeps its original message', async () => {
  jest.mocked(createContext).mockResolvedValue({ getSession: async () => ({ address: account.address }) } as never);
  mockFetch.mockRejectedValue(new Error('unavailable'));
  const response = await POST(new Request(`${site}/api/bounty-drafts`, {
    method: 'POST', headers: { origin: site, 'content-type': 'application/json' }, body: JSON.stringify(draft),
  }));
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ error: 'Draft saving temporarily unavailable' });
});

test('contract signatures fall back only when code exists', async () => {
  mockGetCode.mockResolvedValue('0x1234');
  mockVerifyMessage.mockResolvedValue(true);
  const signer = privateKeyToAccount(`0x${'22'.repeat(32)}`);
  expect((await request({ signer })).status).toBe(200);
  expect(mockVerifyMessage).toHaveBeenCalledTimes(1);
});

test('contract fallback rejects invalid signatures after one claim', async () => {
  mockGetCode.mockResolvedValue('0x1234');
  const signer = privateKeyToAccount(`0x${'22'.repeat(32)}`);
  expect((await request({ signer })).status).toBe(401);
  expect(claimNonce).toHaveBeenCalledTimes(1);
  expect(mockFetch).not.toHaveBeenCalled();
});

test('RPC failures return 503', async () => {
  mockGetCode.mockRejectedValue(new Error('rpc unavailable'));
  const signer = privateKeyToAccount(`0x${'22'.repeat(32)}`);
  const response = await request({ signer });
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ error: 'Signature verification temporarily unavailable. Call prepare_save_draft again and re-sign.' });
  expect(claimNonce).toHaveBeenCalledTimes(1);
});

test('wrapped signatures use RPC without deployed code', async () => {
  mockVerifyMessage.mockResolvedValue(true);
  expect((await request({ wrapped: true })).status).toBe(200);
  expect(mockGetCode).not.toHaveBeenCalled();
  expect(mockVerifyMessage).toHaveBeenCalledTimes(1);
  expect(claimNonce).toHaveBeenCalledTimes(1);
  expect(jest.mocked(claimNonce).mock.invocationCallOrder[0]).toBeLessThan(mockVerifyMessage.mock.invocationCallOrder[0]);
  expect(mockVerifyMessage.mock.invocationCallOrder[0]).toBeLessThan(mockFetch.mock.invocationCallOrder[0]);
});

test('RPC verification failures return 503', async () => {
  mockGetCode.mockResolvedValue('0x1234');
  mockVerifyMessage.mockRejectedValue(new Error('rpc unavailable'));
  const signer = privateKeyToAccount(`0x${'22'.repeat(32)}`);
  expect((await request({ signer })).status).toBe(503);
  expect(claimNonce).toHaveBeenCalledTimes(1);
});
