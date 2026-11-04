import { getClientIp } from '../clientIp';

test('prefers the first Vercel IP over forwarded-for', () => {
  const headers = new Headers({ 'x-vercel-forwarded-for': ' 1.2.3.4, 5.6.7.8', 'x-forwarded-for': '9.9.9.9' });
  expect(getClientIp(headers)).toBe('1.2.3.4');
});

test('uses forwarded-for or unknown when Vercel header is absent', () => {
  expect(getClientIp(new Headers({ 'x-forwarded-for': ' 9.9.9.9, 8.8.8.8' }))).toBe('9.9.9.9');
  expect(getClientIp()).toBe('unknown');
});
