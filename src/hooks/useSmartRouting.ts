'use client';

import { useEffect, useMemo, useState } from 'react';
import { erc20Abi, formatEther, formatUnits } from 'viem';
import { arbitrum, base, mainnet, optimism } from 'viem/chains';
import {
  createSmartRoutingAddress,
  createCall,
  FLEX,
  SMART_ROUTING_ADDRESS_SERVER_URL,
  getSmartRoutingAddressStatus,
  getSmartRoutingAddressFeeEstimates,
  getWithdrawTokensCalls,
  type DepositedToken,
} from '@zerodev/smart-routing-address';
import { ChainBalanceInfo, CustomToken } from '@/hooks/useAnychainBalances';
import clientEnv from '@/utils/clientEnv';

export interface RouteStep {
  chainId: number;
  chainName: string;
  tokenSymbol: string;
  amountFormatted: string;
  amountEthEquivalent: number;
  amountUsd: string;
  feeTier: 'lowest' | 'low' | 'standard';
  estFee: string;
  tag: string;
  minDepositFormatted?: string;
  solverFeeEth?: number;
  solverFeeUsd?: number;
  isSponsored?: boolean;
  isMinimumEnforced?: boolean;
  surplusEth?: number;
  surplusUsd?: number;
}

export interface SolverFeeDetails {
  feeEth: number;
  feeUsd: number;
  minDepositEth: number;
  minDepositUsdc: number;
  maxDepositEth?: number;
  isSponsored: boolean;
}

export interface ChainBridgeMinimum {
  chainId: number;
  chainName: string;
  minEth: number;
  minEthUsd: number;
  minUsdc: number;
  userEthAvailable: number;
  userUsdcAvailable: number;
  isEthMet: boolean;
  isUsdcMet: boolean;
}

export interface SmartRoutingResult {
  requiredWei: bigint;
  requiredEth: number;
  requiredUsd: number;
  targetChainId: number;
  targetChainName: string;
  currentChainBalanceWei: bigint;
  currentChainBalanceEth: number;
  hasDeficit: boolean;
  deficitWei: bigint;
  deficitEth: number;
  deficitUsd: number;
  isSufficientOnCurrentChain: boolean;
  isSufficientAcrossAllChains: boolean;
  isBelowBridgeMinimum: boolean;
  bridgeMinimumNotice?: string | null;
  chainBridgeMinimums: ChainBridgeMinimum[];
  shortfallEth: number;
  shortfallUsd: number;
  totalPortfolioEth: number;
  totalPortfolioUsd: number;
  ethPriceUsd: number;
  recommendedRoute: RouteStep[];
  totalRouteFeeEst: string;
  totalSolverFeeEth: number;
  totalSolverFeeUsd: number;
  isSponsored: boolean;
  solverFees: Record<number, SolverFeeDetails>;
  smartRoutingAddress?: string;
  smartRoutingAddresses: Record<number, string>;
  isCreatingAddress?: boolean;
}

// In-memory cache for created smart routing addresses by owner address + destination chain ID
const routingAddressCache = new Map<string, string>([
  [
    '0xd38ce0315673d5d27d6662fbe47f292e9b7dfb80-42161',
    '0xb5De12E2f04B17e7c7485377feD405B3a753adc6',
  ],
  [
    '0xd38ce0315673d5d27d6662fbe47f292e9b7dfb80-8453',
    '0xB58bDc74C9204A02854D46E18cB7A010f6Cb7De6',
  ],
  [
    '0xd38ce0315673d5d27d6662fbe47f292e9b7dfb80-1',
    '0xA3aF2A26aB026AE1eDcf726d97E40f0326958D2d',
  ],
]);

/**
 * Check the full lifecycle of deposits sent to a ZeroDev smart routing address:
 * deposit -> bridge -> execution
 */
export async function fetchSmartRoutingStatus(
  smartRoutingAddress: string
): Promise<DepositedToken[]> {
  if (!smartRoutingAddress) return [];
  try {
    const res = await getSmartRoutingAddressStatus({
      smartRoutingAddress: smartRoutingAddress as `0x${string}`,
      config: { baseUrl: SMART_ROUTING_ADDRESS_SERVER_URL },
    });
    return res.deposits || [];
  } catch (err) {
    console.warn('ZeroDev getSmartRoutingAddressStatus note:', err);
    return [];
  }
}

