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
  ClaimRecord,
  isSafeProofUri,
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

const claim = (overrides: Partial<ClaimRecord> = {}): ClaimRecord => ({
  id: 50,
  bountyId: 1271,
  onChainId: 812,
  title: 'my sunrise photo',
  description: 'shot at 6am',
  url: 'ipfs://bafyproof',
  issuer: OTHER,
  ...overrides,
});

const deps = (
  b: BountyRecord = bounty(),
  votingClaim: ClaimRecord | null = claim()
): ActionDeps => ({
  loadBounty: jest.fn(async () => b),
  loadClaim: jest.fn(async () => claim({ bountyId: b.id })),
  loadVotingClaim: jest.fn(async () => votingClaim),
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
      'javascript: proof links',
      'action=submit_claim&chain=base&id=1&title=t&description=d&proofUri=javascript:alert(1)',
      'proofUri',
    ],
    [
      'data: proof links',
      'action=submit_claim&chain=base&id=1&title=t&description=d&proofUri=data:text/html,x',
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

  it('links a new bounty to a page that exists', async () => {
    // There is no /{chain}/bounties page; it used to 404 (see #1579).
    const withFrom = await prepareAction(ALL[0], deps(), ISSUER);
    expect(withFrom.url).toBe(`https://poidh.xyz/account/${ISSUER}`);
    const anonymous = await prepareAction(ALL[0], deps());
    expect(anonymous.url).toBe('https://poidh.xyz');
  });

  describe('bounties from before poidh v3', () => {
    // Base #176 as prod returns it: on the older contract, still marked
    // isVoting. Its on-chain id 176 is a different bounty (#1162) on the
    // current contract, so a transaction for it would hit the wrong bounty.
    const legacy = bounty({
      id: 176,
      onChainId: 176,
      inProgress: false,
      isVoting: true,
    });
    const BOUNTY_ACTIONS: ActionRequest[] = [
      { action: 'join_bounty', chain: 'base', id: 176, amountEth: '0.01' },
      {
        action: 'submit_claim',
        chain: 'base',
        id: 176,
        title: 't',
        description: 'd',
        proofUri: 'https://example.com/a.jpg',
      },
      { action: 'accept_claim', chain: 'base', id: 176, claimId: 50 },
      { action: 'vote', chain: 'base', id: 176, approve: true },
      { action: 'resolve_vote', chain: 'base', id: 176 },
    ];

    it.each(BOUNTY_ACTIONS.map((r) => [r.action, r]))(
      'refuses %s instead of targeting a different bounty',
      async (_name, request) => {
        await expect(
          prepareAction(request, deps(legacy), ISSUER)
        ).rejects.toThrow("Bounty 176 is on poidh's older contract");
      }
    );

    it.each([
      [8453, 986, false],
      [8453, 987, true],
      [42161, 180, false],
      [42161, 181, true],
      [1, 1, true],
    ])('chain %i bounty %i is current: %s', async (chainId, id, current) => {
      const result = prepareAction(
        { action: 'resolve_vote', chain: 'base', id },
        deps(bounty({ id, chainId, isVoting: true })),
        ISSUER
      );
      if (current) await expect(result).resolves.toBeDefined();
      else await expect(result).rejects.toThrow(/older contract/);
    });
  });

  it('skips data access for actions that need no bounty', async () => {
    const d = deps();
    await prepareAction(ALL[0], d);
    expect(d.loadBounty).not.toHaveBeenCalled();
  });

  it('returns the claim being accepted so the person can check it', async () => {
    const result = await prepareAction(
      { action: 'accept_claim', chain: 'base', id: 1271, claimId: 50 },
      deps(bounty({ isMultiplayer: false })),
      ISSUER
    );
    expect(result.claim).toMatchObject({
      title: 'my sunrise photo',
      issuer: OTHER,
      url: 'ipfs://bafyproof',
    });
  });

  it('summarizes a new bounty in plain English', async () => {
    const open = await prepareAction(
      {
        ...(ALL[0] as Extract<ActionRequest, { action: 'create_bounty' }>),
        title: 'x',
      },
      deps()
    );
    expect(open.summary).toBe(
      'Create an open bounty "x" on base for 0.01 ETH.'
    );
    const solo = await prepareAction(
      {
        ...(ALL[0] as Extract<ActionRequest, { action: 'create_bounty' }>),
        type: 'solo',
        title: 'x',
      },
      deps()
    );
    expect(solo.summary).toBe('Create a solo bounty "x" on base for 0.01 ETH.');
  });

  it('returns the claim under vote, and refuses when there is none', async () => {
    const voting = bounty({ isVoting: true });
    const result = await prepareAction(
      { action: 'vote', chain: 'base', id: 1271, approve: true },
      deps(voting)
    );
    expect(result.claim?.id).toBe(50);
    expect(result.summary).toBe('Vote yes on claim 50 for bounty 1271.');

    await expect(
      prepareAction(
        { action: 'vote', chain: 'base', id: 1271, approve: true },
        deps(voting, null)
      )
    ).rejects.toThrow(/Could not find the claim up for vote/);
  });

  it('rejects unsafe proof URIs even when called directly', async () => {
    await expect(
      prepareAction(
        {
          action: 'submit_claim',
          chain: 'base',
          id: 1271,
          title: 't',
          description: 'd',
          proofUri: 'javascript:alert(1)',
        },
        deps()
      )
    ).rejects.toThrow(/https:\/\/, ipfs:\/\/ or ar:\/\//);
  });
});

describe('isSafeProofUri', () => {
  it.each([
    ['https://example.com/a.jpg', true],
    ['ipfs://bafy', true],
    ['ar://abc', true],
    ['http://example.com/a.jpg', false],
    ['javascript:alert(1)', false],
    ['data:image/png;base64,AAAA', false],
    ['not a url', false],
  ])('%s → %s', (uri, safe) => {
    expect(isSafeProofUri(uri)).toBe(safe);
  });
});
