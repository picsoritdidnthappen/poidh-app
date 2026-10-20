/**
 * @jest-environment node
 */
import {
  decodeFunctionData,
  encodeAbiParameters,
  encodeEventTopics,
  Log,
} from 'viem';
import abi from '@/constant/abi/abi';
import {
  buildAcceptOrNominateClaim,
  buildCreateBounty,
  buildCreateClaim,
  buildJoinOpenBounty,
  buildResolveVote,
  buildVote,
  buildWithdraw,
  createdBountyOnChainId,
  MAX_AMOUNT_WEI,
  parseEthAmount,
  toSendCalls,
} from '../transactions';

jest.mock('@/utils/config', () => ({
  chains: {
    mainnet: {
      id: 1,
      contracts: { mainContract: '0xE731dFadBFf20542E10D09D26Fc71445C70d4232' },
    },
    arbitrum: {
      id: 42161,
      contracts: { mainContract: '0x5555fa783936c260f77385b4e153b9725fef1719' },
    },
    base: {
      id: 8453,
      contracts: { mainContract: '0x5555fa783936c260f77385b4e153b9725fef1719' },
    },
  },
}));

const decode = (data: `0x${string}`) => decodeFunctionData({ abi, data });

describe('parseEthAmount', () => {
  it('parses decimal ETH strings to wei', () => {
    expect(parseEthAmount('0.001')).toBe(1_000_000_000_000_000n);
    expect(parseEthAmount(' 1 ')).toBe(10n ** 18n);
  });

  it.each(['abc', '-1', '1e18', '0x10', '', '1.0000000000000000001'])(
    'rejects malformed amount %p',
    (amount) => {
      expect(() => parseEthAmount(amount)).toThrow(/Invalid ETH amount/);
    }
  );

  it('rejects zero', () => {
    expect(() => parseEthAmount('0')).toThrow(/greater than 0/);
  });

  // Bounty #1495, claims 8933/8934: a 65-digit amount built a 276-bit
  // transaction value, beyond uint256, and still returned a sign link.
  it.each([
    '9'.repeat(65),
    '1' + '0'.repeat(82),
    '120000000.000000000000000001',
  ])('rejects an amount larger than the ETH supply (%s)', (amount) => {
    expect(() => parseEthAmount(amount)).toThrow(/more ETH than exists/);
  });

  it('accepts amounts up to the cap', () => {
    expect(parseEthAmount('120000000')).toBe(MAX_AMOUNT_WEI);
    expect(parseEthAmount('1000000')).toBe(10n ** 24n);
  });
});

