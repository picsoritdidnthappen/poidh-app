/**
 * @jest-environment node
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
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
const { POST } = require('../route') as typeof import('../route');

const calls = { count: 0 };

jest.mock('@/mcp/server', () => ({
  createPoidhMcpServer: () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' });
    server.registerTool('ping', { description: 'counts calls' }, async () => {
      calls.count += 1;
      return { content: [{ type: 'text', text: 'pong' }] };
    });
    return server;
  },
}));

const HEADERS = {
  'content-type': 'application/json',
  accept: 'application/json, text/event-stream',
};
const ping = (id: number) => ({
  jsonrpc: '2.0',
  id,
  method: 'tools/call',
  params: { name: 'ping', arguments: {} },
});
const post = (body: string, headers: Record<string, string> = HEADERS) =>
  POST(
    new Request('https://poidh.xyz/api/mcp', { method: 'POST', headers, body })
  );

beforeEach(() => {
  calls.count = 0;
});

describe('POST /api/mcp', () => {
  it('runs a single tool call', async () => {
    const res = await post(JSON.stringify(ping(1)));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      id: 1,
      result: { content: [{ text: 'pong' }] },
    });
    expect(calls.count).toBe(1);
  });

  // Bounty #1495, claim 8940: one POST with 40 get_bounty calls returned
  // ~1 MB, about 50 times the work of a single request.
  it('refuses JSON-RPC batches without running any of them', async () => {
    const batch = JSON.stringify(Array.from({ length: 40 }, (_, i) => ping(i)));
    const res = await post(batch);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({
      error: { code: -32600, message: expect.stringMatching(/Batch requests/) },
    });
    expect(calls.count).toBe(0);
  });

  it('refuses bodies over 256 KB', async () => {
    const big = JSON.stringify({ ...ping(1), pad: 'x'.repeat(300 * 1024) });
    const res = await post(big);
    expect(res.status).toBe(413);
    expect(calls.count).toBe(0);
  });

  it('answers invalid JSON with a parse error', async () => {
    const res = await post('{"jsonrpc":"2.0",');
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: { code: -32700 } });
  });

  it('still enforces the content type and Accept header', async () => {
    const plain = await post(JSON.stringify(ping(1)), {
      ...HEADERS,
      'content-type': 'text/plain',
    });
    expect(plain.status).toBe(415);
    const anyAccept = await post(JSON.stringify(ping(1)), {
      ...HEADERS,
      accept: '*/*',
    });
    expect(anyAccept.status).toBe(406);
    expect(calls.count).toBe(0);
  });
});
