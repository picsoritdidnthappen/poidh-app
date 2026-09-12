'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { arbitrum, base, mainnet } from 'viem/chains';
import { formatEther, formatUnits, isAddress, erc20Abi } from 'viem';
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

const DEFAULT_TOKENS: Omit<CustomToken, 'raw' | 'formatted'>[] = [
  {
    chainId: arbitrum.id,
    address: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
    symbol: 'USDC',
    decimals: 6,
    isCustom: false,
  },
  {
    chainId: base.id,
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    symbol: 'USDC',
    decimals: 6,
    isCustom: false,
  },
  {
    chainId: mainnet.id,
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    symbol: 'USDC',
    decimals: 6,
    isCustom: false,
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
  const [isLoading, setIsLoading] = useState(false);
  const [anychainEnabled, setAnychainEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('poidh_anychain_enabled');
      return stored === null ? true : stored === 'true';
    }
    return true;
  });

  const [isDisclosed, setIsDisclosed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('poidh_disclose_balances');
      return stored === null ? true : stored === 'true';
    }
    return true;
  });

  const [customTokens, setCustomTokens] = useState<CustomToken[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('poidh_custom_tokens');
        if (stored) {
          const parsed = JSON.parse(stored) as CustomToken[];
          const merged = [...DEFAULT_TOKENS.map((t) => ({ ...t }))];
          for (const item of parsed) {
            if (
              !merged.some(
                (m) =>
                  m.chainId === item.chainId &&
                  m.address.toLowerCase() === item.address.toLowerCase()
              )
            ) {
              merged.push(item);
            }
          }
          return merged;
        }
      } catch (e) {
        console.error('Failed to parse custom tokens from localStorage', e);
      }
    }
    return DEFAULT_TOKENS.map((t) => ({ ...t }));
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

      const tokenResults = await Promise.allSettled(
        customTokens.map(async (t) => {
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
  }, [address, customTokens]);

  useEffect(() => {
    if (enabled) {
      fetchBalances();
    }
  }, [enabled, fetchBalances]);

  const addCustomToken = useCallback(
    async (targetChainId: number, tokenAddr: string) => {
      const trimmed = tokenAddr.trim();
      if (!isAddress(trimmed)) {
        throw new Error('Invalid Ethereum contract address');
      }
      const cleanAddr = trimmed.toLowerCase() as `0x${string}`;
      const existing = customTokens.find(
        (t) =>
          t.chainId === targetChainId && t.address.toLowerCase() === cleanAddr
      );
      if (existing) {
        throw new Error(`Token ${existing.symbol} is already added`);
      }

      const client = getPublicClientForChain(targetChainId);
      let symbol: string;
      let decimals: number;
      try {
        const [symResult, decResult] = await Promise.all([
          client.readContract({
            address: cleanAddr,
            abi: erc20Abi,
            functionName: 'symbol',
          }),
          client.readContract({
            address: cleanAddr,
            abi: erc20Abi,
            functionName: 'decimals',
          }),
        ]);
        symbol = symResult as string;
        decimals = Number(decResult);
      } catch (err) {
        console.error('Failed to query ERC-20 details:', err);
        throw new Error('Contract is not a valid ERC-20 token on this chain');
      }

      const newToken: CustomToken = {
        chainId: targetChainId,
        address: cleanAddr,
        symbol,
        decimals: Number(decimals),
        isCustom: true,
      };

      const updated = [...customTokens, newToken];
      setCustomTokens(updated);
      if (typeof window !== 'undefined') {
        const onlyCustom = updated.filter((t) => t.isCustom);
        localStorage.setItem('poidh_custom_tokens', JSON.stringify(onlyCustom));
      }

      if (address) {
        try {
          const bal = (await client.readContract({
            address: cleanAddr,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [address as `0x${string}`],
          })) as bigint;
          setTokenBalances((prev) => ({
            ...prev,
            [`${targetChainId}-${cleanAddr}`]: {
              raw: bal,
              formatted: Number(formatUnits(bal, decimals)).toLocaleString(
                undefined,
                {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }
              ),
            },
          }));
        } catch (e) {
          console.error('Error fetching new token balance:', e);
        }
      }

      return newToken;
    },
    [address, customTokens]
  );

  const removeCustomToken = useCallback(
    (targetChainId: number, tokenAddr: string) => {
      const cleanAddr = tokenAddr.toLowerCase();
      const updated = customTokens.filter(
        (t) =>
          !(
            t.chainId === targetChainId && t.address.toLowerCase() === cleanAddr
          )
      );
      setCustomTokens(updated);
      if (typeof window !== 'undefined') {
        const onlyCustom = updated.filter((t) => t.isCustom);
        localStorage.setItem('poidh_custom_tokens', JSON.stringify(onlyCustom));
      }
    },
    [customTokens]
  );

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
      tokens: customTokens
        .filter((t) => t.chainId === arbitrum.id)
        .map((t) => ({
          ...t,
          raw:
            tokenBalances[`${t.chainId}-${t.address.toLowerCase()}`]?.raw ??
            BigInt(0),
          formatted:
            tokenBalances[`${t.chainId}-${t.address.toLowerCase()}`]
              ?.formatted ?? '0.00',
        })),
    },
    {
      chainId: base.id,
      name: 'Base',
      symbol: 'ETH',
      raw: balances.base,
      formatted: Number(formatEther(balances.base)).toFixed(4),
      isCurrent: chainId === base.id,
      tokens: customTokens
        .filter((t) => t.chainId === base.id)
        .map((t) => ({
          ...t,
          raw:
            tokenBalances[`${t.chainId}-${t.address.toLowerCase()}`]?.raw ??
            BigInt(0),
          formatted:
            tokenBalances[`${t.chainId}-${t.address.toLowerCase()}`]
              ?.formatted ?? '0.00',
        })),
    },
    {
      chainId: mainnet.id,
      name: 'Ethereum',
      symbol: 'ETH',
      raw: balances.mainnet,
      formatted: Number(formatEther(balances.mainnet)).toFixed(4),
      isCurrent: chainId === mainnet.id,
      tokens: customTokens
        .filter((t) => t.chainId === mainnet.id)
        .map((t) => ({
          ...t,
          raw:
            tokenBalances[`${t.chainId}-${t.address.toLowerCase()}`]?.raw ??
            BigInt(0),
          formatted:
            tokenBalances[`${t.chainId}-${t.address.toLowerCase()}`]
              ?.formatted ?? '0.00',
        })),
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
    addCustomToken,
    removeCustomToken,
    isLoading,
    refetch: fetchBalances,
  };
}
