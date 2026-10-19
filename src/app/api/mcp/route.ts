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
  const started = Date.now();
  const server = createPoidhMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  try {
    await server.connect(transport);
    const res = await transport.handleRequest(req);
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
