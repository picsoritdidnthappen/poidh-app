'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { arbitrum, base, mainnet } from 'viem/chains';
import { formatEther, formatUnits, erc20Abi } from 'viem';
import {
  arbitrumPublicClient,
  basePublicClient,
  mainnetPublicClient,
} from '@/utils/publicClients';

export interface CustomToken {
  chainId: number;
  address: `0x${string}`;
  symbol: string;
  decimals: number;
  raw?: bigint;
  formatted?: string;
  isCustom?: boolean;
}

export interface ChainBalanceInfo {
  chainId: number;
  name: string;
  symbol: string;
  raw: bigint;
  formatted: string;
  isCurrent: boolean;
  tokens: CustomToken[];
}

// Fixed token list: the token addresses supported on Anychain for our 3 chains
// (native ETH is tracked separately as the chain balance).
const SUPPORTED_TOKENS: Omit<CustomToken, 'raw' | 'formatted'>[] = [
  // Arbitrum
  {
    chainId: arbitrum.id,
    address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    symbol: 'WETH',
    decimals: 18,
  },
  {
    chainId: arbitrum.id,
    address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    symbol: 'USDC',
    decimals: 6,
  },
  {
    chainId: arbitrum.id,
    address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    symbol: 'USDT',
    decimals: 6,
  },
  {
    chainId: arbitrum.id,
    address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
    symbol: 'WBTC',
    decimals: 8,
  },
  // Base (no WBTC supported)
  {
    chainId: base.id,
    address: '0x4200000000000000000000000000000000000006',
    symbol: 'WETH',
    decimals: 18,
  },
  {
    chainId: base.id,
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    symbol: 'USDC',
    decimals: 6,
  },
  {
    chainId: base.id,
    address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
    symbol: 'USDT',
    decimals: 6,
  },
  // Ethereum
  {
    chainId: mainnet.id,
    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    symbol: 'WETH',
    decimals: 18,
  },
  {
    chainId: mainnet.id,
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    symbol: 'USDC',
    decimals: 6,
  },
  {
    chainId: mainnet.id,
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    symbol: 'USDT',
    decimals: 6,
  },
  {
    chainId: mainnet.id,
    address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    symbol: 'WBTC',
    decimals: 8,
  },
];

const getPublicClientForChain = (targetChainId: number) => {
  switch (targetChainId) {
    case arbitrum.id:
      return arbitrumPublicClient;
    case base.id:
      return basePublicClient;
    case mainnet.id:
      return mainnetPublicClient;
    default:
      return arbitrumPublicClient;
  }
};

