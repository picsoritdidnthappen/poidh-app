import clientEnv from '@/utils/clientEnv';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { zeroDevRainbowWallet } from '../wagmiConfig';

jest.mock('@/utils/clientEnv', () => ({
  __esModule: true,
  default: { ZERODEV_PROJECT_ID: undefined },
}));
jest.mock('@rainbow-me/rainbowkit', () => ({
  getDefaultConfig: jest.fn((options) => options),
  getDefaultWallets: () => ({
    wallets: [{ groupName: 'Existing wallets', wallets: [] }],
  }),
}));
jest.mock('viem', () => ({ http: jest.fn() }));
jest.mock('wagmi/chains', () => ({
  arbitrum: { id: 42161 },
  base: { id: 8453 },
  mainnet: { id: 1 },
}));
jest.mock('@zerodev/wallet-react', () => ({
  zeroDevWallet: jest.fn(() => () => mockBaseConnector),
}));

const mockRequest = jest.fn();
const mockConnect = jest.fn();
const mockBaseConnector = {
  connect: mockConnect,
  getProvider: jest.fn(async () => ({ request: mockRequest })),
  getStore: jest.fn(async () => ({ getState: () => ({}) })),
};

function createConnector() {
  return zeroDevRainbowWallet().createConnector(
    {} as Parameters<
      ReturnType<typeof zeroDevRainbowWallet>['createConnector']
    >[0]
  )({} as never);
}

beforeEach(() => {
  mockRequest.mockClear();
  mockConnect.mockClear();
  clientEnv.ZERODEV_PROJECT_ID = 'test-project';
  mockConnect.mockResolvedValue({ accounts: ['0x123'], chainId: 8453 });
  mockRequest.mockResolvedValue('0xhash');
});

test('missing optional ZeroDev configuration keeps existing wallets available', () => {
  expect((getDefaultConfig as jest.Mock).mock.calls[0][0].wallets).toEqual([
    { groupName: 'Existing wallets', wallets: [] },
  ]);
  clientEnv.ZERODEV_PROJECT_ID = undefined;
  expect(createConnector).toThrow('Missing NEXT_PUBLIC_ZERODEV_PROJECT_ID');
});

test('background reconnection does not open or wait for interactive login', async () => {
  const open = jest.fn();
  window.addEventListener('open-zerodev-auth', open);
  try {
    await createConnector().connect({ isReconnecting: true });
    expect(open).not.toHaveBeenCalled();
    expect(mockConnect).toHaveBeenCalledWith({ isReconnecting: true });
  } finally {
    window.removeEventListener('open-zerodev-auth', open);
  }
});

test('authentication listeners are ready before the sign-in event fires', async () => {
  const completeAuth = () => {
    window.dispatchEvent(new CustomEvent('zerodev-auth-success'));
  };
  window.addEventListener('open-zerodev-auth', completeAuth);
  try {
    await expect(createConnector().connect()).resolves.toEqual({
      accounts: ['0x123'],
      chainId: 8453,
    });
    expect(mockConnect).toHaveBeenCalledTimes(1);
  } finally {
    window.removeEventListener('open-zerodev-auth', completeAuth);
  }
});

test('cancelled authentication never connects the wallet', async () => {
  const cancelAuth = () => {
    window.dispatchEvent(new CustomEvent('zerodev-auth-cancel'));
  };
  window.addEventListener('open-zerodev-auth', cancelAuth);
  try {
    await expect(createConnector().connect()).rejects.toThrow('User cancelled');
    expect(mockConnect).not.toHaveBeenCalled();
  } finally {
    window.removeEventListener('open-zerodev-auth', cancelAuth);
  }
});

test('rejecting transaction approval prevents submission to the provider', async () => {
  const rejectApproval = (event: Event) => {
    (event as CustomEvent).detail.reject(new Error('User rejected'));
  };
  window.addEventListener('zerodev-request-approval', rejectApproval);
  try {
    const provider = (await createConnector().getProvider()) as {
      request: (args: {
        method: string;
        params: unknown[];
      }) => Promise<unknown>;
    };
    await expect(
      provider.request({
        method: 'eth_sendTransaction',
        params: [{ chainId: 8453, value: '0x1' }],
      })
    ).rejects.toThrow('User rejected');
    expect(mockRequest).not.toHaveBeenCalled();
  } finally {
    window.removeEventListener('zerodev-request-approval', rejectApproval);
  }
});
