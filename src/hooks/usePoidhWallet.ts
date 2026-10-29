import { setLoadingAtom } from '@/store/loading';
import { Chain } from '@/utils/types';
import { useSetAtom } from 'jotai';
import { useCallback, useMemo } from 'react';
import { useConfig, type Config } from 'wagmi';
import { getAccount, switchChain, watchAccount } from 'wagmi/actions';

const RECONNECT_TIMEOUT_MS = 10_000;

type WalletProvider = {
  // eslint-disable-next-line no-unused-vars
  request: (args: {
    method: string;
    params?: readonly unknown[];
  }) => Promise<unknown>;
  session?: { peer?: { metadata?: { name?: string; url?: string } } };
};

/**
 * Waits for wagmi to finish reconnecting the saved wallet after a page load.
 * Until then, the connector in the store is a placeholder that can't send.
 */
function waitForReconnect(config: Config) {
  if (getAccount(config).status !== 'reconnecting') return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      unwatch();
      reject(new Error('Wallet is still reconnecting. Please try again.'));
    }, RECONNECT_TIMEOUT_MS);
    const unwatch = watchAccount(config, {
      onChange(account) {
        if (account.status === 'reconnecting') return;
        clearTimeout(timeout);
        unwatch();
        resolve();
      },
    });
  });
}

/** Gives the connected wallet's connector, or throws if there isn't one. */
function getConnectedWallet(config: Config) {
  const { connector, address } = getAccount(config);
  if (!connector || !address) {
    throw new Error('Wallet connector unavailable');
  }
  return { connector, address };
}

/**
 * Asks the wallet for its chain until it reports `chain`. WalletConnect
 * wallets can say a network switch worked before they are on the new chain.
 */
async function verifyWalletChain(provider: WalletProvider, chain: Chain) {
  let actualChainId: number | null = null;

  for (let attempt = 0; attempt < 8; attempt++) {
    const rawChainId = await provider.request({ method: 'eth_chainId' });

    if (
      typeof rawChainId !== 'string' &&
      typeof rawChainId !== 'number' &&
      typeof rawChainId !== 'bigint'
    ) {
      throw new Error('Unable to verify wallet network');
    }

    actualChainId = Number(rawChainId);

    if (!Number.isSafeInteger(actualChainId) || actualChainId <= 0) {
      throw new Error('Unable to verify wallet network');
    }

    if (actualChainId === chain.id) return;

    if (attempt < 7) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  throw new Error(
    `Wrong network selected in wallet. Please switch to ${chain.slug} and try again.`
  );
}

/**
 * Wallet steps to run before sending or signing. Both functions read the
 * wallet from wagmi when they are called, not from useAccount, because
 * useAccount only updates the fields a component has read during a render
 * and can still hold the placeholder connector from the wallet cookie.
 *
 * - `prepareWallet(chainId)` waits for the wallet to reconnect and switches
 *   it to `chainId` if needed.
 * - `validatePoidhTx(chain)` checks the wallet is really on `chain` and the
 *   poidh contract exists there, and gives the contract address.
 */
export function usePoidhWallet() {
  const config = useConfig();
  const setLoading = useSetAtom(setLoadingAtom);

  const prepareWallet = useCallback(
    async (chainId: number, { showLoading = true } = {}) => {
      await waitForReconnect(config);

      const { connector } = getConnectedWallet(config);
      if ((await connector.getChainId()) === chainId) return;

      if (showLoading) {
        setLoading({ isLoading: true, status: 'Switching network...' });
      }
      await switchChain(config, { chainId });
    },
    [config, setLoading]
  );

  const validatePoidhTx = useCallback(
    async (chain: Chain) => {
      const { connector, address } = getConnectedWallet(config);

      const provider = (await connector.getProvider()) as
        | WalletProvider
        | undefined;
      if (!provider) throw new Error('Unable to access wallet provider');

      const peerMetadata = provider.session?.peer?.metadata;
      const isWalletConnect =
        connector.id.toLowerCase().includes('walletconnect') ||
        connector.name.toLowerCase().includes('walletconnect');
      const isAmbire =
        peerMetadata?.name?.toLowerCase().includes('ambire') ||
        peerMetadata?.url?.toLowerCase().includes('ambire');

      if (isWalletConnect && isAmbire) {
        throw new Error(
          'Ambire via WalletConnect is temporarily unsupported due to a network verification issue. Please use another wallet or connection method.'
        );
      }

      await verifyWalletChain(provider, chain);

      // Stops ETH going to the same address on a chain with no poidh contract
      const contractAddress = chain.contracts.mainContract as `0x${string}`;
      const contractCode = await provider.request({
        method: 'eth_getCode',
        params: [contractAddress, 'latest'],
      });

      if (
        typeof contractCode !== 'string' ||
        contractCode === '0x' ||
        /^0x0*$/.test(contractCode)
      ) {
        throw new Error(
          `poidh contract not found on ${chain.slug}. Transaction cancelled.`
        );
      }

      return { address, contractAddress };
    },
    [config]
  );

  return useMemo(
    () => ({ prepareWallet, validatePoidhTx }),
    [prepareWallet, validatePoidhTx]
  );
}