/**
 * Generate transactions to withdraw unbridged tokens back to the owner's smart account.
 */
export async function getRefundCalls(
  smartRoutingAddress: string,
  tokens: { chainId: number; token: `0x${string}` }[]
) {
  if (!smartRoutingAddress || !tokens.length) return null;
  return await getWithdrawTokensCalls({
    smartRoutingAddress: smartRoutingAddress as `0x${string}`,
    tokens,
    config: { baseUrl: SMART_ROUTING_ADDRESS_SERVER_URL },
  });
}

// In-memory cache for live ETH price across hook mounts
let cachedEthPrice = 2500;
let lastFetchTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// In-memory cache for live ZeroDev solver fees & bridge minimums
let cachedSolverFees: Record<number, SolverFeeDetails> = {
  [base.id]: {
    feeEth: 0.000041,
    feeUsd: 0.000041 * 2500,
    minDepositEth: 0.00457,
    minDepositUsdc: 10.44,
    isSponsored: false,
  },
  [arbitrum.id]: {
    feeEth: 0.00003558,
    feeUsd: 0.00003558 * 2500,
    minDepositEth: 0.002,
    minDepositUsdc: 5.72,
    isSponsored: false,
  },
  [mainnet.id]: {
    feeEth: 0.000124,
    feeUsd: 0.000124 * 2500,
    minDepositEth: 0.01365,
    minDepositUsdc: 33.86,
    isSponsored: false,
  },
};

interface ChainPriority {
  id: number;
  name: string;
  priority: number; // 1 = lowest fee (Base), 2 = Arbitrum, 3 = Mainnet
  feeTier: 'lowest' | 'low' | 'standard';
  tag: string;
}

const CHAIN_PRIORITIES: ChainPriority[] = [
  {
    id: base.id,
    name: 'Base',
    priority: 1,
    feeTier: 'lowest',
    tag: '⚡ Lowest Gas',
  },
  {
    id: arbitrum.id,
    name: 'Arbitrum',
    priority: 2,
    feeTier: 'low',
    tag: '⚡ Fast L2',
  },
  {
    id: mainnet.id,
    name: 'Ethereum',
    priority: 3,
    feeTier: 'standard',
    tag: 'Ethereum L1',
  },
];

export interface UseSmartRoutingParams {
  targetChainId?: number;
  requiredValue?: string | number | bigint;
  chainList: ChainBalanceInfo[];
  balances: { arbitrum: bigint; base: bigint; mainnet: bigint };
  enabled?: boolean;
  userAddress?: string;
  anychainEnabled?: boolean;
}

