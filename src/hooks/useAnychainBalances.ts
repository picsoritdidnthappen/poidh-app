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
import {
  SUPPORTED_TOKENS,
  publicClientFor,
  tokenEthValue,
} from '@/components/auth/chains';

// Cached USD prices so balance refetches don't hammer the price API.
let cachedPrices = { eth: 2500, btc: 100000, ts: 0 };
const PRICE_TTL_MS = 5 * 60 * 1000;

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
          const client = publicClientFor(t.chainId);
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

  // Combined routable value: native ETH plus every supported token
  // converted to ETH, so the hero reflects what routing can actually use.
  const [prices, setPrices] = useState({
    eth: cachedPrices.eth,
    btc: cachedPrices.btc,
  });
  useEffect(() => {
    if (!enabled) return;
    if (Date.now() - cachedPrices.ts < PRICE_TTL_MS) {
      setPrices({ eth: cachedPrices.eth, btc: cachedPrices.btc });
      return;
    }
    let alive = true;
    (async () => {
      try {
        const res = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin&vs_currencies=usd',
          { headers: { Accept: 'application/json' } }
        );
        if (res.ok) {
          const data = await res.json();
          const eth = Number(data?.ethereum?.usd);
          const btc = Number(data?.bitcoin?.usd);
          if (eth > 0 && btc > 0 && alive) {
            cachedPrices = { eth, btc, ts: Date.now() };
            setPrices({ eth, btc });
          }
        }
      } catch {
        // Keep last cached prices; token conversion stays approximate.
      }
    })();
    return () => {
      alive = false;
    };
  }, [enabled]);

  const totalCombinedEth =
    Number(formatEther(totalEthRaw)) +
    SUPPORTED_TOKENS.reduce(
      (sum, t) =>
        sum +
        tokenEthValue(
          t.symbol,
          tokenBalances[`${t.chainId}-${t.address.toLowerCase()}`]?.raw ??
            BigInt(0),
          t.decimals,
          prices.eth,
          prices.btc
        ),
      0
    );
  const totalCombinedEthFormatted = totalCombinedEth.toFixed(4);

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
    totalCombinedEth,
    totalCombinedEthFormatted,
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
