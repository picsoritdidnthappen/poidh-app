/**
 * @jest-environment node
 */
import { decodeFunctionData } from 'viem';
import abi from '@/constant/abi/abi';
import {
  buildAcceptOrNominateClaim,
  buildCreateBounty,
  buildCreateClaim,
  buildJoinOpenBounty,
  buildResolveVote,
  buildVote,
  buildWithdraw,
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

  it('converts to an EIP-5792 wallet_sendCalls request', () => {
    const tx = buildWithdraw({ chain: 'base' });
    expect(toSendCalls(tx)).toEqual({
      chainId: '0x2105',
      calls: [{ to: tx.to, data: tx.data, value: '0x0' }],
    });
  });
});
