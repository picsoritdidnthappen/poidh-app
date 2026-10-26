/**
 * @jest-environment node
 */
import { createCallerFactory, createTRPCRouter } from '@/trpc/init';
import { zkpassportRouter } from '@/trpc/routers/zkpassport';
import type { Context } from '@/trpc/context';

// superjson is ESM-only and the server-side caller never serialises anyway
jest.mock('superjson', () => ({
  __esModule: true,
  default: { serialize: jest.fn(), deserialize: jest.fn() },
}));

const mockVerify = jest.fn();
jest.mock('@zkpassport/sdk', () => ({
  ZKPassport: jest.fn((domain: string) => {
    const query: Record<string, unknown> = {};
    const builder = {
      disclose: (key: string) => {
        query[key] = { disclose: true };
        return builder;
      },
      bind: (key: string, value: string) => {
        query.bind = { [key]: value };
        return builder;
      },
      done: () => ({ query }),
    };

    return {
      createQuery: () => builder,
      verify: (args: unknown) => mockVerify(domain, args),
    };
  }),
}));

const mockFindUnique = jest.fn();
const mockUpsert = jest.fn();
jest.mock('prisma/prisma', () => ({
  __esModule: true,
  default: {
    usersExtra: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      upsert: (...args: unknown[]) => mockUpsert(...args),
    },
  },
}));

const ADDRESS = '0x' + 'ab'.repeat(20);
const OTHER_ADDRESS = '0x' + 'cd'.repeat(20);
const UNIQUE_ID = '123456789';

const createCaller = createCallerFactory(createTRPCRouter(zkpassportRouter));

function makeCaller(address: string | null = ADDRESS) {
  const ctx: Context = {
    host: 'poidh.xyz',
    sessionToken: address ? 'session-token' : null,
    resHeaders: null,
    getSession: async () => (address ? { address } : null),
  };

  return createCaller(ctx);
}

function fastProofs({ boundTo = ADDRESS as string | null } = {}) {
  return [
    { name: 'sig_check_dsc_tbs_700_rsa_pkcs_4096_sha256', proof: '00' },
    {
      name: 'disclose_bytes',
      proof: '00',
      committedInputs: {
        disclose_bytes: { discloseMask: [1], disclosedBytes: [70] },
      },
    },
    ...(boundTo
      ? [
          {
            name: 'bind',
            proof: '00',
            committedInputs: { bind: { data: { user_address: boundTo } } },
          },
        ]
      : []),
  ];
}

const queryResult = {
  nationality: { disclose: { result: 'FRA' } },
  bind: { user_address: ADDRESS },
};

beforeEach(() => {
  mockVerify.mockReset();
  mockVerify.mockResolvedValue({
    verified: true,
    uniqueIdentifier: UNIQUE_ID,
  });
  mockFindUnique.mockReset();
  mockFindUnique.mockResolvedValue(null);
  mockUpsert.mockReset();
  mockUpsert.mockResolvedValue({});
});

describe('zkpassport.verify', () => {
  it('saves the badge for a valid proof bound to the signed-in wallet', async () => {
    await expect(
      makeCaller().verify({ proofs: fastProofs(), queryResult })
    ).resolves.toEqual({ success: true });

    expect(mockVerify).toHaveBeenCalledWith(
      'poidh.xyz',
      expect.objectContaining({
        scope: 'poidh-profile-verification',
        verifierMode: 'api',
        originalQuery: {
          nationality: { disclose: true },
          bind: { user_address: ADDRESS },
        },
      })
    );
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { address: ADDRESS },
        update: expect.objectContaining({
          zkpassportCountry: 'FRA',
          zkpassportUniqueId: UNIQUE_ID,
        }),
      })
    );
  });

  it('accepts a compressed proof that commits to everything in one outer proof', async () => {
    const proofs = [
      {
        name: 'outer_count_5',
        proof: '00',
        committedInputs: {
          disclose_bytes: { discloseMask: [1], disclosedBytes: [70] },
          bind: { data: { user_address: ADDRESS } },
        },
      },
    ];

    await expect(makeCaller().verify({ proofs, queryResult })).resolves.toEqual(
      { success: true }
    );
  });

  it('requires a sign-in', async () => {
    await expect(
      makeCaller(null).verify({ proofs: fastProofs(), queryResult })
    ).rejects.toThrow('Sign in to continue');
    expect(mockVerify).not.toHaveBeenCalled();
  });

  it('rejects proofs the SDK does not verify', async () => {
    mockVerify.mockResolvedValue({
      verified: false,
      uniqueIdentifier: undefined,
    });

    await expect(
      makeCaller().verify({ proofs: fastProofs(), queryResult })
    ).rejects.toThrow('Passport proof is invalid');
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('rejects malformed proofs that make the SDK throw', async () => {
    jest.spyOn(console, 'error').mockImplementationOnce(() => undefined);
    mockVerify.mockRejectedValue(new Error('bad proof'));

    await expect(
      makeCaller().verify({ proofs: fastProofs(), queryResult })
    ).rejects.toThrow('Passport proof is invalid');
  });

  it('rejects proofs bound to another wallet', async () => {
    await expect(
      makeCaller().verify({
        proofs: fastProofs({ boundTo: OTHER_ADDRESS }),
        queryResult,
      })
    ).rejects.toThrow('Passport proof is invalid');
  });

  it('rejects proofs with no address binding, even if the result claims one', async () => {
    await expect(
      makeCaller().verify({
        proofs: fastProofs({ boundTo: null }),
        queryResult,
      })
    ).rejects.toThrow('Passport proof is invalid');
  });

  it('ignores a binding on a proof that does not prove it', async () => {
    const proofs = [
      ...fastProofs({ boundTo: null }),
      {
        name: 'sig_check_id_data_tbs_700_rsa_pkcs_4096_sha256',
        proof: '00',
        committedInputs: { bind: { data: { user_address: ADDRESS } } },
      },
    ];

    await expect(makeCaller().verify({ proofs, queryResult })).rejects.toThrow(
      'Passport proof is invalid'
    );
  });

  it('rejects a nationality that no proof discloses', async () => {
    const proofs = fastProofs().filter(({ name }) => name !== 'disclose_bytes');

    await expect(makeCaller().verify({ proofs, queryResult })).rejects.toThrow(
      'Passport proof is invalid'
    );
  });

  it('rejects a nationality that is not a country code', async () => {
    await expect(
      makeCaller().verify({
        proofs: fastProofs(),
        queryResult: {
          ...queryResult,
          nationality: { disclose: { result: '<<<' } },
        },
      })
    ).rejects.toThrow('Passport proof is invalid');
  });

  it('rejects a passport already linked to another wallet', async () => {
    mockFindUnique.mockResolvedValue({ address: OTHER_ADDRESS });

    await expect(
      makeCaller().verify({ proofs: fastProofs(), queryResult })
    ).rejects.toThrow('This passport is already linked to another wallet');
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('lets a wallet verify again with the same passport', async () => {
    mockFindUnique.mockResolvedValue({ address: ADDRESS });

    await expect(
      makeCaller().verify({ proofs: fastProofs(), queryResult })
    ).resolves.toEqual({ success: true });
  });
});
