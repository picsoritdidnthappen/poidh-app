import { serializeSessionCookie } from '@/trpc/session';

jest.mock('prisma/prisma', () => ({ __esModule: true, default: {} }));

const env = (NODE_ENV: string) =>
  ({ NODE_ENV } as unknown as NodeJS.ProcessEnv);

describe('serializeSessionCookie', () => {
  it('sets a host-only, HttpOnly, Secure cookie for 30 days', () => {
    const cookie = serializeSessionCookie('abc', env('production'));

    expect(cookie).toBe(
      'poidh_session=abc; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000; Secure'
    );
    expect(cookie).not.toContain('Domain');
  });

  it('leaves out Secure in development', () => {
    expect(serializeSessionCookie('abc', env('development'))).not.toContain(
      'Secure'
    );
  });

  it('expires the cookie when clearing it', () => {
    expect(serializeSessionCookie(null, env('production'))).toContain(
      'poidh_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
    );
  });
});