export function useSmartRouting({
  targetChainId,
  requiredValue,
  chainList,
  balances,
  enabled = true,
  userAddress,
  anychainEnabled = true,
}: UseSmartRoutingParams): SmartRoutingResult {
  const [ethPrice, setEthPrice] = useState<number>(cachedEthPrice);
  const [solverFees, setSolverFees] =
    useState<Record<number, SolverFeeDetails>>(cachedSolverFees);
  const [smartRoutingAddress, setSmartRoutingAddress] = useState<
    string | undefined
  >(() => {
    if (!userAddress) return undefined;
    const activeChainId = targetChainId || arbitrum.id;
    return routingAddressCache.get(
      `${userAddress.toLowerCase()}-${activeChainId}`
    );
  });
  const [smartRoutingAddresses, setSmartRoutingAddresses] = useState<
    Record<number, string>
  >(() => {
    if (!userAddress) return {};
    const res: Record<number, string> = {};
    for (const c of [arbitrum.id, base.id, mainnet.id]) {
      const cached = routingAddressCache.get(
        `${userAddress.toLowerCase()}-${c}`
      );
      if (cached) res[c] = cached;
    }
    return res;
  });
  const [isCreatingAddress, setIsCreatingAddress] = useState(false);

  // Fetch live ETH price from CoinGecko or fallback
  useEffect(() => {
    if (!enabled) return;
    const now = Date.now();
    if (now - lastFetchTimestamp < CACHE_TTL_MS && cachedEthPrice > 0) {
      setEthPrice(cachedEthPrice);
      return;
    }

    let isMounted = true;
    const fetchPrice = async () => {
      try {
        const res = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
          { headers: { Accept: 'application/json' } }
        );
        if (res.ok) {
          const data = await res.json();
          const price = Number(data?.ethereum?.usd);
          if (price && Number.isFinite(price) && price > 0) {
            cachedEthPrice = price;
            lastFetchTimestamp = Date.now();
            if (isMounted) setEthPrice(price);
            return;
          }
        }
      } catch {
        // Fallback to cached default
      }
      if (isMounted) setEthPrice(cachedEthPrice);
    };

    fetchPrice();
    return () => {
      isMounted = false;
    };
  }, [enabled]);

  // Initialize or retrieve official ZeroDev Smart Routing Addresses across chains
  useEffect(() => {
    if (!enabled || !userAddress) return;

    const activeChainId = targetChainId || arbitrum.id;
    const cacheKey = `${userAddress.toLowerCase()}-${activeChainId}`;
    if (routingAddressCache.has(cacheKey)) {
      setSmartRoutingAddress(routingAddressCache.get(cacheKey));
    }

    let isMounted = true;
    const initSmartRoutingAddress = async () => {
      try {
        setIsCreatingAddress(true);
        const owner = userAddress as `0x${string}`;

        const erc20Call = createCall({
          target: FLEX.TOKEN_ADDRESS,
          value: BigInt(0),
          abi: erc20Abi,
          functionName: 'transfer',
          args: [owner, FLEX.AMOUNT],
        });

        const nativeCall = createCall({
          target: owner,
          value: FLEX.NATIVE_AMOUNT,
        });

        const destChains = [
          { chain: arbitrum, id: arbitrum.id },
          { chain: base, id: base.id },
          { chain: mainnet, id: mainnet.id },
        ];

        const newAddresses: Record<number, string> = {};

        await Promise.all(
          destChains.map(async ({ chain, id }) => {
            const key = `${userAddress.toLowerCase()}-${id}`;
            const cached = routingAddressCache.get(key);
            if (cached) {
              newAddresses[id] = cached;
              return;
            }

            try {
              const res = await createSmartRoutingAddress({
                owner,
                destChain: chain,
                slippage: 100, // 1% max slippage
                srcTokens: [
                  { tokenType: 'NATIVE', chain: base },
                  { tokenType: 'USDC', chain: base },
                  { tokenType: 'NATIVE', chain: arbitrum },
                  { tokenType: 'USDC', chain: arbitrum },
                  { tokenType: 'NATIVE', chain: mainnet },
                  { tokenType: 'USDC', chain: mainnet },
                  { tokenType: 'NATIVE', chain: optimism },
                  { tokenType: 'USDC', chain: optimism },
                ],
                actions: {
                  NATIVE: {
                    action: [nativeCall],
                    fallBack: [],
                  },
                  USDC: {
                    action: [erc20Call],
                    fallBack: [],
                  },
                },
                allowPartialRoutes: true,
                config: clientEnv.ZERODEV_PROJECT_ID
                  ? {
                      baseUrl: `${SMART_ROUTING_ADDRESS_SERVER_URL}/${clientEnv.ZERODEV_PROJECT_ID}`,
                    }
                  : undefined,
              });

              if (res?.smartRoutingAddress) {
                routingAddressCache.set(key, res.smartRoutingAddress);
                newAddresses[id] = res.smartRoutingAddress;
              }

              if (
                id === activeChainId &&
                res?.estimatedFees &&
                Array.isArray(res.estimatedFees)
              ) {
                const updatedFees = { ...cachedSolverFees };
                for (const feeGroup of res.estimatedFees) {
                  const chainId = feeGroup.chainId;
                  const ethFeeData = feeGroup.data?.find(
                    (d) =>
                      d.name?.toLowerCase().includes('eth') ||
                      d.token?.toLowerCase() ===
                        '0x0000000000000000000000000000000000000000'
                  );
                  const usdcFeeData = feeGroup.data?.find((d) =>
                    d.name?.toLowerCase().includes('usdc')
                  );
                  const feeEth = ethFeeData
                    ? Number(formatEther(BigInt(ethFeeData.fee || '0x0')))
                    : cachedSolverFees[chainId]?.feeEth || 0.00004;
                  const minDepositEth = ethFeeData
                    ? Number(
                        formatEther(BigInt(ethFeeData.minDeposit || '0x0'))
                      )
                    : cachedSolverFees[chainId]?.minDepositEth || 0.0045;
                  const minDepositUsdc = usdcFeeData
                    ? Number(
                        formatUnits(BigInt(usdcFeeData.minDeposit || '0x0'), 6)
                      )
                    : cachedSolverFees[chainId]?.minDepositUsdc || 10.44;

                  updatedFees[chainId] = {
                    feeEth,
                    feeUsd: feeEth * ethPrice,
                    minDepositEth,
                    minDepositUsdc,
                    isSponsored: ethFeeData?.isSponsored || false,
                  };
                }
                cachedSolverFees = updatedFees;
                setSolverFees(updatedFees);
              }
            } catch (err) {
              console.warn(
                `ZeroDev createSmartRoutingAddress note for chain ${id}:`,
                err
              );
            }
          })
        );

        if (!isMounted) return;

        setSmartRoutingAddresses((prev) => ({ ...prev, ...newAddresses }));
        if (newAddresses[activeChainId]) {
          setSmartRoutingAddress(newAddresses[activeChainId]);
        }
      } catch (err) {
        console.warn('ZeroDev createSmartRoutingAddress note:', err);
      } finally {
        if (isMounted) setIsCreatingAddress(false);
      }
    };

    initSmartRoutingAddress();
    return () => {
      isMounted = false;
    };
  }, [enabled, userAddress, targetChainId, ethPrice]);

  // Dynamically refresh solver fee estimates & minimum deposits directly from ZeroDev
  useEffect(() => {
    if (!enabled) return;
    const activeChainId = targetChainId || arbitrum.id;
    const addr =
      smartRoutingAddresses[activeChainId] ||
      smartRoutingAddress ||
      '0xb5De12E2f04B17e7c7485377feD405B3a753adc6';

    let isMounted = true;
    const updateDynamicFees = async () => {
      try {
        const feeRes = await getSmartRoutingAddressFeeEstimates({
          smartRoutingAddress: addr as `0x${string}`,
          allowPartialRoutes: true,
          config: { baseUrl: SMART_ROUTING_ADDRESS_SERVER_URL },
        });

        if (feeRes?.estimatedFees && isMounted) {
          const updatedFees = { ...cachedSolverFees };
          for (const feeGroup of feeRes.estimatedFees) {
            const chainId = feeGroup.chainId;
            const ethFeeData = feeGroup.data?.find(
              (d) =>
                d.name?.toLowerCase().includes('eth') ||
                d.token?.toLowerCase() ===
                  '0x0000000000000000000000000000000000000000'
            );
            const usdcFeeData = feeGroup.data?.find((d) =>
              d.name?.toLowerCase().includes('usdc')
            );
            const feeEth = ethFeeData
              ? Number(formatEther(BigInt(ethFeeData.fee || '0x0')))
              : cachedSolverFees[chainId]?.feeEth || 0.00004;
            const minDepositEth = ethFeeData?.minDeposit
              ? Number(formatEther(BigInt(ethFeeData.minDeposit)))
              : cachedSolverFees[chainId]?.minDepositEth || 0.0045;
            const minDepositUsdc = usdcFeeData?.minDeposit
              ? Number(
                  formatUnits(
                    BigInt(usdcFeeData.minDeposit),
                    usdcFeeData.decimal || 6
                  )
                )
              : cachedSolverFees[chainId]?.minDepositUsdc || 10.44;

            updatedFees[chainId] = {
              feeEth,
              feeUsd: feeEth * ethPrice,
              minDepositEth,
              minDepositUsdc,
              isSponsored: ethFeeData?.isSponsored || false,
            };
          }
          cachedSolverFees = updatedFees;
          setSolverFees(updatedFees);
        }
      } catch (err) {
        console.warn(
          'ZeroDev getSmartRoutingAddressFeeEstimates update note:',
          err
        );
      }
    };

    updateDynamicFees();
    const interval = setInterval(updateDynamicFees, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [
    enabled,
    targetChainId,
    smartRoutingAddress,
    smartRoutingAddresses,
    ethPrice,
  ]);

  return useMemo(() => {
    // 1. Parse required value
    let requiredWei = BigInt(0);
    if (requiredValue !== undefined && requiredValue !== null) {
      try {
        if (typeof requiredValue === 'bigint') {
          requiredWei = requiredValue;
        } else if (typeof requiredValue === 'string') {
          requiredWei = BigInt(requiredValue);
        } else if (
          typeof requiredValue === 'number' &&
          Number.isFinite(requiredValue)
        ) {
          requiredWei = BigInt(Math.floor(requiredValue));
        }
      } catch {
        requiredWei = BigInt(0);
      }
    }

    const requiredEth = Number(formatEther(requiredWei));
    const requiredUsd = requiredEth * ethPrice;

    // 2. Identify target chain
    const activeChainId = targetChainId || arbitrum.id;
    const targetChainMeta = CHAIN_PRIORITIES.find(
      (c) => c.id === activeChainId
    ) || {
      id: activeChainId,
      name:
        activeChainId === base.id
          ? 'Base'
          : activeChainId === mainnet.id
          ? 'Ethereum'
          : 'Arbitrum',
      priority: 2,
      feeTier: 'low' as const,
      estFee: '~ $0.02',
      tag: 'Current Chain',
    };

    // 3. Current chain balance
    let currentChainBalanceWei = BigInt(0);
    if (activeChainId === base.id) {
      currentChainBalanceWei = balances.base;
    } else if (activeChainId === mainnet.id) {
      currentChainBalanceWei = balances.mainnet;
    } else {
      currentChainBalanceWei = balances.arbitrum;
    }

    const currentChainBalanceEth = Number(formatEther(currentChainBalanceWei));

    // If no value required or current chain covers it:
    if (requiredWei <= BigInt(0) || currentChainBalanceWei >= requiredWei) {
      const totalEth = Number(
        formatEther(balances.arbitrum + balances.base + balances.mainnet)
      );
      return {
        requiredWei,
        requiredEth,
        requiredUsd,
        targetChainId: activeChainId,
        targetChainName: targetChainMeta.name,
        currentChainBalanceWei,
        currentChainBalanceEth,
        hasDeficit: false,
        deficitWei: BigInt(0),
        deficitEth: 0,
        deficitUsd: 0,
        isSufficientOnCurrentChain: true,
        isSufficientAcrossAllChains: true,
        isBelowBridgeMinimum: false,
        bridgeMinimumNotice: null,
        chainBridgeMinimums: [],
        shortfallEth: 0,
        shortfallUsd: 0,
        totalPortfolioEth: totalEth,
        totalPortfolioUsd: totalEth * ethPrice,
        ethPriceUsd: ethPrice,
        recommendedRoute: [],
        totalRouteFeeEst: '$0.00',
        totalSolverFeeEth: 0,
        totalSolverFeeUsd: 0,
        isSponsored: false,
        solverFees,
        smartRoutingAddress,
        smartRoutingAddresses,
        isCreatingAddress,
      };
    }

    // 4. We have a deficit on the current chain
    const deficitWei = requiredWei - currentChainBalanceWei;
    const deficitEth = Number(formatEther(deficitWei));
    const deficitUsd = deficitEth * ethPrice;

    // 5. Build candidate routes prioritizing chains where user ACTUALLY has sufficient balance
    const candidateChains = CHAIN_PRIORITIES.filter(
      (c) => c.id !== activeChainId
    )
      .map((candidate) => {
        const chainInfo = chainList.find((c) => c.chainId === candidate.id);
        const feeInfo = solverFees[candidate.id] || solverFees[base.id];
        const feeEth = feeInfo?.feeEth || 0.00003558;
        const nativeEthAvailable = chainInfo
          ? Number(formatEther(chainInfo.raw))
          : 0;
        const feeToAdd = feeInfo?.isSponsored ? 0 : feeEth;
        const deliverableEth = Math.max(0, nativeEthAvailable - feeToAdd);
        const isSufficient =
          deliverableEth >= deficitEth && deliverableEth > 0.000001;

        return {
          ...candidate,
          nativeEthAvailable,
          deliverableEth,
          isSufficient,
        };
      })
      .sort((a, b) => {
        // Priority 1: Chains that have SUFFICIENT funds to cover the ENTIRE deficit come first
        if (a.isSufficient && !b.isSufficient) return -1;
        if (!a.isSufficient && b.isSufficient) return 1;

        // Priority 2: If both are sufficient (or neither), sort by fee tier / gas priority
        if (a.isSufficient && b.isSufficient) {
          return a.priority - b.priority;
        }

        // Priority 3: If neither has enough, pick the one with MORE funds
        if (b.deliverableEth !== a.deliverableEth) {
          return b.deliverableEth - a.deliverableEth;
        }

        return a.priority - b.priority;
      });

    let remainingDeficitEth = deficitEth;
    const recommendedRoute: RouteStep[] = [];
    let totalPortfolioEth = currentChainBalanceEth;

    // Accumulate total portfolio while calculating optimal route
    for (const candidate of candidateChains) {
      const chainInfo = chainList.find((c) => c.chainId === candidate.id);
      if (!chainInfo) continue;

      const feeInfo = solverFees[candidate.id] || solverFees[base.id];
      const feeEth = feeInfo?.feeEth || 0.00003558;
      const feeUsd = feeEth * ethPrice;
      const isSponsored = feeInfo?.isSponsored || false;
      const estFeeStr = isSponsored
        ? 'Free (Sponsored)'
        : `~${
            feeEth < 0.0001 ? feeEth.toFixed(6) : feeEth.toFixed(4)
          } ETH ($${feeUsd.toFixed(2)})`;

      const nativeEthAvailable = Number(formatEther(chainInfo.raw));
      totalPortfolioEth += nativeEthAvailable;

      const feeToAdd = isSponsored ? 0 : feeEth;
      const deliverableEth = Math.max(0, nativeEthAvailable - feeToAdd);

      // Check Native ETH on this candidate chain
      const minDepositEth = feeInfo?.minDepositEth || 0.0045;
      if (
        anychainEnabled &&
        deliverableEth > 0.000001 &&
        remainingDeficitEth > 0.000001 &&
        nativeEthAvailable >= minDepositEth
      ) {
        const neededPullEth =
          Math.min(deliverableEth, remainingDeficitEth) + feeToAdd;
        const targetPullEth = Math.max(minDepositEth, neededPullEth);
        const isMinimumEnforced = targetPullEth > neededPullEth + 0.00001;
        const surplusEth = isMinimumEnforced
          ? targetPullEth - neededPullEth
          : 0;
        const surplusUsd = surplusEth * ethPrice;

        if (nativeEthAvailable >= targetPullEth) {
          const deliverEth = targetPullEth - feeToAdd;
          remainingDeficitEth = Math.max(0, remainingDeficitEth - deliverEth);
          recommendedRoute.push({
            chainId: candidate.id,
            chainName: candidate.name,
            tokenSymbol: 'ETH',
            amountFormatted: targetPullEth.toFixed(4),
            amountEthEquivalent: deliverEth,
            amountUsd: (targetPullEth * ethPrice).toFixed(2),
            feeTier: candidate.feeTier,
            estFee: estFeeStr,
            tag: isMinimumEnforced
              ? `${candidate.tag} • Bridge Min`
              : candidate.tag,
            solverFeeEth: isSponsored ? 0 : feeEth,
            solverFeeUsd: isSponsored ? 0 : feeUsd,
            isSponsored,
            isMinimumEnforced,
            surplusEth,
            surplusUsd,
          });
        }
      }

      // Check USDC on this candidate chain
      const minDepositUsdc =
        feeInfo?.minDepositUsdc ||
        (candidate.id === mainnet.id ? 33.86 : 10.44);
      const usdcToken = chainInfo.tokens.find(
        (t: CustomToken) => t.symbol.toUpperCase() === 'USDC'
      );
      if (usdcToken && usdcToken.raw && usdcToken.raw > BigInt(0)) {
        const usdcAvailable = Number(
          formatUnits(usdcToken.raw, usdcToken.decimals)
        );
        const usdcInEth = usdcAvailable / ethPrice;
        totalPortfolioEth += usdcInEth;

        const deliverableUsdcInEth = Math.max(0, usdcInEth - feeToAdd);

        if (
          anychainEnabled &&
          deliverableUsdcInEth > 0.000001 &&
          remainingDeficitEth > 0.000001 &&
          usdcAvailable >= minDepositUsdc
        ) {
          const targetDeliverEth = Math.min(
            deliverableUsdcInEth,
            remainingDeficitEth
          );
          const rawPullUsdc = (targetDeliverEth + feeToAdd) * ethPrice;
          const grossPullUsdc = Math.max(minDepositUsdc, rawPullUsdc);
          const isMinimumEnforced = grossPullUsdc > rawPullUsdc + 0.05;
          const surplusUsd = isMinimumEnforced
            ? grossPullUsdc - rawPullUsdc
            : 0;
          const surplusEth = surplusUsd / ethPrice;

          if (usdcAvailable >= grossPullUsdc) {
            const deliverEth = grossPullUsdc / ethPrice - feeToAdd;
            remainingDeficitEth = Math.max(0, remainingDeficitEth - deliverEth);

            recommendedRoute.push({
              chainId: candidate.id,
              chainName: candidate.name,
              tokenSymbol: 'USDC',
              amountFormatted: grossPullUsdc.toFixed(2),
              amountEthEquivalent: deliverEth,
              amountUsd: grossPullUsdc.toFixed(2),
              feeTier: candidate.feeTier,
              estFee: estFeeStr,
              tag: isMinimumEnforced
                ? `${candidate.tag} • Bridge Min`
                : `${candidate.tag} • USDC Solver Route`,
              solverFeeEth: isSponsored ? 0 : feeEth,
              solverFeeUsd: isSponsored ? 0 : feeUsd,
              isSponsored,
              isMinimumEnforced,
              surplusEth,
              surplusUsd,
            });
          }
        }
      }
    }

    // Check USDC on target chain as well if any remains
    const targetChainInfo = chainList.find((c) => c.chainId === activeChainId);
    if (targetChainInfo) {
      const targetUsdc = targetChainInfo.tokens.find(
        (t: CustomToken) => t.symbol.toUpperCase() === 'USDC'
      );
      if (targetUsdc && targetUsdc.raw && targetUsdc.raw > BigInt(0)) {
        const usdcAvailable = Number(
          formatUnits(targetUsdc.raw, targetUsdc.decimals)
        );
        const usdcInEth = usdcAvailable / ethPrice;
        totalPortfolioEth += usdcInEth;

        if (
          anychainEnabled &&
          usdcInEth > 0.000001 &&
          remainingDeficitEth > 0.000001
        ) {
          const takeEthFromUsdc = Math.min(usdcInEth, remainingDeficitEth);
          const takeUsdc = takeEthFromUsdc * ethPrice;
          remainingDeficitEth -= takeEthFromUsdc;

          recommendedRoute.unshift({
            chainId: activeChainId,
            chainName: targetChainMeta.name,
            tokenSymbol: 'USDC',
            amountFormatted: takeUsdc.toFixed(2),
            amountEthEquivalent: takeEthFromUsdc,
            amountUsd: takeUsdc.toFixed(2),
            feeTier: 'lowest',
            estFee: '< $0.01',
            tag: 'Local USDC Swap',
            solverFeeEth: 0,
            solverFeeUsd: 0,
            isSponsored: true,
          });
        }
      }
    }

    // 5. Build dynamic chain bridge minimums for all candidate source chains
    const chainBridgeMinimums: ChainBridgeMinimum[] = CHAIN_PRIORITIES.filter(
      (c) => c.id !== activeChainId
    ).map((candidate) => {
      const chainInfo = chainList.find((c) => c.chainId === candidate.id);
      const feeInfo = solverFees[candidate.id] || solverFees[base.id];
      const minEth = feeInfo?.minDepositEth || 0.0045;
      const minUsdc =
        feeInfo?.minDepositUsdc ||
        (candidate.id === mainnet.id ? 33.86 : 10.44);
      const userEthAvailable = chainInfo
        ? Number(formatEther(chainInfo.raw))
        : 0;
      const usdcToken = chainInfo?.tokens.find(
        (t: CustomToken) => t.symbol.toUpperCase() === 'USDC'
      );
      const userUsdcAvailable = usdcToken?.raw
        ? Number(formatUnits(usdcToken.raw, usdcToken.decimals))
        : 0;

      return {
        chainId: candidate.id,
        chainName: candidate.name,
        minEth,
        minEthUsd: minEth * ethPrice,
        minUsdc,
        userEthAvailable,
        userUsdcAvailable,
        isEthMet: userEthAvailable >= minEth,
        isUsdcMet: userUsdcAvailable >= minUsdc,
      };
    });

    const hasOtherChainBalances =
      totalPortfolioEth > currentChainBalanceEth + 0.000001;
    const hasUnmetBridgeMinimum =
      deficitEth > 0 &&
      hasOtherChainBalances &&
      totalPortfolioEth >= requiredEth &&
      (recommendedRoute.length === 0 || remainingDeficitEth > 0.0001);

    let bridgeMinimumNotice: string | null = null;
    if (hasUnmetBridgeMinimum) {
      const parts: string[] = [];
      for (const cm of chainBridgeMinimums) {
        if (cm.userEthAvailable > 0 || cm.userUsdcAvailable > 0) {
          const userHas = [
            cm.userUsdcAvailable > 0
              ? `$${cm.userUsdcAvailable.toFixed(2)} USDC`
              : null,
            cm.userEthAvailable > 0
              ? `${cm.userEthAvailable.toFixed(4)} ETH`
              : null,
          ]
            .filter(Boolean)
            .join(' + ');

          parts.push(
            `${cm.chainName}: min $${cm.minUsdc.toFixed(
              2
            )} USDC / ${cm.minEth.toFixed(4)} ETH (you have ${userHas})`
          );
        }
      }

      if (parts.length > 0) {
        bridgeMinimumNotice = `Funds on your other chains are below the cross-chain bridge solver minimums (${parts.join(
          '; '
        )}). Bridge solvers require this minimum to cover cross-chain settlement.`;
      } else {
        const minBaseUsdc = solverFees[base.id]?.minDepositUsdc || 10.44;
        const minBaseEth = solverFees[base.id]?.minDepositEth || 0.0045;
        bridgeMinimumNotice = `Funds on other chains are below the cross-chain bridge minimum (e.g. Base: min $${minBaseUsdc.toFixed(
          2
        )} USDC / ${minBaseEth.toFixed(
          4
        )} ETH). Bridge solvers require this minimum to cover cross-chain settlement.`;
      }
    }

    const isSufficientAcrossAllChains =
      anychainEnabled &&
      remainingDeficitEth <= 0.0001 &&
      recommendedRoute.length > 0;
    const shortfallEth = isSufficientAcrossAllChains
      ? 0
      : Math.max(0, requiredEth - totalPortfolioEth);
    const shortfallUsd = shortfallEth * ethPrice;

    // Total solver fee summed across actual route steps
    const totalSolverFeeEth = recommendedRoute.reduce(
      (sum, r) => sum + (r.solverFeeEth || 0),
      0
    );
    const totalSolverFeeUsd = totalSolverFeeEth * ethPrice;
    const allSponsored =
      recommendedRoute.length > 0 &&
      recommendedRoute.every((r) => r.isSponsored);

    let totalRouteFeeEst = '$0.00';
    if (allSponsored) {
      totalRouteFeeEst = 'Free (Sponsored by ZeroDev)';
    } else if (totalSolverFeeEth > 0) {
      totalRouteFeeEst = `~$${totalSolverFeeUsd.toFixed(
        2
      )} (${totalSolverFeeEth.toFixed(6)} ETH)`;
    } else if (recommendedRoute.length > 0) {
      totalRouteFeeEst = '< $0.01';
    }

    return {
      requiredWei,
      requiredEth,
      requiredUsd,
      targetChainId: activeChainId,
      targetChainName: targetChainMeta.name,
      currentChainBalanceWei,
      currentChainBalanceEth,
      hasDeficit: true,
      deficitWei,
      deficitEth,
      deficitUsd,
      isSufficientOnCurrentChain: false,
      isSufficientAcrossAllChains,
      isBelowBridgeMinimum: hasUnmetBridgeMinimum,
      bridgeMinimumNotice,
      chainBridgeMinimums,
      shortfallEth,
      shortfallUsd,
      totalPortfolioEth,
      totalPortfolioUsd: totalPortfolioEth * ethPrice,
      ethPriceUsd: ethPrice,
      recommendedRoute,
      totalRouteFeeEst,
      totalSolverFeeEth,
      totalSolverFeeUsd,
      isSponsored: allSponsored,
      solverFees,
      smartRoutingAddress,
      smartRoutingAddresses,
      isCreatingAddress,
    };
  }, [
    requiredValue,
    targetChainId,
    chainList,
    balances,
    ethPrice,
    solverFees,
    smartRoutingAddress,
    smartRoutingAddresses,
    isCreatingAddress,
    anychainEnabled,
  ]);
}
