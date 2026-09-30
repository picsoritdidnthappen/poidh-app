'use client';

import { arbitrum, base, mainnet } from 'viem/chains';
import {
  arbitrumPublicClient,
  basePublicClient,
  mainnetPublicClient,
} from '@/utils/publicClients';

export const NATIVE_TOKEN_ADDRESS =
  '0x0000000000000000000000000000000000000000' as const;

export const SUPPORTED_CHAIN_IDS = [arbitrum.id, base.id, mainnet.id] as const;

export interface RoutingToken {
  chainId: number;
  address: `0x${string}`;
  symbol: string;
  decimals: number;
}

// Single source of truth for the tokens Anychain can route, per chain.
// (Native ETH is tracked separately as each chain's balance.)
export const SUPPORTED_TOKENS: RoutingToken[] = [
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

export const USDC_ADDRESSES: Record<number, `0x${string}`> = Object.fromEntries(
  SUPPORTED_TOKENS.filter((t) => t.symbol === 'USDC').map((t) => [
    t.chainId,
    t.address,
  ])
);

// Display-only chain name. Never use for send paths: those throw on
// unknown chains in kernelClient instead of guessing.
export function chainNameFor(chainId: number): string {
  if (chainId === base.id) return 'Base';
  if (chainId === mainnet.id) return 'Ethereum';
  if (chainId === arbitrum.id) return 'Arbitrum';
  return 'Unknown chain';
}

// Fail closed: no silent fallback to another chain's client.
export function publicClientFor(chainId: number) {
  if (chainId === base.id) return basePublicClient;
  if (chainId === mainnet.id) return mainnetPublicClient;
  if (chainId === arbitrum.id) return arbitrumPublicClient;
  throw new Error(
    `Unsupported chain for balance reads: ${chainId}. Supported chains are Arbitrum, Base, and Ethereum.`
  );
}

export interface NativeBalances {
  arbitrum: bigint;
  base: bigint;
  mainnet: bigint;
}

// Balance check for one chain. Throws on unknown chains: reading another
// chain's balance would wrongly report "sufficient" or "empty".
export function nativeBalanceFor(
  balances: NativeBalances,
  chainId: number
): bigint {
  if (chainId === base.id) return balances.base;
  if (chainId === mainnet.id) return balances.mainnet;
  if (chainId === arbitrum.id) return balances.arbitrum;
  throw new Error(
    `Unsupported chain for balance check: ${chainId}. Supported chains are Arbitrum, Base, and Ethereum.`
  );
}

export function isNativeToken(tokenAddress: string): boolean {
  return tokenAddress.toLowerCase() === NATIVE_TOKEN_ADDRESS;
}

// ETH-denominated value of a supported token balance, so native + token
// balances can be summed into one figure. Stables price at $1, WETH at
// the ETH price, WBTC at the BTC price; unknown symbols count as zero
// rather than inflating the total.
export function tokenEthValue(
  symbol: string,
  raw: bigint,
  decimals: number,
  ethPriceUsd: number,
  btcPriceUsd: number
): number {
  if (raw <= BigInt(0)) return 0;
  const amount = Number(raw) / 10 ** decimals;
  if (symbol === 'WETH') return amount;
  if (symbol === 'USDC' || symbol === 'USDT') {
    return ethPriceUsd > 0 ? amount / ethPriceUsd : 0;
  }
  if (symbol === 'WBTC') {
    return ethPriceUsd > 0 ? (amount * btcPriceUsd) / ethPriceUsd : 0;
  }
  return 0;
}
