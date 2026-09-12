'use client';

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { toast } from 'react-toastify';
import { arbitrum, base, mainnet } from 'viem/chains';
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
import {
  arbitrumPublicClient,
  basePublicClient,
  mainnetPublicClient,
} from '@/utils/publicClients';
import { getOrInitKernelClient } from '../kernelClient';
import { ApprovalDetail, SUPPORTED_CHAINS, USDC_ADDRESSES } from '../types';

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
    if (smartRouting.hasDeficit) {
      if (!anychain.anychainEnabled) {
        toast.error(`Insufficient balance on ${smartRouting.targetChainName}`);
        return;
      }

      if (!smartRouting.isSufficientAcrossAllChains) {
        if (smartRouting.isBelowBridgeMinimum) {
          toast.error(
            smartRouting.bridgeMinimumNotice ||
              'Cross-chain funds are below the bridge minimum. Please deposit directly on the target chain.'
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
        toast.info('Please confirm with your passkey');
        onClose();
      } catch (err: unknown) {
        const e = err as Error;
        setApprovalError(e?.message || 'Approval failed');
      }
      return;
    }

    // Case 2: Cross-chain deficit exists -> Execute transfer on source chain and route via ZeroDev
    setIsRouting(true);
    setRoutingStage('initiating');

    const routesToExecute = smartRouting.recommendedRoute;
    if (routesToExecute.length === 0) {
      setIsRouting(false);
      setApprovalError('No viable cross-chain funding route available.');
      return;
    }

    const destChainId = txChainId || arbitrum.id;
    const routingAddr =
      smartRouting.smartRoutingAddresses[destChainId] ||
      smartRouting.smartRoutingAddress;

    if (!routingAddr) {
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
          setIsRouting(false);
          const available = parseFloat(formatUnits(availableRaw, 6)).toFixed(2);
          const errMsg = `Insufficient USDC balance on ${r.chainName}: Account has ${available} USDC, but route requires ${r.amountFormatted} USDC.`;
          setApprovalError(errMsg);
          toast.error(errMsg);
          return;
        }
      } else {
        const pullWei = parseEther(r.amountFormatted);
        const sourceBal =
          r.chainId === base.id
            ? anychain.balances.base
            : r.chainId === mainnet.id
            ? anychain.balances.mainnet
            : anychain.balances.arbitrum;

        if (sourceBal < pullWei) {
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
            setIsRouting(false);
            const errMsg = `Transfer amount on ${
              r.chainName
            } (${pullAmount} USDC) is below the bridge solver minimum of ${feeInfo.minDepositUsdc.toFixed(
              2
            )} USDC.`;
            setApprovalError(errMsg);
            toast.error(errMsg);
            return;
          }
        } else if (!isUsdc && feeInfo?.minDepositEth) {
          const pullAmount = parseFloat(r.amountFormatted);
          if (pullAmount < feeInfo.minDepositEth) {
            setIsRouting(false);
            const errMsg = `Transfer amount on ${
              r.chainName
            } (${pullAmount} ETH) is below the bridge solver minimum of ${feeInfo.minDepositEth.toFixed(
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
    toast.info(`Routing funds via ZeroDev: ${routeChainsDesc}`);

    let sourceTxHashes: string[] = [];

    try {
      const store = await (connector as any)?.getStore?.();
      const provider = (await (connector as any)?.getProvider?.()) as any;

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

          if (sourceKernelClient) {
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
          }

          if (provider?.request) {
            return (await provider.request({
              method: 'eth_sendTransaction',
              params: [
                {
                  from: address,
                  to: toAddress,
                  value: `0x${valueBigInt.toString(16)}`,
                  data: callDataHex,
                  chainId: `0x${r.chainId.toString(16)}`,
                  __isSmartRoutingInternal: true,
                },
              ],
            })) as string;
          }

          throw new Error(
            `Unable to initiate transfer from ${r.chainName}. Please check wallet.`
          );
        })
      );

      if (sourceTxHashes.length === 0) {
        throw new Error('No routing transactions were broadcast.');
      }

      setRoutingStage('routing');
      const hashSnippets = sourceTxHashes.map((h) => h.slice(0, 8)).join(', ');
      setRoutingStatusText(
        `Funds sent (${hashSnippets})! ZeroDev solver is bridging to ${smartRouting.targetChainName}...`
      );
      toast.success(
        `Deposits sent! Bridging to ${smartRouting.targetChainName}...`
      );

      // 3. Track settlement on target chain
      const targetChainPublicClient =
        destChainId === base.id
          ? basePublicClient
          : destChainId === mainnet.id
          ? mainnetPublicClient
          : arbitrumPublicClient;

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
                  `ZeroDev solver bridging funds (${match.bridge.transactionHash.slice(
                    0,
                    8
                  )}...)`
                );
              } else if (match.deposit) {
                setRoutingStage('routing');
                setRoutingStatusText(
                  `Deposit detected. Solver bridging to ${smartRouting.targetChainName}...`
                );
              }
            } else {
              setRoutingStatusText(
                `Waiting for solver fulfillment on ${
                  smartRouting.targetChainName
                }... (${(attempt + 1) * 2}s)`
              );
            }
          }
        } catch {
          setRoutingStatusText(
            `Routing in progress via ZeroDev solver... (${(attempt + 1) * 2}s)`
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
        setIsRouting(false);
        setRoutingStage('idle');
        onClose();
      } else {
        setIsRouting(false);
        setRoutingStage('idle');
        setApprovalError(
          `Fulfillment still in progress. Funds were sent to router. ZeroDev solver will deliver shortly.`
        );
      }
    } catch (err: unknown) {
      const e = err as Error;
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
                {smartRouting.hasDeficit && (
                  <div className='mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 font-sans'>
                    <span>Deficit:</span>
                    <span className='font-mono font-semibold'>
                      {smartRouting.deficitEth.toFixed(4)} ETH
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

              {/* Gas Sponsorship */}
              <div className='flex items-center justify-between pt-2 border-t border-white/5'>
                <span className='text-xs text-white/50'>Gas Fee</span>
                <span className='text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full'>
                  ⚡ Sponsored by ZeroDev
                </span>
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
                <div className='p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-1.5 text-xs font-semibold text-amber-400 font-sans'>
                      <AlertTriangle
                        size={15}
                        className='shrink-0 text-amber-400'
                      />
                      <span>Anychain Smart Routing Disabled</span>
                    </div>
                    <span className='text-[10px] uppercase tracking-wider font-semibold text-amber-400/90 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30 font-sans'>
                      Action Required
                    </span>
                  </div>

                  <p className='text-xs text-white/80 leading-relaxed font-sans'>
                    Your combined balance across chains (
                    <span className='font-mono font-semibold text-white'>
                      {smartRouting.totalPortfolioEth.toFixed(4)} ETH / $
                      {smartRouting.totalPortfolioUsd.toFixed(2)}
                    </span>
                    ) covers this transaction, but{' '}
                    <span className='text-amber-300 font-medium'>
                      Anychain Smart Routing is disabled
                    </span>
                    . Enable it to automatically route and bridge your funds to{' '}
                    {smartRouting.targetChainName}, or deposit directly.
                  </p>

                  <div className='flex items-center justify-between pt-1 border-t border-white/5 text-xs font-sans'>
                    <button
                      type='button'
                      onClick={() => anychain.toggleAnychain(true)}
                      className='flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black font-semibold text-xs transition active:scale-[0.99]'
                    >
                      <span>Enable Anychain Routing</span>
                    </button>
                    <button
                      type='button'
                      onClick={handleCopy}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition active:scale-[0.98] ${
                        isCopied
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/30'
                      }`}
                    >
                      {isCopied ? (
                        <CopyDoneIcon size={12} className='text-emerald-400' />
                      ) : (
                        <CopyIcon size={12} />
                      )}
                      <span>{isCopied ? 'Copied!' : 'Copy Address'}</span>
                    </button>
                  </div>
                </div>
              ) : smartRouting.isBelowBridgeMinimum ? (
                /* STATE 2: YELLOW - Have enough total across chains, but below solver bridge minimum */
                <div className='p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-1.5 text-xs font-semibold text-amber-400 font-sans'>
                      <AlertTriangle
                        size={15}
                        className='shrink-0 text-amber-400'
                      />
                      <span>Bridge Minimum Not Met</span>
                    </div>
                    <span className='text-[10px] uppercase tracking-wider font-semibold text-amber-400/90 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30 font-sans'>
                      Solver Threshold
                    </span>
                  </div>

                  <p className='text-xs text-white/80 leading-relaxed font-sans'>
                    {smartRouting.totalPortfolioEth >=
                    smartRouting.requiredEth ? (
                      <>
                        Your combined balance across chains (
                        <span className='font-mono font-semibold text-white'>
                          {smartRouting.totalPortfolioEth.toFixed(4)} ETH / $
                          {smartRouting.totalPortfolioUsd.toFixed(2)}
                        </span>
                        ) covers this transaction cost, but your funds on
                        individual source chains are below the{' '}
                        <span className='text-amber-300 font-medium'>
                          cross-chain bridge solver minimum
                        </span>
                        .
                      </>
                    ) : (
                      <>
                        Your funds on other chains are below the{' '}
                        <span className='text-amber-300 font-medium'>
                          cross-chain bridge solver minimum
                        </span>{' '}
                        required by solvers to settle on{' '}
                        {smartRouting.targetChainName}.
                      </>
                    )}
                  </p>

                  {/* Dynamic Bridge Minimums Breakdown Table */}
                  {smartRouting.chainBridgeMinimums.length > 0 && (
                    <div className='rounded-xl bg-black/40 border border-amber-500/20 p-2.5 space-y-2 text-xs font-sans'>
                      <div className='text-[10px] font-semibold text-amber-300/80 uppercase tracking-wider'>
                        Dynamic Solver Minimums (Live via ZeroDev)
                      </div>
                      <div className='space-y-1.5'>
                        {smartRouting.chainBridgeMinimums.map((cm) => (
                          <div
                            key={cm.chainId}
                            className='flex items-center justify-between text-[11px] py-1 px-2 rounded-lg bg-white/[0.02] border border-white/5 font-sans'
                          >
                            <div>
                              <span className='font-semibold text-white'>
                                {cm.chainName}:{' '}
                              </span>
                              <span className='text-white/60 font-mono'>
                                Min ${cm.minUsdc.toFixed(2)} USDC /{' '}
                                {cm.minEth.toFixed(4)} ETH
                              </span>
                            </div>
                            <div className='text-right font-mono'>
                              <span className='text-amber-400 text-[11px]'>
                                {cm.userUsdcAvailable > 0
                                  ? `$${cm.userUsdcAvailable.toFixed(2)} USDC`
                                  : cm.userEthAvailable > 0
                                  ? `${cm.userEthAvailable.toFixed(4)} ETH`
                                  : '$0.00'}
                              </span>
                              <span className='text-[9px] text-white/40 block'>
                                {cm.isUsdcMet || cm.isEthMet
                                  ? '✓ Met'
                                  : 'Below Min'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className='flex items-center justify-between pt-1 border-t border-white/5 text-xs font-sans'>
                    <span className='text-[11px] text-white/60'>
                      Direct deposits have no bridge minimums:
                    </span>
                    <button
                      type='button'
                      onClick={handleCopy}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition active:scale-[0.98] ${
                        isCopied
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/30'
                      }`}
                    >
                      {isCopied ? (
                        <CopyDoneIcon size={12} className='text-emerald-400' />
                      ) : (
                        <CopyIcon size={12} />
                      )}
                      <span>{isCopied ? 'Copied!' : 'Copy Address'}</span>
                    </button>
                  </div>
                </div>
              ) : !smartRouting.isSufficientAcrossAllChains ? (
                /* STATE 1: RED - Actually don't even have enough funds across all chains */
                <div className='p-4 rounded-2xl bg-red-500/10 border border-red-500/20 space-y-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-1.5 text-xs font-semibold text-red-400 font-sans'>
                      <AlertCircle size={15} className='shrink-0' />
                      <span>Insufficient Total Funds</span>
                    </div>
                    <span className='text-[10px] uppercase tracking-wider font-semibold text-red-400/80 bg-red-500/20 px-2 py-0.5 rounded-full border border-red-500/30 font-sans'>
                      Deficit
                    </span>
                  </div>

                  <p className='text-xs text-white/70 leading-relaxed font-sans'>
                    You need{' '}
                    <span className='font-mono font-semibold text-white'>
                      {smartRouting.requiredEth.toFixed(4)} ETH
                    </span>{' '}
                    (≈ ${smartRouting.requiredUsd.toFixed(2)}), but your
                    combined balance across all chains is only{' '}
                    <span className='font-mono font-semibold text-white'>
                      {smartRouting.totalPortfolioEth.toFixed(4)} ETH
                    </span>{' '}
                    (≈ ${smartRouting.totalPortfolioUsd.toFixed(2)}).
                  </p>

                  <div className='p-2.5 rounded-xl bg-black/30 border border-red-500/20 flex items-center justify-between text-xs font-sans'>
                    <span className='text-white/50'>Deficit</span>
                    <span className='font-mono font-bold text-red-400'>
                      - {smartRouting.shortfallEth.toFixed(4)} ETH (≈ $
                      {smartRouting.shortfallUsd.toFixed(2)})
                    </span>
                  </div>

                  <div className='flex items-center justify-between pt-1 border-t border-white/5 text-xs font-sans'>
                    <span className='text-[11px] text-white/50'>
                      Deposit address:
                    </span>
                    <button
                      type='button'
                      onClick={handleCopy}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition active:scale-[0.98] ${
                        isCopied
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border-red-500/30'
                      }`}
                    >
                      {isCopied ? (
                        <CopyDoneIcon size={12} className='text-emerald-400' />
                      ) : (
                        <CopyIcon size={12} />
                      )}
                      <span>{isCopied ? 'Copied!' : 'Copy Address'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* STATE 3: GREEN - Have enough and pass bridge minimum (Optimal Route Ready) */
                <div className='p-4 rounded-2xl bg-gradient-to-b from-emerald-500/[0.08] to-emerald-500/[0.02] border border-emerald-500/30 space-y-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-1.5 text-xs font-semibold text-emerald-400 font-sans'>
                      <ArrowRightLeft size={15} className='shrink-0' />
                      <span>Cross-Chain Smart Route</span>
                    </div>
                    <span className='text-[10px] font-medium text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded-full font-sans'>
                      Lowest Fee First
                    </span>
                  </div>

                  <div className='text-xs text-white/70 leading-relaxed font-sans'>
                    <span>Available on {smartRouting.targetChainName}: </span>
                    <span className='font-mono font-medium text-white'>
                      {smartRouting.currentChainBalanceEth.toFixed(4)} ETH
                    </span>
                    <br />
                    <span className='text-emerald-400/90 font-medium'>
                      Routing {smartRouting.deficitEth.toFixed(4)} ETH (≈ $
                      {smartRouting.deficitUsd.toFixed(2)}) from your other
                      chains:
                    </span>
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
                          <div className='flex items-center justify-between'>
                            <div className='flex items-center gap-2'>
                              <ChainIcon size={16} />
                              <div>
                                <div className='font-medium text-white'>
                                  Pull {step.amountFormatted} {step.tokenSymbol}
                                </div>
                                <div className='text-[10px] text-white/40'>
                                  from {step.chainName}{' '}
                                  {step.tokenSymbol !== 'ETH' &&
                                    `(≈ ${step.amountEthEquivalent.toFixed(
                                      4
                                    )} ETH)`}
                                </div>
                              </div>
                            </div>
                            <div className='text-right'>
                              <div className='text-[10px] text-emerald-400 font-medium'>
                                {step.tag}
                              </div>
                              <div className='text-[10px] text-white/40 font-mono'>
                                ≈ ${step.amountUsd}
                              </div>
                            </div>
                          </div>

                          {step.isMinimumEnforced && (
                            <div className='p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-white/80 leading-relaxed font-sans'>
                              <div className='font-semibold text-emerald-400 flex items-center gap-1 mb-0.5'>
                                <span>⚡ Bridge Minimum Applied</span>
                              </div>
                              <span>
                                Solvers enforce a minimum transfer of{' '}
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
                        <span>Estimated Solver Fee</span>
                        <span className='font-mono font-medium text-emerald-400'>
                          {smartRouting.totalRouteFeeEst}
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
                    <span>ZeroDev Smart Route In Progress</span>
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