export function useAnychainBalances(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  const { address, chainId } = useAccount();
  const [balances, setBalances] = useState<{
    arbitrum: bigint;
    base: bigint;
    mainnet: bigint;
  }>({
    arbitrum: BigInt(0),
    base: BigInt(0),
    mainnet: BigInt(0),
  });
  const [tokenBalances, setTokenBalances] = useState<
    Record<string, { raw: bigint; formatted: string }>
  >({});
  const [isLoading, setIsLoading] = useState(enabled);
  const [balancesFailed, setBalancesFailed] = useState(false);
  const [anychainEnabled, setAnychainEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('poidh_anychain_enabled');
      return stored === null ? false : stored === 'true';
    }
    return false;
  });

  const [isDisclosed, setIsDisclosed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('poidh_disclose_balances');
      return stored === null ? true : stored === 'true';
    }
    return true;
  });

  const toggleDisclose = useCallback((disclose?: boolean) => {
    setIsDisclosed((prev) => {
      const next = disclose !== undefined ? disclose : !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('poidh_disclose_balances', String(next));
      }
      return next;
    });
  }, []);

  const toggleAnychain = useCallback((val?: boolean) => {
    setAnychainEnabled((prev) => {
      const next = val !== undefined ? val : !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('poidh_anychain_enabled', String(next));
      }
      return next;
    });
  }, []);

  const fetchBalances = useCallback(async () => {
    if (!address) return;
    try {
      setIsLoading(true);

      const [arbBal, baseBal, mainBal] = await Promise.allSettled([
        arbitrumPublicClient.getBalance({ address: address as `0x${string}` }),
        basePublicClient.getBalance({ address: address as `0x${string}` }),
        mainnetPublicClient.getBalance({ address: address as `0x${string}` }),
      ]);

      setBalances({
        arbitrum: arbBal.status === 'fulfilled' ? arbBal.value : BigInt(0),
        base: baseBal.status === 'fulfilled' ? baseBal.value : BigInt(0),
        mainnet: mainBal.status === 'fulfilled' ? mainBal.value : BigInt(0),
      });
      setBalancesFailed(
        arbBal.status === 'rejected' &&
          baseBal.status === 'rejected' &&
          mainBal.status === 'rejected'
      );

      const tokenResults = await Promise.allSettled(
        SUPPORTED_TOKENS.map(async (t) => {
          const client = getPublicClientForChain(t.chainId);
          const bal = (await client.readContract({
            address: t.address,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [address as `0x${string}`],
          })) as bigint;
          return {
            key: `${t.chainId}-${t.address.toLowerCase()}`,
            raw: bal,
            formatted: Number(formatUnits(bal, t.decimals)).toLocaleString(
              undefined,
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }
            ),
          };
        })
      );

      const nextTokenBals: Record<string, { raw: bigint; formatted: string }> =
        {};
      for (const res of tokenResults) {
        if (res.status === 'fulfilled') {
          nextTokenBals[res.value.key] = {
            raw: res.value.raw,
            formatted: res.value.formatted,
          };
        }
      }
      setTokenBalances(nextTokenBals);
    } catch (e) {
      console.error('Error fetching multi-chain balances:', e);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (enabled) {
      fetchBalances();
    }
  }, [enabled, fetchBalances]);

  // Total ETH across Arbitrum + Base + Mainnet
  const totalEthRaw = balances.arbitrum + balances.base + balances.mainnet;
  const totalEthFormatted = Number(formatEther(totalEthRaw)).toFixed(4);

  // Other chains ETH excluding active chain
  const getOtherChainsEth = useCallback(
    (currentChainId?: number) => {
      const activeId = currentChainId || chainId || arbitrum.id;
      let other = BigInt(0);
      if (activeId !== arbitrum.id) other += balances.arbitrum;
      if (activeId !== base.id) other += balances.base;
      if (activeId !== mainnet.id) other += balances.mainnet;
      return Number(formatEther(other));
    },
    [balances, chainId]
  );

  const chainList: ChainBalanceInfo[] = [
    {
      chainId: arbitrum.id,
      name: 'Arbitrum',
      symbol: 'ETH',
      raw: balances.arbitrum,
      formatted: Number(formatEther(balances.arbitrum)).toFixed(4),
      isCurrent: (chainId || arbitrum.id) === arbitrum.id,
      tokens: SUPPORTED_TOKENS.filter((t) => t.chainId === arbitrum.id).map(
        (t) => ({
          ...t,
          raw:
            tokenBalances[`${t.chainId}-${t.address.toLowerCase()}`]?.raw ??
            BigInt(0),
          formatted:
            tokenBalances[`${t.chainId}-${t.address.toLowerCase()}`]
              ?.formatted ?? '0.00',
        })
      ),
    },
    {
      chainId: base.id,
      name: 'Base',
      symbol: 'ETH',
      raw: balances.base,
      formatted: Number(formatEther(balances.base)).toFixed(4),
      isCurrent: chainId === base.id,
      tokens: SUPPORTED_TOKENS.filter((t) => t.chainId === base.id).map(
        (t) => ({
          ...t,
          raw:
            tokenBalances[`${t.chainId}-${t.address.toLowerCase()}`]?.raw ??
            BigInt(0),
          formatted:
            tokenBalances[`${t.chainId}-${t.address.toLowerCase()}`]
              ?.formatted ?? '0.00',
        })
      ),
    },
    {
      chainId: mainnet.id,
      name: 'Ethereum',
      symbol: 'ETH',
      raw: balances.mainnet,
      formatted: Number(formatEther(balances.mainnet)).toFixed(4),
      isCurrent: chainId === mainnet.id,
      tokens: SUPPORTED_TOKENS.filter((t) => t.chainId === mainnet.id).map(
        (t) => ({
          ...t,
          raw:
            tokenBalances[`${t.chainId}-${t.address.toLowerCase()}`]?.raw ??
            BigInt(0),
          formatted:
            tokenBalances[`${t.chainId}-${t.address.toLowerCase()}`]
              ?.formatted ?? '0.00',
        })
      ),
    },
  ];

  return {
    address,
    balances,
    chainList,
    totalEthRaw,
    totalEthFormatted,
    getOtherChainsEth,
    anychainEnabled,
    toggleAnychain,
    isDisclosed,
    toggleDisclose,
    isLoading,
    balancesFailed,
    refetch: fetchBalances,
  };
}
