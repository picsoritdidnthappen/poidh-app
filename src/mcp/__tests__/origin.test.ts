/**
 * @jest-environment node
 */
import { isAllowedOrigin } from '../origin';

describe('isAllowedOrigin', () => {
  const cases: [string | null, boolean, string][] = [
    [null, true, 'server-side clients send no Origin'],
    ['https://poidh.xyz', true, 'production'],
    ['https://www.poidh.xyz', true, 'www'],
    ['http://localhost:6274', true, 'MCP Inspector'],
    ['http://127.0.0.1:3000', true, 'local dev'],
    ['https://evil.example', false, 'other sites'],
    ['https://poidh.xyz.evil.example', false, 'lookalike suffix'],
    ['http://poidh.xyz', false, 'plain http'],
    ['null', false, 'opaque origin'],
  ];
  it.each(cases)('%s → %s (%s)', (origin, allowed) => {
    expect(isAllowedOrigin(origin)).toBe(allowed);
  });
});
