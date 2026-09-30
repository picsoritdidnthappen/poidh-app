'use client';

import React, { useState, useRef } from 'react';
import { useAccount } from 'wagmi';
import { toast } from 'react-toastify';
import { arbitrum } from 'viem/chains';
import {
  encodeFunctionData,
  erc20Abi,
  formatEther,
  formatUnits,
  parseEther,
  parseUnits,
} from 'viem';
import {
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetContent,
  SheetFooter,
  SheetClose,
} from '@/components/ui/Sheet';
import {
  ArbitrumIcon,
  CopyDoneIcon,
  CopyIcon,
} from '@/components/global/Icons';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRightLeft,
  Loader2,
  X,
} from 'lucide-react';
import { useAnychainBalances } from '@/hooks/useAnychainBalances';
import {
  useSmartRouting,
  fetchSmartRoutingStatus,
} from '@/hooks/useSmartRouting';
import { getOrInitKernelClient } from '../kernelClient';
import { ApprovalDetail, SUPPORTED_CHAINS } from '../types';
import {
  USDC_ADDRESSES,
  nativeBalanceFor,
  publicClientFor,
} from '@/components/auth/chains';

interface AuthApprovalViewProps {
  pendingApproval: ApprovalDetail;
  onClose: () => void;
  onBackToAccount: () => void;
  onResolve: () => void;
  onReject: () => void;
  anychain: ReturnType<typeof useAnychainBalances>;
  isConnected: boolean;
  address?: string;
}

const isMainContract = (addr?: string) => {
  if (!addr) return false;
  const known = [
    '0xE731dFadBFf20542E10D09D26Fc71445C70d4232',
    '0x5555fa783936c260f77385b4e153b9725fef1719',
    '0x18e5585ca7ce31b90bc8bb7aaf84152857ce243f',
  ].map((a) => a.toLowerCase());
  return known.includes(addr.toLowerCase());
};

const formatTxValue = (val: string | number | bigint | undefined) => {
  if (!val) return '0';
  try {
    const b = typeof val === 'bigint' ? val : BigInt(val);
    const eth = formatEther(b);
    return eth.length > 8 ? parseFloat(eth).toFixed(6) : eth;
  } catch {
    return '0';
  }
};

