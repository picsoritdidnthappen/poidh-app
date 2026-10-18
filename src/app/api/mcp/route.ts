import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createPoidhMcpServer } from '@/mcp/server';

export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Accept, Authorization, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID',
  'Access-Control-Expose-Headers': 'Mcp-Session-Id, Mcp-Protocol-Version',
};

/**
 * Remote MCP endpoint (Streamable HTTP). Stateless: every request gets a
 * fresh server and transport, which suits serverless and needs no session
 * store. Tools are read-only or return unsigned transactions, so the
 * endpoint is public and holds no credentials.
 */
async function handle(req: Request): Promise<Response> {
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

export const GET = handle;
export const POST = handle;
export const DELETE = handle;

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
