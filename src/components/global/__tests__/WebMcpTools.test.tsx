import { render } from '@testing-library/react';
import WebMcpTools, {
  buildWebMcpTools,
  WebMcpTool,
  withErrorText,
} from '../WebMcpTools';

const mockPush = jest.fn();
const mockFetchByKeyword = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));
jest.mock('@/trpc/client', () => ({
  trpcClient: {
    bounties: {
      fetchByKeyword: {
        query: (...args: unknown[]) => mockFetchByKeyword(...args),
      },
      fetch: { query: jest.fn() },
    },
    claims: { fetchBountyClaims: { query: jest.fn() } },
  },
}));
jest.mock('@/utils/config', () => {
  const chain = (id: number, slug: string) => ({
    id,
    slug,
    currency: 'eth',
    contracts: { mainContract: '0x5555fa783936c260f77385b4e153b9725fef1719' },
  });
  return {
    chains: {
      mainnet: chain(1, 'mainnet'),
      arbitrum: chain(42161, 'arbitrum'),
      base: chain(8453, 'base'),
      degen: chain(666666666, 'degen'),
    },
  };
});

const byName = (tools: WebMcpTool[], name: string) => {
  const tool = tools.find((t) => t.name === name);
  if (!tool) throw new Error(`missing ${name}`);
  return tool;
};

afterEach(() => {
  jest.clearAllMocks();
  delete (document as unknown as { modelContext?: unknown }).modelContext;
});

describe('buildWebMcpTools', () => {
  it('matches the MCP tool names and Chrome size budgets', () => {
    const tools = buildWebMcpTools(jest.fn());
    expect(tools.map((t) => t.name)).toEqual([
      'find_bounties',
      'get_bounty',
      'create_bounty',
      'join_bounty',
      'submit_claim',
      'accept_claim',
      'vote',
      'resolve_vote',
      'withdraw',
    ]);
    for (const tool of tools) {
      expect(tool.name.length).toBeLessThanOrEqual(30);
      expect(tool.description.length).toBeLessThanOrEqual(500);
    }
  });

  it('marks read tools read-only with untrusted user content', () => {
    const tools = buildWebMcpTools(jest.fn());
    for (const name of ['find_bounties', 'get_bounty']) {
      expect(byName(tools, name).annotations).toEqual({
        readOnlyHint: true,
        untrustedContentHint: true,
      });
    }
    expect(byName(tools, 'create_bounty').annotations).toEqual({
      consequentialHint: true,
    });
  });

  it('action tools open the /tx approval page with plain parameters', async () => {
    const navigate = jest.fn();
    const tools = buildWebMcpTools(navigate);
    const result = await byName(tools, 'vote').execute({
      chain: 'base',
      id: 1271,
      approve: false,
    });
    expect(navigate).toHaveBeenCalledWith(
      '/tx?action=vote&chain=base&id=1271&approve=false'
    );
    expect(result).toMatch(/approves in their own wallet/);
  });

  it('action tools refuse invalid input without navigating', async () => {
    const navigate = jest.fn();
    const tools = buildWebMcpTools(navigate);
    await expect(
      byName(tools, 'submit_claim').execute({
        chain: 'base',
        id: 1,
        title: 't',
        description: 'd',
        proofUri: 'javascript:alert(1)',
      })
    ).rejects.toThrow(/proofUri/);
    await expect(
      byName(tools, 'withdraw').execute({ chain: 'degen' })
    ).rejects.toThrow(/chain/);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('find_bounties clamps the limit and trims output', async () => {
    mockFetchByKeyword.mockResolvedValue({
      items: [
        {
          id: 1493,
          chainId: 8453,
          title: 'x'.repeat(500),
          amount: '10700000000000000',
          inProgress: true,
          isCanceled: false,
          isMultiplayer: true,
          isVoting: false,
        },
      ],
    });
    const out = JSON.parse(
      await byName(buildWebMcpTools(jest.fn()), 'find_bounties').execute({
        limit: 99,
      })
    );
    expect(mockFetchByKeyword).toHaveBeenCalledWith({ keyword: '', limit: 5 });
    expect(out.bounties[0]).toMatchObject({
      id: 1493,
      chain: 'base',
      type: 'open',
      status: 'open',
      reward: '0.0107 eth',
      url: '/base/bounty/1493',
    });
    expect(out.bounties[0].title.length).toBe(160);
    expect(out.note).toMatch(/user-written/);
  });
});

it('keeps a full page of results under the output budget', async () => {
  mockFetchByKeyword.mockResolvedValue({
    items: Array.from({ length: 5 }, (_, i) => ({
      id: 1000 + i,
      chainId: 8453,
      title: 'y'.repeat(500),
      amount: '10700000000000000',
      inProgress: true,
      isCanceled: false,
      isMultiplayer: false,
      isVoting: false,
    })),
  });
  const text = await byName(
    buildWebMcpTools(jest.fn()),
    'find_bounties'
  ).execute({});
  expect(text.length).toBeLessThanOrEqual(1500);
  const out = JSON.parse(text);
  expect(out.bounties.length).toBeGreaterThanOrEqual(3);
  expect(out.bounties[0].id).toBe(1000);
});

describe('withErrorText', () => {
  it('returns thrown errors as text the agent can read', async () => {
    const tool = withErrorText({
      name: 't',
      description: 'd',
      inputSchema: {},
      execute: async () => {
        throw new Error('bad chain');
      },
    });
    await expect(tool.execute({})).resolves.toBe('Error: bad chain');
  });
});

describe('<WebMcpTools />', () => {
  it('does nothing when the browser has no WebMCP', () => {
    expect(() => render(<WebMcpTools />)).not.toThrow();
  });

  it('registers every tool with one signal and unregisters on unmount', async () => {
    const registerTool = jest.fn(async () => undefined);
    (document as unknown as { modelContext: unknown }).modelContext = {
      registerTool,
    };
    const { unmount } = render(<WebMcpTools />);
    expect(registerTool).toHaveBeenCalledTimes(9);
    const signals = registerTool.mock.calls.map(
      (call) =>
        (call as unknown as [unknown, { signal: AbortSignal }])[1].signal
    );
    expect(new Set(signals).size).toBe(1);
    expect(signals[0].aborted).toBe(false);
    unmount();
    expect(signals[0].aborted).toBe(true);
  });

  it('wires action tools to the Next router', async () => {
    const registered: WebMcpTool[] = [];
    (document as unknown as { modelContext: unknown }).modelContext = {
      registerTool: async (tool: WebMcpTool) => {
        registered.push(tool);
      },
    };
    render(<WebMcpTools />);
    await byName(registered, 'withdraw').execute({ chain: 'base' });
    expect(mockPush).toHaveBeenCalledWith('/tx?action=withdraw&chain=base');
  });
});
