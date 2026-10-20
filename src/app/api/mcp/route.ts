import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { isAllowedOrigin } from '@/mcp/origin';
import { createPoidhMcpServer } from '@/mcp/server';

export const dynamic = 'force-dynamic';

const BASE_CORS_HEADERS = {
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Accept, Authorization, Mcp-Session-Id, Mcp-Protocol-Version, Mcp-Method, Mcp-Name, Last-Event-ID',
  'Access-Control-Expose-Headers': 'Mcp-Session-Id, Mcp-Protocol-Version',
  Vary: 'Origin',
};

function corsHeaders(origin: string | null): Record<string, string> {
  return origin && isAllowedOrigin(origin)
    ? { ...BASE_CORS_HEADERS, 'Access-Control-Allow-Origin': origin }
    : BASE_CORS_HEADERS;
}

// The largest real request (a claim with a 5,000-character description) is
// well under 20 KB.
const MAX_BODY_BYTES = 256 * 1024;

function jsonRpcError(
  status: number,
  code: number,
  message: string,
  headers: Record<string, string>
): Response {
  return Response.json(
    { jsonrpc: '2.0', error: { code, message }, id: null },
    { status, headers }
  );
}

/**
 * Reads at most MAX_BODY_BYTES of the body. Returns null when it is larger,
 * without buffering the rest.
 */
async function readCappedBody(req: Request): Promise<string | null> {
  const declared = Number(req.headers.get('content-length'));
  if (declared > MAX_BODY_BYTES) return null;
  if (!req.body) return '';
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

/**
 * Remote MCP endpoint (Streamable HTTP). Stateless: every request gets a
 * fresh server and transport, which suits serverless and needs no session
 * store. Tools are read-only or return unsigned transactions, so the
 * endpoint is public and holds no credentials.
 */
async function handle(req: Request): Promise<Response> {
  const origin = req.headers.get('origin');
  const CORS_HEADERS = corsHeaders(origin);
  if (!isAllowedOrigin(origin)) {
    return Response.json(
      {
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Origin not allowed' },
        id: null,
      },
      { status: 403, headers: CORS_HEADERS }
    );
  }
  let parsedBody: unknown;
  if (req.method === 'POST') {
    const text = await readCappedBody(req);
    if (text === null) {
      return jsonRpcError(413, -32000, 'Request body too large', CORS_HEADERS);
    }
    try {
      parsedBody = JSON.parse(text);
    } catch {
      return jsonRpcError(
        400,
        -32700,
        'Parse error: Invalid JSON',
        CORS_HEADERS
      );
    }
    // JSON-RPC batching was removed from MCP (2025-06-18). Each message in a
    // batch runs a database query or /data fetch, so one request could fan out
    // into dozens (bounty #1495, claim 8940).
    if (Array.isArray(parsedBody)) {
      return jsonRpcError(
        400,
        -32600,
        'Batch requests are not supported. Send one JSON-RPC message per request.',
        CORS_HEADERS
      );
    }
  }
  const started = Date.now();
  const server = createPoidhMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  try {
    await server.connect(transport);
    const res = await transport.handleRequest(req, { parsedBody });
    const headers = new Headers(res.headers);
    for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v);
    return new Response(res.body, { status: res.status, headers });
  } catch (error) {
    console.error('MCP request failed', {
      method: req.method,
      ms: Date.now() - started,
      error: error instanceof Error ? error.message : String(error),
    });
    return Response.json(
      {
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal server error' },
        id: null,
      },
      { status: 500, headers: CORS_HEADERS }
    );
  } finally {
    // Response bodies are fully buffered in JSON mode, so closing is safe.
    void transport.close();
    void server.close();
  }
}

export const POST = handle;

/**
 * Stateless JSON mode has no standalone SSE stream or session to delete, so
 * GET and DELETE return 405, which the Streamable HTTP spec allows.
 */
function methodNotAllowed(req: Request): Response {
  return new Response(null, {
    status: 405,
    headers: {
      ...corsHeaders(req.headers.get('origin')),
      Allow: 'POST, OPTIONS',
    },
  });
}

export const GET = methodNotAllowed;
export const DELETE = methodNotAllowed;

export function OPTIONS(req: Request) {
  const origin = req.headers.get('origin');
  return new Response(null, {
    status: isAllowedOrigin(origin) ? 204 : 403,
    headers: corsHeaders(origin),
  });
}
