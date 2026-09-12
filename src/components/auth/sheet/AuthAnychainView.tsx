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
import { CopyDoneIcon, CopyIcon } from '@/components/global/Icons';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  X,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
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
import { SUPPORTED_CHAINS } from '../types';
import TurnkeyExportCard from '../TurnkeyExportCard';

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

  const [addingTokenChainId, setAddingTokenChainId] = useState<number | null>(
    null
  );
  const [tokenAddressInput, setTokenAddressInput] = useState('');
  const [isAddingToken, setIsAddingToken] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const [selectedDepositChainId, setSelectedDepositChainId] = useState<number>(
    arbitrum.id
  );
  const [copiedDeposit, setCopiedDeposit] = useState(false);

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

  const handleOpenAddToken = (chainId: number) => {
    setAddingTokenChainId(chainId);
    setTokenAddressInput('');
    setTokenError(null);
  };

  const handleCancelAddToken = () => {
    setAddingTokenChainId(null);
    setTokenAddressInput('');
    setTokenError(null);
  };

  const handleConfirmAddToken = async (
    targetChainId: number,
    chainName: string
  ) => {
    if (!tokenAddressInput.trim()) return;
    setTokenError(null);
    try {
      setIsAddingToken(true);
      const token = await anychain.addCustomToken(
        targetChainId,
        tokenAddressInput
      );
      toast.success(`Added ${token.symbol} on ${chainName}`);
      setAddingTokenChainId(null);
      setTokenAddressInput('');
      setTokenError(null);
    } catch (e: unknown) {
      const err = e as Error;
      const msg = err?.message || 'Failed to add token';
      setTokenError(msg);
      toast.error(msg);
    } finally {
      setIsAddingToken(false);
    }
  };

  const handleRemoveToken = (
    targetChainId: number,
    tokenAddress: string,
    symbol: string
  ) => {
    anychain.removeCustomToken(targetChainId, tokenAddress);
    toast.info(`Removed ${symbol}`);
  };

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
      smartRouting.smartRoutingAddress ||
      '0xb5De12E2f04B17e7c7485377feD405B3a753adc6';

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
        toast.info('No withdrawal calls returned by solver.');
        return;
      }

      // 3. Obtain store and execute on each chain
      const store = await (connector as any)?.getStore?.();
      const provider = (await (connector as any)?.getProvider?.()) as any;

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

        let txHash: string | undefined;
        const kClient = await getOrInitKernelClient(store, item.chainId);

        if (kClient) {
          txHash = (await (kClient as any).sendTransaction({
            calls: formattedCalls,
          })) as string;
        } else if (provider?.request) {
          for (const call of formattedCalls) {
            txHash = (await provider.request({
              method: 'eth_sendTransaction',
              params: [
                {
                  from: address,
                  to: call.to,
                  data: call.data,
                  value: `0x${call.value.toString(16)}`,
                },
              ],
            })) as string;
          }
        } else {
          throw new Error(
            `Wallet client unavailable for chain ${chainName} (${item.chainId})`
          );
        }

        console.log(
          `[Refund] Refunded on chain ${item.chainId}, hash:`,
          txHash
        );
        toast.success(`Successfully refunded on ${chainName}!`);
      }

      toast.success('All unbridged funds refunded to your smart account!');
      setUnbridgedDeposits([]);
      anychain.refreshBalances();
    } catch (err: unknown) {
      const e = err as Error;
      console.error('[handleRecoverUnbridged error]:', e);
      toast.error(e?.message || 'Failed to refund unbridged deposits');
    } finally {
      setIsRecovering(false);
    }
  };

  const activeDepositChain =
    SUPPORTED_CHAINS.find((c) => c.id === selectedDepositChainId) ||
    SUPPORTED_CHAINS[0];

  const selectedRouterAddress =
    smartRouting.smartRoutingAddresses?.[selectedDepositChainId] ||
    (selectedDepositChainId === arbitrum.id
      ? smartRouting.smartRoutingAddress
      : undefined);

  const handleCopyRouter = () => {
    if (selectedRouterAddress) {
      navigator.clipboard.writeText(selectedRouterAddress);
      setCopiedDeposit(true);
      toast.success(`${activeDepositChain.name} deposit address copied`);
      setTimeout(() => setCopiedDeposit(false), 1500);
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
            <div className='text-xs font-bold text-white tracking-tight normal-case'>
              Enable Anychain Smart Routing
            </div>
            <div className='text-[11px] text-white/50 mt-0.5 normal-case'>
              Automatically combine and route funds across chains when your
              balance on one chain is low.
            </div>
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
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-1.5'>
              <span className='text-[11px] uppercase tracking-wider text-white/50 font-semibold'>
                Multi-Chain Balances
              </span>
              {isConnected && (
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
              )}
            </div>
            <span className='text-xs text-emerald-400 font-mono font-semibold'>
              {isConnected
                ? anychain.isDisclosed
                  ? `Total: ${anychain.totalEthFormatted} ETH`
                  : 'Total: •••• ETH'
                : 'Arbitrum · Base · Ethereum'}
            </span>
          </div>

          <div className='space-y-2'>
            {anychain.chainList.map((c) => {
              const isAddingThisChain = addingTokenChainId === c.chainId;
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
                            {token.isCustom && (
                              <span className='text-[8px] bg-white/10 text-white/60 px-1 rounded'>
                                custom
                              </span>
                            )}
                          </div>
                          <div className='flex items-center gap-2'>
                            <span className='font-mono text-white/80'>
                              {isConnected
                                ? anychain.isDisclosed
                                  ? `${token.formatted} ${token.symbol}`
                                  : `•••• ${token.symbol}`
                                : token.symbol}
                            </span>
                            {token.isCustom && (
                              <button
                                type='button'
                                onClick={() =>
                                  handleRemoveToken(
                                    c.chainId,
                                    token.address,
                                    token.symbol
                                  )
                                }
                                className='text-white/30 hover:text-red-400 p-0.5 rounded transition-colors'
                                title={`Remove ${token.symbol}`}
                                aria-label={`Remove ${token.symbol}`}
                              >
                                <X size={11} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Custom Token Form / Trigger */}
                  {isAddingThisChain ? (
                    <div className='pt-1.5 space-y-1.5'>
                      <div className='flex items-center gap-1.5'>
                        <input
                          type='text'
                          value={tokenAddressInput}
                          onChange={(e) => setTokenAddressInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter')
                              handleConfirmAddToken(c.chainId, c.name);
                            if (e.key === 'Escape') handleCancelAddToken();
                          }}
                          placeholder='Contract address (0x...)'
                          disabled={isAddingToken}
                          className='flex-1 bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-white placeholder-white/30 focus:outline-none focus:border-[#f15e5f]/50'
                          autoFocus
                        />
                        <button
                          type='button'
                          onClick={() =>
                            handleConfirmAddToken(c.chainId, c.name)
                          }
                          disabled={isAddingToken || !tokenAddressInput.trim()}
                          className='px-2.5 py-1.5 rounded-lg bg-[#f15e5f] hover:bg-[#cf5d5d] disabled:opacity-50 text-white text-[11px] font-semibold flex items-center gap-1 transition-colors normal-case'
                        >
                          {isAddingToken ? (
                            <Loader2 size={12} className='animate-spin' />
                          ) : (
                            <span>Add</span>
                          )}
                        </button>
                        <button
                          type='button'
                          onClick={handleCancelAddToken}
                          disabled={isAddingToken}
                          className='p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors normal-case'
                          title='Cancel'
                        >
                          <X size={12} />
                        </button>
                      </div>
                      <div className='text-[10px] text-white/40 normal-case'>
                        Queries ERC-20 contract for symbol, decimals, and live
                        balance.
                      </div>
                      {tokenError && (
                        <div className='p-2 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2 text-[11px] text-red-400 normal-case leading-normal'>
                          <AlertCircle
                            size={13}
                            className='shrink-0 mt-0.5 text-red-400'
                          />
                          <span className='flex-1 break-words'>
                            {tokenError}
                          </span>
                          <button
                            type='button'
                            onClick={() => setTokenError(null)}
                            className='text-red-400/60 hover:text-red-400 p-0.5 rounded transition-colors'
                            aria-label='Dismiss error'
                          >
                            <X size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className='flex justify-end pt-0.5'>
                      <button
                        type='button'
                        onClick={() => handleOpenAddToken(c.chainId)}
                        className='text-[10px] font-semibold text-white/40 hover:text-white flex items-center gap-1 transition-colors py-0.5 px-2 rounded-full hover:bg-white/5 normal-case'
                      >
                        <Plus size={10} />
                        <span>Add Token</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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
              Previous deposits to your routing address fell below solver
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

        {/* Universal Smart Routing Deposit */}
        <div className='p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'>
          <div className='text-left'>
            <div className='flex items-center justify-between'>
              <div className='text-xs font-bold text-white normal-case'>
                Universal Deposit Address
              </div>
              <div className='flex items-center gap-1.5 text-[10px] text-emerald-400 font-sans'>
                <span className='w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse' />
                <span>ZeroDev Smart Routing</span>
              </div>
            </div>
            <p className='text-[11px] text-white/70 mt-1.5 leading-relaxed normal-case'>
              Deposit from any exchange or wallet without bridging manually.
              Choose which chain you want below and send ETH or USDC to the
              address shown. Whether you send from Coinbase, Binance, Base, or
              Optimism, ZeroDev automatically routes and delivers the funds
              straight into your wallet on that chain.
            </p>
          </div>

          {/* Destination Chain Selector Tabs */}
          <div className='space-y-1.5'>
            <div className='text-[10px] uppercase tracking-wider font-semibold text-white/40'>
              Destination Network
            </div>
            <div className='flex gap-1.5 p-1 rounded-xl bg-black/40 border border-white/10'>
              {SUPPORTED_CHAINS.map((c) => {
                const isSelected = selectedDepositChainId === c.id;
                const ChainIcon = c.Icon;
                return (
                  <button
                    key={c.id}
                    type='button'
                    onClick={() => setSelectedDepositChainId(c.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all normal-case ${
                      isSelected
                        ? 'bg-white/15 text-white shadow-sm border border-white/20'
                        : 'text-white/50 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span className='shrink-0'>
                      <ChainIcon size={14} />
                    </span>
                    <span>{c.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Supported Deposit Sources */}
          <div className='flex flex-wrap items-center gap-1.5 justify-center pt-0.5'>
            <span className='text-[10px] text-white/40 font-medium'>
              Deposit from:
            </span>
            <span className='text-[10px] text-white/60 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full'>
              Base
            </span>
            <span className='text-[10px] text-white/60 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full'>
              Arbitrum
            </span>
            <span className='text-[10px] text-white/60 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full'>
              Ethereum L1
            </span>
            <span className='text-[10px] text-white/60 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full'>
              Optimism
            </span>
            <span className='text-[10px] text-white/60 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full'>
              Coinbase / Binance / Any CEX
            </span>
          </div>

          {isConnected && selectedRouterAddress ? (
            <div className='flex flex-col items-center pt-2 pb-1 space-y-3'>
              <div className='p-2.5 bg-white rounded-xl shadow-md'>
                <QRCodeSVG value={selectedRouterAddress} size={110} />
              </div>

              <div className='w-full space-y-1.5'>
                <div className='flex items-center justify-between text-[11px] text-white/50 px-1'>
                  <span>{activeDepositChain.name} Router Address</span>
                  <span className='text-emerald-400 font-sans text-[10px] font-medium'>
                    Auto-routes into {activeDepositChain.name}
                  </span>
                </div>

                <div className='w-full flex items-center justify-between bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white/90'>
                  <span className='truncate mr-2'>{selectedRouterAddress}</span>
                  <button
                    type='button'
                    onClick={handleCopyRouter}
                    className='shrink-0 text-white/60 hover:text-white p-1 rounded hover:bg-white/10 transition-colors'
                    title={`Copy ${activeDepositChain.name} router address`}
                  >
                    {copiedDeposit ? (
                      <CopyDoneIcon size={15} />
                    ) : (
                      <CopyIcon size={15} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : isConnected && smartRouting.isCreatingAddress ? (
            <div className='py-6 flex flex-col items-center justify-center gap-2 text-white/60'>
              <Loader2 size={18} className='animate-spin text-emerald-400' />
              <span className='text-xs'>
                Generating ZeroDev router for {activeDepositChain.name}...
              </span>
            </div>
          ) : (
            <div className='p-4 rounded-xl bg-white/[0.02] border border-dashed border-white/15 my-1 text-center'>
              <p className='text-xs text-white/60 mb-2.5 normal-case'>
                Sign in to activate your universal deposit routers
              </p>
              <button
                type='button'
                onClick={onBack}
                className='text-xs font-semibold px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors normal-case'
              >
                Sign In to Activate
              </button>
            </div>
          )}
        </div>

        {/* Turnkey Security & Key Export */}
        {isConnected && (
          <TurnkeyExportCard
            address={address}
            containerId='turnkey-export-container-settings'
          />
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
