/**
 * Browser origins allowed to call the endpoint, beyond poidh itself and
 * localhost (MCP Inspector). Comma-separated, e.g. "https://app.example".
 */
const EXTRA_ORIGINS = (process.env.MCP_ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

/**
 * The MCP spec requires validating Origin to block DNS-rebinding and
 * cross-site browser calls. Server-side clients (Claude, ChatGPT, Cursor)
 * send no Origin and are allowed.
 */
export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true;
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    return true;
  }
  const allowed = [
    'https://poidh.xyz',
    'https://www.poidh.xyz',
    process.env.NEXT_PUBLIC_URL,
    ...EXTRA_ORIGINS,
  ];
  return allowed.includes(url.origin);
}
