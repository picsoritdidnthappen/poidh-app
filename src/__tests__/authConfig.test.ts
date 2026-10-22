/**
 * Loads a fresh copy of isAllowedHost with these env vars set. The allowed
 * hosts are read from the env when the module loads, so each set of env vars
 * needs its own copy.
 */
function loadIsAllowedHost(vars: Record<string, string>) {
  const env = process.env;
  process.env = { ...env, NODE_ENV: 'production', ...vars };

  try {
    let isAllowedHost!: typeof import('@/utils/authConfig').isAllowedHost;
    jest.isolateModules(() => {
      ({ isAllowedHost } = require('@/utils/authConfig'));
    });
    return isAllowedHost;
  } finally {
    process.env = env;
  }
}

describe('isAllowedHost', () => {
  it('allows prod and staging without any env vars', () => {
    const isAllowedHost = loadIsAllowedHost({});

    expect(isAllowedHost('poidh.xyz')).toBe(true);
    expect(isAllowedHost('staging.poidh.xyz')).toBe(true);
  });

  it('allows the Vercel deploy and branch URLs', () => {
    const isAllowedHost = loadIsAllowedHost({
      VERCEL_URL: 'poidh-prod-abc123.vercel.app',
      VERCEL_BRANCH_URL: 'poidh-prod-git-feat-x.vercel.app',
    });

    expect(isAllowedHost('poidh-prod-abc123.vercel.app')).toBe(true);
    expect(isAllowedHost('poidh-prod-git-feat-x.vercel.app')).toBe(true);
    expect(isAllowedHost('poidh-prod-other.vercel.app')).toBe(false);
  });

  it('allows localhost only in development', () => {
    expect(loadIsAllowedHost({})('localhost:3000')).toBe(false);
    expect(
      loadIsAllowedHost({ NODE_ENV: 'development' })('localhost:3000')
    ).toBe(true);
  });

  it('rejects other hosts', () => {
    const isAllowedHost = loadIsAllowedHost({});

    expect(isAllowedHost('evil.com')).toBe(false);
    expect(isAllowedHost('poidh.xyz.evil.com')).toBe(false);
  });
});
