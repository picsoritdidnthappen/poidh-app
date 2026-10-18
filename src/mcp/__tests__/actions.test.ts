/**
 * @jest-environment node
 */
import { decodeFunctionData } from 'viem';
import abi from '@/constant/abi/abi';
import {
  ActionDeps,
  ActionRequest,
  actionUrl,
  BountyRecord,
  parseActionParams,
  prepareAction,
} from '../actions';

jest.mock('@/utils/config', () => ({
  chains: {
    mainnet: {
      id: 1,
      slug: 'mainnet',
      contracts: { mainContract: '0xE731dFadBFf20542E10D09D26Fc71445C70d4232' },
    },
    arbitrum: {
      id: 42161,
      slug: 'arbitrum',
      contracts: { mainContract: '0x5555fa783936c260f77385b4e153b9725fef1719' },
    },
    base: {
      id: 8453,
      slug: 'base',
      contracts: { mainContract: '0x5555fa783936c260f77385b4e153b9725fef1719' },
    },
  },
}));

const ISSUER = '0x1111111111111111111111111111111111111111';
const OTHER = '0x2222222222222222222222222222222222222222';

const bounty = (overrides: Partial<BountyRecord> = {}): BountyRecord => ({
  id: 1271,
  onChainId: 285,
  chainId: 8453,
  title: 'Golden Gate at sunrise',
  description: 'photo',
  amount: '10000000000000000',
  issuer: ISSUER,
  inProgress: true,
  isCanceled: false,
  isMultiplayer: true,
  isVoting: false,
  hasClaims: false,
  ...overrides,
});

const deps = (b: BountyRecord = bounty()): ActionDeps => ({
  loadBounty: jest.fn(async () => b),
  loadClaim: jest.fn(async () => ({ bountyId: b.id, onChainId: 812 })),
  mustUseVoteFlow: jest.fn(async () => false),
});

const ALL: ActionRequest[] = [
  {
    action: 'create_bounty',
    chain: 'base',
    type: 'open',
    title: 'Golden Gate & "sunrise" 🌉',
    description: 'line one\nline two?&x=1',
    amountEth: '0.01',
  },
  { action: 'join_bounty', chain: 'arbitrum', id: 400, amountEth: '0.005' },
  {
    action: 'submit_claim',
    chain: 'mainnet',
    id: 40,
    title: 'done',
    description: 'see photo',
    proofUri: 'https://example.com/a.jpg?b=1',
  },
  { action: 'accept_claim', chain: 'base', id: 1271, claimId: 50 },
  { action: 'vote', chain: 'base', id: 1271, approve: false },
  { action: 'resolve_vote', chain: 'base', id: 1271 },
  { action: 'withdraw', chain: 'base' },
];

describe('approval links', () => {
  it.each(ALL.map((r) => [r.action, r]))(
    'round-trips %s through the /tx URL',
    (_name, request) => {
      const url = new URL(actionUrl(request));
      expect(url.pathname).toBe('/tx');
      expect(parseActionParams(url.searchParams)).toEqual({
        ok: true,
        request,
      });
    }
  );

  it('defaults a missing bounty type to solo', () => {
    const parsed = parseActionParams(
      new URLSearchParams(
        'action=create_bounty&chain=base&title=t&description=d&amountEth=0.01'
      )
    );
    expect(parsed).toMatchObject({ ok: true, request: { type: 'solo' } });
  });

  it.each([
    ['unknown action', 'action=drain&chain=base', 'unknown action'],
    ['degen writes', 'action=withdraw&chain=degen', 'chain'],
    ['non-numeric id', 'action=resolve_vote&chain=base&id=abc', 'id'],
    ['bad vote value', 'action=vote&chain=base&id=1&approve=maybe', 'approve'],
    [
      'non-URL proof',
      'action=submit_claim&chain=base&id=1&title=t&description=d&proofUri=nope',
      'proofUri',
    ],
    [
      'blank title',
      'action=create_bounty&chain=base&title=%20&description=d&amountEth=1',
      'title',
    ],
  ])('rejects %s', (_name, query, expected) => {
    const parsed = parseActionParams(new URLSearchParams(query));
    expect(parsed.ok).toBe(false);
    expect(parsed.ok ? '' : parsed.error).toContain(expected);
  });
});

describe('prepareAction', () => {
  it('refuses funds from the bounty creator (PoidhV3 WrongCaller)', async () => {
    await expect(
      prepareAction(
        { action: 'join_bounty', chain: 'base', id: 1271, amountEth: '0.01' },
        deps(),
        ISSUER
      )
    ).rejects.toThrow(/creator cannot add funds/);
  });

  it('lets anyone else join, using the on-chain id', async () => {
    const { tx, bounty: b } = await prepareAction(
      { action: 'join_bounty', chain: 'base', id: 1271, amountEth: '0.01' },
      deps(),
      OTHER
    );
    expect(b?.id).toBe(1271);
    expect(decodeFunctionData({ abi, data: tx.data })).toEqual({
      functionName: 'joinOpenBounty',
      args: [285n],
    });
  });

  it('links withdrawals to the signer account page when known', async () => {
    const withFrom = await prepareAction(
      { action: 'withdraw', chain: 'base' },
      deps(),
      OTHER
    );
    expect(withFrom.url).toBe(`https://poidh.xyz/account/${OTHER}`);
    const anonymous = await prepareAction(
      { action: 'withdraw', chain: 'base' },
      deps()
    );
    expect(anonymous.url).toBe('https://poidh.xyz');
  });

  it('skips data access for actions that need no bounty', async () => {
    const d = deps();
    await prepareAction(ALL[0], d);
    expect(d.loadBounty).not.toHaveBeenCalled();
  });
});
