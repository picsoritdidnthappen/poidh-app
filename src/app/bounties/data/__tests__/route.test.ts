/**
 * @jest-environment node
 */
import { webcrypto } from 'crypto';
import { ReadableStream } from 'stream/web';

// Jest 27's node environment predates the fetch globals the route uses, so
// install Node's own before loading it.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const undici = require('next/dist/compiled/undici') as Pick<
  typeof globalThis,
  'Headers' | 'Request' | 'Response'
>;
Object.assign(globalThis, {
  crypto: webcrypto,
  Headers: undici.Headers,
  Request: undici.Request,
  Response: undici.Response,
  ReadableStream,
});
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { NextRequest } = require('next/server') as { NextRequest: any };
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { GET } = require('../route') as typeof import('../route');

jest.mock('prisma/prisma', () => ({
  __esModule: true,
  default: { bounties: { findMany: jest.fn() } },
}));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const findMany = require('prisma/prisma').default.bounties
  .findMany as jest.Mock;

const req = (qs: string) =>
  new NextRequest(`https://poidh.xyz/bounties/data${qs ? `?${qs}` : ''}`);

beforeEach(() => {
  findMany.mockReset();
  findMany.mockImplementation(() => Promise.resolve([]));
});

describe('GET /bounties/data validation (#1597)', () => {
  it.each([
    { q: 'limit=-1' },
    { q: 'limit=0' },
    { q: 'limit=7.5' },
    { q: 'limit=101' },
    { q: 'limit=' },
    { q: 'limit=garbage' },
  ])('rejects invalid limit $q with 400', async ({ q }) => {
    const res = await GET(req(q));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/limit/);
    expect(findMany).not.toHaveBeenCalled();
  });

  it('accepts an integer limit and clamps nothing', async () => {
    await GET(req('limit=100'));
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 })
    );
  });

  it('defaults the limit to 20', async () => {
    await GET(req(''));
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 20 })
    );
  });

  it('rejects a garbage cursor with 400 instead of 500', async () => {
    const res = await GET(req('cursor=garbage!!!'));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'invalid cursor' });
    expect(findMany).not.toHaveBeenCalled();
  });

  it('rejects negative and fractional cursors', async () => {
    for (const q of ['cursor=-5', 'cursor=1.5', 'cursor=']) {
      const res = await GET(req(q));
      expect(res.status).toBe(400);
      expect(findMany).not.toHaveBeenCalled();
    }
  });

  it('accepts a valid integer cursor', async () => {
    await GET(req('cursor=123456'));
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ createdAt: { lt: 123456 } }),
      })
    );
  });
});