export default function AuthApprovalView({
  pendingApproval,
  onClose,
  onBackToAccount,
  onResolve,
  onReject,
  anychain,
  isConnected,
  address,
}: AuthApprovalViewProps) {
  const { chain, connector } = useAccount();

  const [isRouting, setIsRouting] = useState(false);
  // Sync guard: state updates land async, so rapid clicks could each fire a
  // real on-chain pull before the button disables. Refs flip immediately.
  const routingRef = useRef(false);
  const [routingStage, setRoutingStage] = useState<
    'idle' | 'initiating' | 'routing' | 'settled'
  >('idle');
  const [routingStatusText, setRoutingStatusText] = useState<string>('');
  const [approvalError, setApprovalError] = useState<string | null>(null);

  const txChainId = pendingApproval.tx?.chainId
    ? Number(pendingApproval.tx.chainId)
    : chain?.id;

  const targetChain = SUPPORTED_CHAINS.find((c) => c.id === txChainId) || {
    id: arbitrum.id,
    name: chain?.name || 'Arbitrum',
    Icon: ArbitrumIcon,
  };

  const smartRouting = useSmartRouting({
    targetChainId: txChainId,
    requiredValue: pendingApproval.tx?.value,
    chainList: anychain.chainList,
    balances: anychain.balances,
    enabled: true,
    userAddress: address,
    anychainEnabled: anychain.anychainEnabled,
  });

  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setIsCopied(true);
      toast.success('Address copied');
      setTimeout(() => setIsCopied(false), 1500);
    }
  };

  const handleApprove = async () => {
    // Sync re-entry guard: flips immediately, unlike state.
    if (routingRef.current) return;
    routingRef.current = true;
    if (smartRouting.hasDeficit) {
      if (!anychain.anychainEnabled) {
        toast.error(`Insufficient balance on ${smartRouting.targetChainName}`);
        return;
      }

      if (!smartRouting.isSufficientAcrossAllChains) {
        if (smartRouting.isBelowBridgeMinimum) {
          toast.error(
            smartRouting.bridgeMinimumNotice ||
              'Cross-chain funds are below the minimum. Please deposit directly on the target chain.'
          );
        } else {
          toast.error(
            `Deficit across all chains: ${smartRouting.shortfallEth.toFixed(
              4
            )} ETH / $${smartRouting.shortfallUsd.toFixed(2)}`
          );
        }
        return;
      }
    }

    // Case 1: No deficit on target chain -> execute immediately
    if (!smartRouting.hasDeficit) {
      try {
        pendingApproval.resolve();
        onResolve();
        setApprovalError(null);
        // keepOpen callers (e.g. Manage Tokens) show their own pending →
        // sent states, so the sheet must stay open for them.
        routingRef.current = false;
        if (pendingApproval.keepOpen) return;
        toast.info('Please confirm with your passkey');
        onClose();
      } catch (err: unknown) {
        const e = err as Error;
        setApprovalError(e?.message || 'Approval failed');
      }
      routingRef.current = false;
      return;
    }

    // Case 2: Cross-chain deficit exists -> Execute transfer on source chain and route via ZeroDev
    setIsRouting(true);
    setRoutingStage('initiating');

    const routesToExecute = smartRouting.recommendedRoute;
    if (routesToExecute.length === 0) {
      routingRef.current = false;
      setIsRouting(false);
      setApprovalError('No viable cross-chain funding route available.');
      return;
    }

    const destChainId = txChainId || arbitrum.id;
    const routingAddr =
      smartRouting.smartRoutingAddresses[destChainId] ||
      smartRouting.smartRoutingAddress;

    if (!routingAddr) {
      routingRef.current = false;
      setIsRouting(false);
      setApprovalError(
        `Smart Routing Address not yet available for ${smartRouting.targetChainName}. Please wait a moment and try again.`
      );
      return;
    }

    // Pre-flight check: Verify all source chains have sufficient balance (ETH or USDC)
    for (const r of routesToExecute) {
      const isUsdc = r.tokenSymbol.toUpperCase() === 'USDC';
      if (isUsdc) {
        const pullUnits = parseUnits(r.amountFormatted, 6);
        const chainInfo = anychain.chainList.find(
          (c) => c.chainId === r.chainId
        );
        const usdcToken = chainInfo?.tokens.find(
          (t) => t.symbol.toUpperCase() === 'USDC'
        );
        const availableRaw = usdcToken?.raw || BigInt(0);
        if (availableRaw < pullUnits) {
          routingRef.current = false;
          setIsRouting(false);
          const available = parseFloat(formatUnits(availableRaw, 6)).toFixed(2);
          const errMsg = `Insufficient USDC balance on ${r.chainName}: Account has ${available} USDC, but route requires ${r.amountFormatted} USDC.`;
          setApprovalError(errMsg);
          toast.error(errMsg);
          return;
        }
      } else {
        const pullWei = parseEther(r.amountFormatted);
        const sourceBal = nativeBalanceFor(anychain.balances, r.chainId);

        if (sourceBal < pullWei) {
          routingRef.current = false;
          setIsRouting(false);
          const available = parseFloat(formatEther(sourceBal)).toFixed(6);
          const errMsg = `Insufficient balance on ${r.chainName}: Account has ${available} ETH, but route requires ${r.amountFormatted} ETH.`;
          setApprovalError(errMsg);
          toast.error(errMsg);
          return;
        }
      }

      // Pre-flight check: Verify route satisfies dynamic ZeroDev solver bridge minimums
      if (r.chainId !== destChainId) {
        const feeInfo = smartRouting.solverFees[r.chainId];
        const isUsdc = r.tokenSymbol.toUpperCase() === 'USDC';
        if (isUsdc && feeInfo?.minDepositUsdc) {
          const pullAmount = parseFloat(r.amountFormatted);
          if (pullAmount < feeInfo.minDepositUsdc) {
            routingRef.current = false;
            setIsRouting(false);
            const errMsg = `Transfer amount on ${
              r.chainName
            } (${pullAmount} USDC) is below the route minimum of ${feeInfo.minDepositUsdc.toFixed(
              2
            )} USDC.`;
            setApprovalError(errMsg);
            toast.error(errMsg);
            return;
          }
        } else if (!isUsdc && feeInfo?.minDepositEth) {
          const pullAmount = parseFloat(r.amountFormatted);
          if (pullAmount < feeInfo.minDepositEth) {
            routingRef.current = false;
            setIsRouting(false);
            const errMsg = `Transfer amount on ${
              r.chainName
            } (${pullAmount} ETH) is below the route minimum of ${feeInfo.minDepositEth.toFixed(
              4
            )} ETH.`;
            setApprovalError(errMsg);
            toast.error(errMsg);
            return;
          }
        }
      }
    }

    const routeChainsDesc = routesToExecute
      .map((r) => `${r.amountFormatted} ${r.tokenSymbol} from ${r.chainName}`)
      .join(' + ');
    setRoutingStatusText(`Initiating transfers: ${routeChainsDesc}...`);
    toast.info(`Routing funds: ${routeChainsDesc}`);

    let sourceTxHashes: string[] = [];

    try {
      const store = await (connector as any)?.getStore?.();

      // Pre-initialize kernel clients for all source chains so both exist in the store
      for (const r of routesToExecute) {
        setRoutingStatusText(`Preparing ${r.chainName} smart account...`);
        await getOrInitKernelClient(store, r.chainId);
      }

      setRoutingStatusText(`Broadcasting transfers: ${routeChainsDesc}...`);

      // Dispatch all route steps in parallel to the universal router
      sourceTxHashes = await Promise.all(
        routesToExecute.map(async (r) => {
          const isUsdc = r.tokenSymbol.toUpperCase() === 'USDC';
          const sourceKernelClient =
            (await getOrInitKernelClient(store, r.chainId)) ||
            store?.getState?.()?.kernelClients?.get(r.chainId);

          let toAddress: `0x${string}`;
          let valueBigInt: bigint;
          let callDataHex: `0x${string}`;

          if (isUsdc) {
            const pullUnits = parseUnits(r.amountFormatted, 6);
            const usdcContract = USDC_ADDRESSES[r.chainId];
            if (!usdcContract) {
              throw new Error(`Unsupported USDC chain: ${r.chainName}`);
            }
            toAddress = usdcContract;
            valueBigInt = BigInt(0);
            callDataHex = encodeFunctionData({
              abi: erc20Abi,
              functionName: 'transfer',
              args: [routingAddr as `0x${string}`, pullUnits],
            });
          } else {
            toAddress = routingAddr as `0x${string}`;
            valueBigInt = parseEther(r.amountFormatted);
            callDataHex = '0x';
          }

          if (!sourceKernelClient) {
            throw new Error(
              `Smart account unavailable for ${r.chainName}. Please check wallet.`
            );
          }
          console.log(
            `[SmartRouting] Sending ${r.amountFormatted} ${r.tokenSymbol} on ${r.chainName} (${r.chainId}) via Kernel client...`
          );
          return (await (sourceKernelClient as any).sendTransaction({
            to: toAddress,
            value: valueBigInt,
            data: callDataHex,
            calls: [
              {
                to: toAddress,
                value: valueBigInt,
                data: callDataHex,
              },
            ],
          })) as string;
        })
      );

      if (sourceTxHashes.length === 0) {
        throw new Error('No routing transactions were broadcast.');
      }

      setRoutingStage('routing');
      const hashSnippets = sourceTxHashes.map((h) => h.slice(0, 8)).join(', ');
      setRoutingStatusText(
        `Funds sent (${hashSnippets})! Route moving funds to ${smartRouting.targetChainName}...`
      );
      toast.success(
        `Deposits sent! Bridging to ${smartRouting.targetChainName}...`
      );

      // 3. Track settlement on target chain
      const targetChainPublicClient = publicClientFor(destChainId);

      const requiredWei = smartRouting.requiredWei;
      const userAddr = address as `0x${string}`;

      let settled = false;
      const maxAttempts = 45; // 45 iterations * 2s = 90s timeout
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        // A. Check if destination balance has settled
        try {
          const currentBal = await targetChainPublicClient.getBalance({
            address: userAddr,
          });
          if (currentBal >= requiredWei) {
            settled = true;
            break;
          }
        } catch {
          // Transient RPC error
        }

        // B. Check live status from ZeroDev Smart Routing API
        try {
          const deposits = await fetchSmartRoutingStatus(routingAddr);
          if (deposits && deposits.length > 0) {
            const match = deposits.find((d) =>
              sourceTxHashes.some(
                (h) =>
                  h.toLowerCase() === d.deposit?.transactionHash?.toLowerCase()
              )
            );

            if (match) {
              if (match.execution) {
                setRoutingStage('settled');
                setRoutingStatusText(
                  `Funds executed on ${
                    smartRouting.targetChainName
                  } (${match.execution.transactionHash.slice(0, 8)}...)`
                );
                settled = true;
                break;
              } else if (match.bridge) {
                setRoutingStage('routing');
                setRoutingStatusText(
                  `Route moving funds (${match.bridge.transactionHash.slice(
                    0,
                    8
                  )}...)`
                );
              } else if (match.deposit) {
                setRoutingStage('routing');
                setRoutingStatusText(
                  `Deposit detected. Route moving funds to ${smartRouting.targetChainName}...`
                );
              }
            } else {
              setRoutingStatusText(
                `Waiting for funds to arrive on ${
                  smartRouting.targetChainName
                }... (${(attempt + 1) * 2}s)`
              );
            }
          }
        } catch {
          setRoutingStatusText(
            `Routing in progress... (${(attempt + 1) * 2}s)`
          );
        }

        await new Promise((r) => setTimeout(r, 2000));
      }

      if (settled) {
        setRoutingStage('settled');
        setRoutingStatusText(
          'Funds settled on destination chain! Submitting transaction...'
        );
        toast.success(
          'Funds routed successfully! Executing bounty transaction...'
        );
        await new Promise((r) => setTimeout(r, 400));
        pendingApproval.resolve();
        onResolve();
        setApprovalError(null);
        routingRef.current = false;
        setIsRouting(false);
        setRoutingStage('idle');
        onClose();
      } else {
        routingRef.current = false;
        setIsRouting(false);
        setRoutingStage('idle');
        setApprovalError(
          `Fulfillment still in progress. Funds were sent to router and will arrive shortly.`
        );
      }
    } catch (err: unknown) {
      const e = err as Error;
      routingRef.current = false;
      setIsRouting(false);
      setRoutingStage('idle');
      let msg = e?.message || 'Smart Routing failed';
      if (msg.includes('AA21') || msg.includes("didn't pay prefund")) {
        msg =
          'One or more source chains have insufficient ETH to cover the transfer amount. Please deposit funds first.';
      }
      setApprovalError(msg);
      toast.error(`Routing error: ${msg}`);
    }
  };

  return (
    <>
      <SheetHeader className='pb-5'>
        <div className='flex items-start justify-between w-full'>
          <div>
            {isConnected && (
              <button
                type='button'
                onClick={onBackToAccount}
                className='text-[11px] text-white/50 hover:text-white flex items-center gap-1 mb-1.5 transition-colors'
              >
                <ArrowLeft size={12} />
                <span>Account</span>
              </button>
            )}
            <SheetTitle className='text-lg font-bold text-white tracking-tight normal-case'>
              {pendingApproval.type === 'transaction'
                ? 'Approve Transaction'
                : 'Approve Signature'}
            </SheetTitle>
            <SheetDescription className='text-xs text-white/50 mt-1 font-normal normal-case'>
              {pendingApproval.type === 'transaction'
                ? 'Review transaction details before signing'
                : 'Review message before signing'}
            </SheetDescription>
          </div>
          <SheetClose onClick={onClose} />
        </div>
      </SheetHeader>

      <SheetContent className='space-y-4 pt-5'>
        {pendingApproval.type === 'transaction' ? (
          <>
            {/* Hero Value if > 0 */}
            {pendingApproval.tx?.value &&
            pendingApproval.tx.value.toString() !== '0' &&
            pendingApproval.tx.value.toString() !== '0x0' ? (
              <div className='p-4 rounded-2xl bg-white/[0.04] border border-white/10 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'>
                <div className='text-[10px] text-white/40 uppercase tracking-wider font-semibold mb-1'>
                  Amount
                </div>
                <div className='text-2xl font-bold text-white font-mono'>
                  {formatTxValue(pendingApproval.tx.value)}{' '}
                  <span className='text-sm font-normal text-white/60'>ETH</span>
                </div>
                {smartRouting.hasDeficit &&
                  smartRouting.shortfallEth > 0.0001 && (
                    <div className='mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 font-sans'>
                      <span>Deficit:</span>
                      <span className='font-mono font-semibold'>
                        {smartRouting.shortfallEth.toFixed(4)} ETH
                      </span>
                    </div>
                  )}
              </div>
            ) : null}

            {/* Details Breakdown */}
            <div className='p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'>
              {/* Recipient / Contract */}
              <div className='flex items-center justify-between'>
                <span className='text-xs text-white/50'>Contract</span>
                <div className='text-right'>
                  <div className='text-xs text-white font-mono font-medium'>
                    {pendingApproval.tx?.to
                      ? `${pendingApproval.tx.to.slice(
                          0,
                          6
                        )}...${pendingApproval.tx.to.slice(-4)}`
                      : 'New Contract'}
                  </div>
                  {isMainContract(pendingApproval.tx?.to) && (
                    <div className='text-[10px] text-[#f15e5f] font-semibold'>
                      POIDH Bounty Contract
                    </div>
                  )}
                </div>
              </div>

              {/* Network */}
              <div className='flex items-center justify-between'>
                <span className='text-xs text-white/50'>Network</span>
                <div className='flex items-center gap-1.5 text-xs text-white font-medium'>
                  <targetChain.Icon size={15} />
                  <span>{targetChain.name}</span>
                </div>
              </div>
            </div>

            {/* Smart Routing & Deficit Advisor (3 States: Red, Yellow, Green) */}
            {smartRouting.hasDeficit &&
              (anychain.isLoading && smartRouting.totalPortfolioEth === 0 ? (
                /* Loading State: Checking multi-chain balances */
                <div className='p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center gap-2.5 py-6 text-xs text-white/70 font-sans shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]'>
                  <Loader2 size={15} className='animate-spin text-white/50' />
                  <span>
                    Checking balances across Arbitrum, Base, and Ethereum...
                  </span>
                </div>
              ) : !anychain.anychainEnabled &&
                smartRouting.totalPortfolioEth >= smartRouting.requiredEth ? (
                /* STATE 2: YELLOW - Have enough total across chains, but Anychain Smart Routing is disabled */
                <div className='rounded-2xl border border-amber-400/20 bg-amber-500/[0.07] p-4 space-y-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'>
                  <div className='flex items-start gap-3'>
                    <span className='mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-400/25 bg-amber-400/15'>
                      <AlertTriangle size={16} className='text-amber-300' />
                    </span>
                    <div className='min-w-0 font-sans'>
                      <div className='text-[13px] font-semibold tracking-tight text-white'>
                        Anychain routing is off
                      </div>
                      <p className='text-[11px] leading-relaxed text-white/50'>
                        You hold{' '}
                        <span className='font-mono tabular-nums text-white/80'>
                          {smartRouting.totalPortfolioEth.toFixed(4)} ETH / $
                          {smartRouting.totalPortfolioUsd.toFixed(2)}
                        </span>{' '}
                        across chains.
                      </p>
                    </div>
                  </div>

                  <button
                    type='button'
                    onClick={() => anychain.toggleAnychain(true)}
                    className='flex w-full items-center justify-center gap-1.5 rounded-full bg-amber-500 py-2.5 text-xs font-semibold text-black transition hover:bg-amber-400 active:scale-[0.99]'
                  >
                    <ArrowRightLeft size={13} />
                    <span>Enable routing</span>
                  </button>
                </div>
              ) : smartRouting.isBelowBridgeMinimum ? (
                /* STATE 2: YELLOW - Have enough total across chains, but below solver bridge minimum */
                <div className='rounded-2xl border border-amber-400/20 bg-amber-500/[0.07] p-4 space-y-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'>
                  <div className='flex items-start gap-3'>
                    <span className='mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-400/25 bg-amber-400/15'>
                      <AlertTriangle size={16} className='text-amber-300' />
                    </span>
                    <div className='min-w-0 font-sans'>
                      <div className='text-[13px] font-semibold tracking-tight text-white'>
                        Below the minimum
                      </div>
                      <p className='text-[11px] leading-relaxed text-white/50'>
                        {smartRouting.totalPortfolioEth >=
                        smartRouting.requiredEth ? (
                          <>
                            {smartRouting.chainBridgeMinimums.some(
                              (cm) => cm.isEthMet || cm.isUsdcMet
                            ) ? (
                              <>
                                Your{' '}
                                <span className='font-mono tabular-nums text-white/80'>
                                  {smartRouting.totalPortfolioEth.toFixed(4)}{' '}
                                  ETH / $
                                  {smartRouting.totalPortfolioUsd.toFixed(2)}
                                </span>{' '}
                                is spread too thin. The chains that meet the
                                minimum don't hold enough.
                              </>
                            ) : (
                              <>
                                Your{' '}
                                <span className='font-mono tabular-nums text-white/80'>
                                  {smartRouting.totalPortfolioEth.toFixed(4)}{' '}
                                  ETH / $
                                  {smartRouting.totalPortfolioUsd.toFixed(2)}
                                </span>{' '}
                                is spread too thin to meet any router minimum
                                deposit.
                              </>
                            )}
                          </>
                        ) : (
                          <>
                            Your other chains are below the minimum to route to{' '}
                            {smartRouting.targetChainName}.
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Dynamic Bridge Minimums Breakdown Table */}
                  {smartRouting.chainBridgeMinimums.length > 0 && (
                    <div className='rounded-xl bg-black/40 border border-amber-500/20 p-2.5 space-y-2 text-xs font-sans'>
                      <div className='text-[10px] font-semibold text-amber-300/80 uppercase tracking-wider'>
                        Router minimum deposit per chain
                      </div>
                      <div className='space-y-1.5'>
                        {smartRouting.chainBridgeMinimums.map((cm) => (
                          <div
                            key={cm.chainId}
                            className='text-[11px] py-1 px-2 rounded-lg bg-white/[0.02] border border-white/5 font-sans'
                          >
                            <span className='font-semibold text-white'>
                              {cm.chainName}:{' '}
                            </span>
                            <span className='text-white/60 font-mono'>
                              Min ${cm.minUsdc.toFixed(2)} USDC /{' '}
                              {cm.minEth.toFixed(4)} ETH
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : anychain.balancesFailed ? (
                /* Balances unreachable: never show a deficit computed from zeros */
                <div className='rounded-2xl border border-amber-400/20 bg-amber-500/[0.07] p-4 space-y-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'>
                  <div className='flex items-start gap-3'>
                    <span className='mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-400/25 bg-amber-400/15'>
                      <AlertTriangle size={16} className='text-amber-300' />
                    </span>
                    <div className='min-w-0 font-sans'>
                      <div className='text-[13px] font-semibold tracking-tight text-white'>
                        Couldn't load balances
                      </div>
                      <p className='text-[11px] leading-relaxed text-white/50'>
                        Check your connection and try again.
                      </p>
                    </div>
                  </div>
                  <button
                    type='button'
                    onClick={() => anychain.refetch()}
                    className='flex w-full items-center justify-center gap-1.5 rounded-full bg-amber-500 py-2.5 text-xs font-semibold text-black transition hover:bg-amber-400 active:scale-[0.99]'
                  >
                    <span>Retry</span>
                  </button>
                </div>
              ) : !smartRouting.isSufficientAcrossAllChains ? (
                /* STATE 1: RED - Actually don't even have enough funds across all chains */
                <div className='rounded-2xl border border-red-400/20 bg-red-500/[0.07] p-4 space-y-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'>
                  <div className='flex items-start gap-3'>
                    <span className='mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-red-400/25 bg-red-400/15'>
                      <AlertCircle size={16} className='text-red-300' />
                    </span>
                    <div className='min-w-0 font-sans'>
                      <div className='text-[13px] font-semibold tracking-tight text-white'>
                        Insufficient total funds
                      </div>
                      <p className='text-[11px] leading-relaxed text-white/50'>
                        You need{' '}
                        <span className='font-mono tabular-nums text-white/80'>
                          {smartRouting.requiredEth.toFixed(4)} ETH / $
                          {smartRouting.requiredUsd.toFixed(2)}
                        </span>{' '}
                        but hold{' '}
                        <span className='font-mono tabular-nums text-white/80'>
                          {smartRouting.totalPortfolioEth.toFixed(4)} ETH / $
                          {smartRouting.totalPortfolioUsd.toFixed(2)}
                        </span>{' '}
                        across chains.
                      </p>
                    </div>
                  </div>

                  <div className='flex items-center justify-between rounded-xl bg-black/40 border border-red-500/20 px-2.5 py-2 text-xs font-sans'>
                    <span className='text-[11px] text-white/50'>Deficit</span>
                    {smartRouting.shortfallEth > 0.0001 && (
                      <span className='font-mono font-semibold tabular-nums text-red-300'>
                        - {smartRouting.shortfallEth.toFixed(4)} ETH (≈ $
                        {smartRouting.shortfallUsd.toFixed(2)})
                      </span>
                    )}
                  </div>

                  <div className='flex items-center justify-between pt-1 border-t border-white/5 text-xs font-sans'>
                    <span className='text-[11px] text-white/50'>
                      Deposit address:
                    </span>
                    <button
                      type='button'
                      onClick={handleCopy}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-medium transition active:scale-[0.98] ${
                        isCopied
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-white/5 hover:bg-white/10 text-white/80 border-white/20'
                      }`}
                    >
                      {isCopied ? (
                        <CopyDoneIcon size={12} />
                      ) : (
                        <CopyIcon size={12} />
                      )}
                      <span>{isCopied ? 'Copied!' : 'Copy Address'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* STATE 3: GREEN - Have enough and pass bridge minimum (Optimal Route Ready) */
                <div className='rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.07] p-4 space-y-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'>
                  <div className='flex items-start gap-3'>
                    <span className='mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-400/25 bg-emerald-400/15'>
                      <ArrowRightLeft size={16} className='text-emerald-300' />
                    </span>
                    <div className='min-w-0 font-sans'>
                      <div className='text-[13px] font-semibold tracking-tight text-white'>
                        Cross-chain smart route
                      </div>
                      <p className='text-[11px] leading-relaxed text-white/50'>
                        Routing{' '}
                        <span className='font-mono tabular-nums text-white/80'>
                          {smartRouting.deficitEth.toFixed(4)} ETH (≈ $
                          {smartRouting.deficitUsd.toFixed(2)})
                        </span>{' '}
                        to {smartRouting.targetChainName} · lowest fee first.{' '}
                        {[
                          ...new Set(
                            smartRouting.recommendedRoute.map(
                              (s) => s.chainName
                            )
                          ),
                        ].join(' + ') || 'Your other chains'}{' '}
                        will cover it.
                      </p>
                    </div>
                  </div>

                  {/* Route steps */}
                  <div className='space-y-1.5 pt-1'>
                    {smartRouting.recommendedRoute.map((step, idx) => {
                      const ChainIcon =
                        SUPPORTED_CHAINS.find((c) => c.id === step.chainId)
                          ?.Icon || ArbitrumIcon;
                      return (
                        <div
                          key={`${step.chainId}-${step.tokenSymbol}-${idx}`}
                          className='p-2.5 rounded-xl bg-black/30 border border-white/5 text-xs font-sans space-y-2'
                        >
                          <div className='flex items-center justify-between gap-2'>
                            <div className='flex items-center gap-2 min-w-0'>
                              <ChainIcon size={16} />
                              <div className='min-w-0'>
                                <div className='font-medium text-white'>
                                  {step.amountFormatted} {step.tokenSymbol} from{' '}
                                  {step.chainName}
                                </div>
                                <div className='text-[10px] text-white/40'>
                                  {step.tokenSymbol !== 'ETH' &&
                                    `≈ ${step.amountEthEquivalent.toFixed(
                                      4
                                    )} ETH · `}
                                  ${step.amountUsd}
                                </div>
                              </div>
                            </div>
                            <div className='shrink-0 text-right'>
                              <div className='text-[10px] text-white/40'>
                                Route fee
                              </div>
                              {step.isSponsored ? (
                                <div className='text-[11px] font-medium text-emerald-400'>
                                  Free
                                </div>
                              ) : (
                                <div className='font-mono text-[11px] text-white/70'>
                                  ~{(step.solverFeeEth || 0).toFixed(6)} ETH
                                </div>
                              )}
                            </div>
                          </div>

                          {step.isMinimumEnforced && (
                            <div className='p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-white/80 leading-relaxed font-sans'>
                              <div className='font-semibold text-emerald-400 flex items-center gap-1 mb-0.5'>
                                <span>Minimum Applied</span>
                              </div>
                              <span>
                                Routes enforce a minimum transfer of{' '}
                                {step.amountFormatted} {step.tokenSymbol}.{' '}
                                {smartRouting.deficitEth.toFixed(4)} ETH covers
                                this transaction, and the surplus (~
                                {step.surplusEth?.toFixed(4)} ETH / $
                                {step.surplusUsd?.toFixed(2)}) will remain
                                safely in your {smartRouting.targetChainName}{' '}
                                wallet.
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {smartRouting.totalRouteFeeEst &&
                    smartRouting.totalRouteFeeEst !== '$0.00' && (
                      <div className='flex items-center justify-between pt-1 text-[11px] text-white/50 border-t border-white/5 font-sans'>
                        <span>Total route fee</span>
                        <span className='font-mono font-medium text-emerald-400'>
                          {smartRouting.totalRouteFeeEst}
                          {!smartRouting.feesLive &&
                            smartRouting.totalRouteFeeEst !==
                              'Free (Sponsored)' &&
                            ' est.'}
                        </span>
                      </div>
                    )}
                </div>
              ))}

            {isRouting && (
              <div className='p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2 animate-pulse font-sans'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2 text-xs font-semibold text-emerald-400'>
                    <Loader2 size={14} className='animate-spin' />
                    <span>Smart Route In Progress</span>
                  </div>
                  <span className='text-[10px] font-mono uppercase text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30'>
                    {routingStage}
                  </span>
                </div>
                <div className='text-xs text-white/80 leading-relaxed'>
                  {routingStatusText}
                </div>
              </div>
            )}

            {/* Calldata Preview if data exists */}
            {pendingApproval.tx?.data && pendingApproval.tx.data !== '0x' && (
              <div className='p-3.5 rounded-2xl bg-white/[0.02] border border-white/5'>
                <div className='text-[10px] text-white/40 uppercase tracking-wider font-semibold mb-1'>
                  Calldata Payload
                </div>
                <div className='text-[11px] font-mono text-white/60 break-all line-clamp-3 bg-black/20 p-2 rounded-lg'>
                  {pendingApproval.tx.data}
                </div>
              </div>
            )}
          </>
        ) : (
          /* Signature message preview */
          <div className='p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'>
            <div className='text-[10px] text-white/40 uppercase tracking-wider font-semibold'>
              Message Payload
            </div>
            <div className='p-3 rounded-xl bg-black/30 text-xs font-mono text-white/90 max-h-48 overflow-y-auto whitespace-pre-wrap break-words border border-white/5'>
              {pendingApproval.message || 'Signature request'}
            </div>
          </div>
        )}

        {approvalError && (
          <div className='p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-2.5 text-xs text-red-400 normal-case leading-relaxed'>
            <AlertCircle size={16} className='shrink-0 mt-0.5 text-red-400' />
            <div className='flex-1 break-words font-sans'>{approvalError}</div>
            <button
              type='button'
              onClick={() => setApprovalError(null)}
              className='text-red-400/60 hover:text-red-400 p-0.5 rounded transition-colors'
              aria-label='Dismiss error'
            >
              <X size={13} />
            </button>
          </div>
        )}
      </SheetContent>

      <SheetFooter className='gap-2.5 pt-4'>
        <button
          type='button'
          onClick={onReject}
          className='flex-1 flex items-center justify-center gap-1.5 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/40 text-white/80 hover:text-white font-semibold text-xs py-2.5 px-4 transition active:scale-[0.99] normal-case'
        >
          <span>Reject</span>
        </button>
        <button
          type='button'
          onClick={handleApprove}
          disabled={
            isRouting ||
            anychain.isLoading ||
            (smartRouting.hasDeficit &&
              (!anychain.anychainEnabled ||
                !smartRouting.isSufficientAcrossAllChains))
          }
          className='flex-1 flex items-center justify-center rounded-full font-semibold text-xs py-2.5 px-4 transition active:scale-[0.99] shadow-sm normal-case border border-transparent bg-[#f15e5f] hover:bg-[#cf5d5d] text-white disabled:opacity-50 disabled:cursor-not-allowed'
        >
          {isRouting ? (
            <div className='flex items-center justify-center gap-1.5'>
              <Loader2 size={13} className='animate-spin' />
              <span>Routing Funds...</span>
            </div>
          ) : anychain.isLoading ? (
            <div className='flex items-center justify-center gap-1.5'>
              <Loader2 size={13} className='animate-spin' />
              <span>Checking Balances...</span>
            </div>
          ) : (
            <span>Accept</span>
          )}
        </button>
      </SheetFooter>
    </>
  );
}
