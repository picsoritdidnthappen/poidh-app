export function getClientIp(headers?: Headers) {
  return headers?.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ||
    headers?.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown';
}

