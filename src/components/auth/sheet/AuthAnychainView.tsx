'use client';

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { toast } from 'react-toastify';
import { arbitrum, base, mainnet } from 'viem/chains';
import { erc20Abi, formatEther, formatUnits } from 'viem';
import {
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetContent,
  SheetFooter,
  SheetClose,
} from '@/components/ui/Sheet';
import { AlertTriangle, ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAnychainBalances } from '@/hooks/useAnychainBalances';
import {
  useSmartRouting,
  fetchSmartRoutingStatus,
  getRefundCalls,
} from '@/hooks/useSmartRouting';
import {
  arbitrumPublicClient,
  basePublicClient,
  mainnetPublicClient,
} from '@/utils/publicClients';
import { getOrInitKernelClient } from '../kernelClient';

interface AuthAnychainViewProps {
  onClose: () => void;
  onBack: () => void;
  anychain: ReturnType<typeof useAnychainBalances>;
  smartRouting: ReturnType<typeof useSmartRouting>;
  isConnected: boolean;
  address?: string;
}

export default function AuthAnychainView({
  onClose,
  onBack,
  anychain,
  smartRouting,
  isConnected,
  address,
}: AuthAnychainViewProps) {
  const { connector } = useAccount();

  const [unbridgedDeposits, setUnbridgedDeposits] = useState<
    {
      chainId: number;
      chainName: string;
      token: `0x${string}`;
      tokenSymbol: string;
      amountFormatted: string;
    }[]
  >([]);
  const [isRecovering, setIsRecovering] = useState(false);

  useEffect(() => {
    if (!address) return;
    let isMounted = true;
    const checkStuck = async () => {
      const routingAddr =
        smartRouting.smartRoutingAddresses[arbitrum.id] ||
        smartRouting.smartRoutingAddress;
      if (!routingAddr) return;
      try {
        const deposits = await fetchSmartRoutingStatus(routingAddr);
        const candidateDeposits = deposits.filter(
          (d) => d.error || (!d.bridge && !d.execution)
        );

        const stuck: {
          chainId: number;
          chainName: string;
          token: `0x${string}`;
          tokenSymbol: string;
          amountFormatted: string;
        }[] = [];

        await Promise.all(
          candidateDeposits.map(async (d) => {
            const isEth =
              d.deposit.token.toLowerCase() ===
              '0x0000000000000000000000000000000000000000';
            const chainName =
              d.deposit.chainId === base.id
                ? 'Base'
                : d.deposit.chainId === mainnet.id
                ? 'Ethereum'
                : 'Arbitrum';

            const client =
              d.deposit.chainId === base.id
                ? basePublicClient
                : d.deposit.chainId === mainnet.id
                ? mainnetPublicClient
                : arbitrumPublicClient;

            let onChainBal = BigInt(0);
            try {
              if (isEth) {
                onChainBal = await client.getBalance({
                  address: routingAddr as `0x${string}`,
                });
              } else {
                onChainBal = await client.readContract({
                  address: d.deposit.token as `0x${string}`,
                  abi: erc20Abi,
                  functionName: 'balanceOf',
                  args: [routingAddr as `0x${string}`],
                });
              }
            } catch {
              onChainBal = BigInt(0);
            }

            // Only consider it unbridged if the routing contract actually still holds the funds
            if (onChainBal > BigInt(0)) {
              const amountFormatted = isEth
                ? Number(formatEther(onChainBal)).toFixed(6)
                : Number(formatUnits(onChainBal, 6)).toFixed(2);
              stuck.push({
                chainId: d.deposit.chainId,
                chainName,
                token: d.deposit.token as `0x${string}`,
                tokenSymbol: isEth ? 'ETH' : 'USDC',
                amountFormatted,
              });
            }
          })
        );

        if (!isMounted) return;
        setUnbridgedDeposits(stuck);
      } catch (err) {
        console.warn('Check stuck deposits note:', err);
      }
    };
    checkStuck();
    return () => {
      isMounted = false;
    };
  }, [
    address,
    smartRouting.smartRoutingAddress,
    smartRouting.smartRoutingAddresses,
  ]);

  const handleRecoverUnbridged = async () => {
    const routingAddr =
      smartRouting.smartRoutingAddresses[arbitrum.id] ||
      smartRouting.smartRoutingAddress;
    if (!routingAddr) {
      toast.error('Routing address not yet available. Please try again.');
      return;
    }
    try {
      setIsRecovering(true);
      toast.info('Checking for unbridged deposits...');

      // 1. Fetch live deposits
      const rawDeposits = await fetchSmartRoutingStatus(routingAddr);
      const stuck = rawDeposits.filter(
        (d) => d.error || (!d.bridge && !d.execution)
      );

      if (!stuck.length) {
        toast.info('No unbridged funds found in routing contract.');
        setUnbridgedDeposits([]);
        return;
      }

      const tokensToWithdraw = stuck.map((d) => ({
        chainId: d.deposit.chainId,
        token: d.deposit.token as `0x${string}`,
      }));

      // 2. Query withdrawal calls from ZeroDev solver
      const refundCallsRes = await getRefundCalls(
        routingAddr,
        tokensToWithdraw
      );
      if (!refundCallsRes?.data?.length) {
        toast.info('No withdrawal calls returned by router.');
        return;
      }

      // 3. Obtain store and execute on each chain
      const store = await (connector as any)?.getStore?.();

      for (const item of refundCallsRes.data) {
        const chainName =
          item.chainId === base.id
            ? 'Base'
            : item.chainId === mainnet.id
            ? 'Ethereum'
            : 'Arbitrum';

        toast.info(`Submitting refund on ${chainName}...`);

        const formattedCalls = item.calls.map((c: any) => ({
          to: c.to as `0x${string}`,
          data: (c.data || '0x') as `0x${string}`,
          value: typeof c.value === 'bigint' ? c.value : BigInt(c.value || 0),
        }));

        const kClient = await getOrInitKernelClient(store, item.chainId);
        if (!kClient) {
          throw new Error(
            `Smart account unavailable for chain ${chainName} (${item.chainId})`
          );
        }
        const txHash = (await (kClient as any).sendTransaction({
          calls: formattedCalls,
        })) as string;

        console.log(
          `[Refund] Refunded on chain ${item.chainId}, hash:`,
          txHash
        );
        toast.success(`Successfully refunded on ${chainName}!`);
      }

      toast.success('All unbridged funds refunded to your smart account!');
      setUnbridgedDeposits([]);
      anychain.refetch();
    } catch (err: unknown) {
      const e = err as Error;
      console.error('[handleRecoverUnbridged error]:', e);
      toast.error(e?.message || 'Failed to refund unbridged deposits');
    } finally {
      setIsRecovering(false);
    }
  };

  return (
    <>
      <SheetHeader className='pb-5'>
        <div className='flex items-start justify-between w-full'>
          <div>
            <button
              type='button'
              onClick={onBack}
              className='text-[11px] text-white/50 hover:text-white flex items-center gap-1 mb-1.5 transition-colors normal-case'
            >
              <ArrowLeft size={12} />
              <span>{isConnected ? 'Account' : 'Sign In'}</span>
            </button>
            <SheetTitle className='text-lg font-bold text-white tracking-tight normal-case'>
              Anychain Settings
            </SheetTitle>
            <SheetDescription className='text-xs text-white/50 mt-1 font-normal normal-case'>
              Cross-chain smart routing and multi-chain balances
            </SheetDescription>
          </div>
          <SheetClose onClick={onClose} />
        </div>
      </SheetHeader>

      <SheetContent className='space-y-4 pt-4'>
        {/* Toggle Card */}
        <div className='p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'>
          <div className='pr-3'>
            <div className='text-xs font-bold text-white normal-case'>
              Enable Anychain Smart Routing
            </div>
            <p className='text-[11px] text-white/70 mt-1.5 leading-relaxed normal-case'>
              Automatically combine and route supported tokens across chains
              when your balance on one chain is low.
            </p>
          </div>
          <button
            type='button'
            onClick={() => anychain.toggleAnychain()}
            className={`shrink-0 w-11 h-6 rounded-full transition-colors relative p-0.5 ${
              anychain.anychainEnabled ? 'bg-emerald-500' : 'bg-white/20'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                anychain.anychainEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Multi-Chain Balances */}
        <div className='p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'>
          <div className='text-left'>
            <div className='text-xs font-bold text-white normal-case'>
              Supported Anychain Tokens
            </div>
            <p className='text-[11px] text-white/70 mt-1.5 leading-relaxed normal-case'>
              Balances across your chains combine automatically to cover
              payments.
            </p>
          </div>

          <div className='space-y-2'>
            {anychain.chainList.map((c) => {
              return (
                <div
                  key={c.chainId}
                  className='p-3 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2'
                >
                  {/* Chain Header & Native Balance */}
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                      <span className='text-xs text-white font-semibold'>
                        {c.name}
                      </span>
                      {isConnected && c.isCurrent && (
                        <span className='text-[9px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded-full'>
                          Active
                        </span>
                      )}
                    </div>
                    <div className='text-xs font-mono text-white/90 font-medium'>
                      {isConnected
                        ? anychain.isDisclosed
                          ? `${c.formatted} ${c.symbol}`
                          : `•••• ${c.symbol}`
                        : c.symbol}
                    </div>
                  </div>

                  {/* Tracked Tokens */}
                  {c.tokens && c.tokens.length > 0 && (
                    <div className='space-y-1 pt-1 border-t border-white/5'>
                      {c.tokens.map((token) => (
                        <div
                          key={token.address}
                          className='flex items-center justify-between text-[11px] py-1 px-2 rounded-lg bg-black/20 text-white/70'
                        >
                          <div className='flex items-center gap-1.5'>
                            <span className='font-medium text-white/90'>
                              {token.symbol}
                            </span>
                            <span className='text-[9px] font-mono text-white/40'>
                              {token.address.slice(0, 6)}...
                              {token.address.slice(-4)}
                            </span>
                          </div>
                          <div className='flex items-center gap-2'>
                            <span className='font-mono text-white/80'>
                              {isConnected
                                ? anychain.isDisclosed
                                  ? `${token.formatted} ${token.symbol}`
                                  : `•••• ${token.symbol}`
                                : token.symbol}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {isConnected && (
            <div className='flex items-center justify-between pt-2.5 border-t border-white/5'>
              <span className='text-[11px] text-white/50'>
                Total across chains
              </span>
              <div className='flex items-center gap-1.5'>
                <span className='text-xs text-white font-mono font-semibold'>
                  {anychain.isDisclosed
                    ? `${anychain.totalEthFormatted} ETH`
                    : '•••• ETH'}
                </span>
                <button
                  type='button'
                  onClick={() => anychain.toggleDisclose()}
                  className='text-white/40 hover:text-white p-0.5 rounded transition-colors'
                  title={
                    anychain.isDisclosed ? 'Hide balances' : 'Show balances'
                  }
                  aria-label={
                    anychain.isDisclosed ? 'Hide balances' : 'Show balances'
                  }
                >
                  {anychain.isDisclosed ? (
                    <Eye size={13} />
                  ) : (
                    <EyeOff size={13} />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Unbridged Deposits Recovery Tool */}
        {unbridgedDeposits.length > 0 && (
          <div className='p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-1.5 text-xs font-bold text-amber-400 font-sans'>
                <AlertTriangle size={15} />
                <span>Unbridged Deposits Detected</span>
              </div>
              <span className='text-[10px] font-semibold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30 font-sans'>
                {unbridgedDeposits.length} Pending
              </span>
            </div>
            <p className='text-[11px] text-white/70 leading-relaxed font-sans'>
              Previous deposits to your routing address fell below route
              minimums. Your funds are safe in the routing contract and can be
              returned directly to your smart account:
            </p>
            <div className='space-y-1.5'>
              {unbridgedDeposits.map((d, idx) => (
                <div
                  key={idx}
                  className='flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-black/40 border border-amber-500/20 text-xs font-mono'
                >
                  <span className='text-white font-medium'>{d.chainName}</span>
                  <span className='text-amber-300 font-bold'>
                    {d.amountFormatted} {d.tokenSymbol}
                  </span>
                </div>
              ))}
            </div>
            <button
              type='button'
              onClick={handleRecoverUnbridged}
              disabled={isRecovering}
              className='w-full flex items-center justify-center gap-1.5 py-2 px-4 rounded-full bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs transition active:scale-[0.99] disabled:opacity-50 font-sans'
            >
              {isRecovering ? (
                <>
                  <Loader2 size={13} className='animate-spin' />
                  <span>Refunding to Wallet...</span>
                </>
              ) : (
                <span>Withdraw Unbridged Funds to Wallet</span>
              )}
            </button>
          </div>
        )}
      </SheetContent>

      <SheetFooter className='gap-2.5 pt-4'>
        <button
          type='button'
          onClick={onBack}
          className='flex-1 flex items-center justify-center gap-1.5 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 text-white font-semibold text-xs py-2.5 px-4 transition active:scale-[0.99] normal-case'
        >
          <ArrowLeft size={14} />
          <span>{isConnected ? 'Back to Account' : 'Back to Sign In'}</span>
        </button>
        <button
          type='button'
          onClick={onClose}
          className='rounded-full bg-[#f15e5f] hover:bg-[#cf5d5d] text-white font-semibold text-xs py-2.5 px-5 transition active:scale-[0.99] normal-case'
        >
          Done
        </button>
      </SheetFooter>
    </>
  );
}