describe('transaction builders', () => {
  it('encodes a solo bounty with the reward as value', () => {
    const tx = buildCreateBounty({
      chain: 'base',
      type: 'solo',
      title: 'Golden Gate at sunrise',
      description: 'Photo taken this week',
      amountWei: 10n ** 16n,
    });
    expect(tx).toMatchObject({
      chainId: 8453,
      to: '0x5555fa783936c260f77385b4e153b9725fef1719',
      value: '0x2386f26fc10000',
      valueWei: '10000000000000000',
      valueEth: '0.01',
      functionName: 'createSoloBounty',
    });
    expect(decode(tx.data)).toEqual({
      functionName: 'createSoloBounty',
      args: ['Golden Gate at sunrise', 'Photo taken this week'],
    });
  });

  it('encodes an open bounty on mainnet', () => {
    const tx = buildCreateBounty({
      chain: 'mainnet',
      type: 'open',
      title: 't',
      description: 'd',
      amountWei: 10n ** 15n,
    });
    expect(tx.chainId).toBe(1);
    expect(tx.to).toBe('0xE731dFadBFf20542E10D09D26Fc71445C70d4232');
    expect(decode(tx.data).functionName).toBe('createOpenBounty');
  });

  it('encodes join with on-chain id and contribution', () => {
    const tx = buildJoinOpenBounty({
      chain: 'arbitrum',
      onChainBountyId: 42,
      amountWei: 5n,
    });
    expect(tx.chainId).toBe(42161);
    expect(tx.value).toBe('0x5');
    expect(decode(tx.data)).toEqual({
      functionName: 'joinOpenBounty',
      args: [42n],
    });
  });

  it('encodes a claim with zero value', () => {
    const tx = buildCreateClaim({
      chain: 'base',
      onChainBountyId: 7,
      title: 'Done',
      description: 'See photo',
      proofUri: 'ipfs://bafy',
    });
    expect(tx.value).toBe('0x0');
    expect(decode(tx.data)).toEqual({
      functionName: 'createClaim',
      args: [7n, 'Done', 'See photo', 'ipfs://bafy'],
    });
  });

  it('accepts directly or nominates for vote', () => {
    const direct = buildAcceptOrNominateClaim({
      chain: 'base',
      onChainBountyId: 3,
      onChainClaimId: 9,
      useVote: false,
    });
    const vote = buildAcceptOrNominateClaim({
      chain: 'base',
      onChainBountyId: 3,
      onChainClaimId: 9,
      useVote: true,
    });
    expect(decode(direct.data)).toEqual({
      functionName: 'acceptClaim',
      args: [3n, 9n],
    });
    expect(decode(vote.data)).toEqual({
      functionName: 'submitClaimForVote',
      args: [3n, 9n],
    });
  });

  it('encodes vote, resolve and withdraw', () => {
    expect(
      decode(
        buildVote({ chain: 'base', onChainBountyId: 1, approve: false }).data
      )
    ).toEqual({ functionName: 'voteClaim', args: [1n, false] });
    expect(
      decode(buildResolveVote({ chain: 'base', onChainBountyId: 1 }).data)
    ).toEqual({ functionName: 'resolveVote', args: [1n] });
    expect(decode(buildWithdraw({ chain: 'base' }).data)).toEqual({
      functionName: 'withdraw',
      args: undefined,
    });
  });

  it('converts to EIP-5792 wallet_sendCalls params, with from when known', () => {
    const tx = buildWithdraw({ chain: 'base' });
    const call = { to: tx.to, data: tx.data, value: '0x0' };
    expect(toSendCalls(tx)).toEqual({
      version: '2.0.0',
      chainId: '0x2105',
      atomicRequired: false,
      calls: [call],
    });
    expect(
      toSendCalls(tx, '0x1111111111111111111111111111111111111111')
    ).toMatchObject({ from: '0x1111111111111111111111111111111111111111' });
  });
});

describe('createdBountyOnChainId', () => {
  const POIDH = '0x5555fa783936c260f77385b4e153b9725fef1719' as const;
  const OTHER = '0x9999999999999999999999999999999999999999' as const;
  const ISSUER = '0x1111111111111111111111111111111111111111' as const;

  /** A BountyCreated log encoded exactly as the contract emits it. */
  const bountyCreated = (
    address: `0x${string}`,
    id: bigint
  ): Pick<Log, 'address' | 'data' | 'topics'> => ({
    address,
    topics: encodeEventTopics({
      abi,
      eventName: 'BountyCreated',
      args: { id, issuer: ISSUER },
    }) as Log['topics'],
    data: encodeAbiParameters(
      [
        { type: 'string' },
        { type: 'string' },
        { type: 'uint256' },
        { type: 'uint256' },
        { type: 'bool' },
        { type: 'uint256' },
      ],
      ['title', 'description', 10n ** 15n, 1_700_000_000n, false, 0n]
    ),
  });

  it('reads the id from the poidh contract event', () => {
    expect(createdBountyOnChainId([bountyCreated(POIDH, 42n)], POIDH)).toBe(
      42n
    );
  });

  it('matches the contract address case-insensitively', () => {
    const log = bountyCreated(
      POIDH.toUpperCase().replace('0X', '0x') as `0x${string}`,
      7n
    );
    expect(createdBountyOnChainId([log], POIDH)).toBe(7n);
  });

  it('ignores a look-alike event from another contract', () => {
    expect(createdBountyOnChainId([bountyCreated(OTHER, 1n)], POIDH)).toBe(
      null
    );
    expect(
      createdBountyOnChainId(
        [bountyCreated(OTHER, 1n), bountyCreated(POIDH, 99n)],
        POIDH
      )
    ).toBe(99n);
  });

  it('skips poidh logs it cannot decode', () => {
    const unknown = {
      address: POIDH,
      topics: [`0x${'ab'.repeat(32)}`] as Log['topics'],
      data: '0x' as const,
    };
    expect(createdBountyOnChainId([unknown], POIDH)).toBe(null);
    expect(
      createdBountyOnChainId([unknown, bountyCreated(POIDH, 5n)], POIDH)
    ).toBe(5n);
  });

  it('returns null when nothing was created', () => {
    expect(createdBountyOnChainId([], POIDH)).toBe(null);
  });
});
