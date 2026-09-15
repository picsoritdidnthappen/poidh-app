'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { toast } from 'react-toastify';
import { erc20Abi, formatEther, formatUnits } from 'viem';
import {
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetContent,
  SheetFooter,
  SheetClose,
} from '@/components/ui/Sheet';
import { ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAnychainBalances } from '@/hooks/useAnychainBalances';
import {
  useSmartRouting,
  fetchSmartRoutingStatusMulti,
  getRefundCalls,
} from '@/hooks/useSmartRouting';
import {
  chainNameFor,
  isNativeToken,
  publicClientFor,
} from '@/components/auth/chains';
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
      routingAddress: string;
      token: `0x${string}`;
      tokenSymbol: string;
      amountFormatted: string;
      txHash: string;
      blockNumber: string;
    }[]
  >([]);
  const [isRecovering, setIsRecovering] = useState(false);
  // Per-chain refund outcome: each plan item is its own op + signature.
  const [refundStatus, setRefundStatus] = useState<
    Record<number, { state: 'ok' } | { state: 'error'; message: string }>
  >({});
  // Sync guard: state updates land async, so rapid clicks could each fire a
  // real on-chain pull before the button disables. Refs flip immediately.
  const recoveringRef = useRef(false);
  // Unbridged check lifecycle: idle until the card scrolls into view,
  // then checking -> ready | empty | error. No polling, no prefetch.
  const [stuckState, setStuckState] = useState<
    'idle' | 'checking' | 'ready' | 'empty' | 'error'
  >('idle');
  const [inView, setInView] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  // Refund calls fetched from the router, awaiting explicit user confirm.
  // Nothing executes until Confirm is pressed.
  const [pendingRefund, setPendingRefund] = useState<
    {
      routingAddress: string;
      chainId: number;
      chainName: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      calls: any[];
    }[]
  >([]);

  const allRoutingAddresses = () => [
    ...new Set(
      [
        ...Object.values(smartRouting.smartRoutingAddresses),
        smartRouting.smartRoutingAddress,
      ].filter(Boolean) as string[]
    ),
  ];

  const [stuckNonce, setStuckNonce] = useState(0);

  // Fire the unbridged check once the card scrolls into view.
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!address || !inView) return;
    let isMounted = true;
    const checkStuck = async () => {
      const addrs = allRoutingAddresses();
      if (!addrs.length) return;
      setStuckState('checking');
      try {
        const tagged = await fetchSmartRoutingStatusMulti(addrs);
        if (!isMounted) return;
        if (tagged === null) {
          // Status check failed: say so, never report "all good".
          if (!isMounted) return;
          setStuckState('error');
          setUnbridgedDeposits([]);
          return;
        }
        const deduped = [
          ...new Map(
            tagged
              .filter(
                ({ deposit: d }) => d.error || (!d.bridge && !d.execution)
              )
              // Same deposit can surface under multiple routing addresses.
              .map(
                (t) =>
                  [
                    `${
                      t.deposit.deposit.chainId
                    }-${t.deposit.deposit.token.toLowerCase()}-${t.deposit.deposit.transactionHash.toLowerCase()}`,
                    t,
                  ] as const
              )
          ).values(),
        ];
        // Drop phantoms: a real deposit MUST leave an on-chain trace of funds
        // arriving at the router (ERC-20 Transfer log or native value). The
        // status API lists records the chain can't corroborate, and the
        // aggregate balance check can't tell them apart. Unfetchable receipts
        // are kept so RPC blips don't hide real funds.
        const TRANSFER_TOPIC =
          '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
        const candidateDeposits: typeof deduped = [];
        await Promise.all(
          deduped.map(async (t) => {
            const dep = t.deposit.deposit;
            const client = publicClientFor(dep.chainId);
            try {
              const receipt = await client.getTransactionReceipt({
                hash: dep.transactionHash,
              });
              if (receipt.status !== 'success') return;
              const router = t.routingAddress.toLowerCase();
              if (isNativeToken(dep.token)) {
                const tx = await client.getTransaction({
                  hash: dep.transactionHash,
                });
                if (tx.to?.toLowerCase() !== router || tx.value <= BigInt(0))
                  return;
              } else {
                const token = dep.token.toLowerCase();
                const arrived = receipt.logs.some((l) => {
                  if (l.address.toLowerCase() !== token) return false;
                  if (l.topics[0]?.toLowerCase() !== TRANSFER_TOPIC)
                    return false;
                  const to = l.topics[2];
                  if (!to || `0x${to.slice(-40)}`.toLowerCase() !== router)
                    return false;
                  try {
                    return BigInt(l.data) > BigInt(0);
                  } catch {
                    return false;
                  }
                });
                if (!arrived) return;
              }
            } catch {
              // Keep on RPC failure; checked again at refund time.
            }
            candidateDeposits.push(t);
          })
        );

        const stuck: {
          chainId: number;
          chainName: string;
          routingAddress: string;
          token: `0x${string}`;
          tokenSymbol: string;
          amountFormatted: string;
          txHash: string;
          blockNumber: string;
        }[] = [];

        // Custody test per record: the router holds one aggregate balance per
        // (chain, token), so attribute it newest-first against each record's
        // own API amount. A record whose funds already left (bridged, or never
        // arrived) doesn't fit the balance and is dropped. Solvers consume
        // oldest first, so the newest records are the ones still held.
        const byHolding = new Map<string, typeof candidateDeposits>();
        for (const t of candidateDeposits) {
          const key = `${
            t.deposit.deposit.chainId
          }-${t.deposit.deposit.token.toLowerCase()}-${t.routingAddress.toLowerCase()}`;
          const list = byHolding.get(key) || [];
          list.push(t);
          byHolding.set(key, list);
        }
        await Promise.all(
          [...byHolding.values()].map(async (group) => {
            const first = group[0].deposit.deposit;
            const isEth = isNativeToken(first.token);
            const chainName = chainNameFor(first.chainId);
            const client = publicClientFor(first.chainId);
            const routingAddress = group[0].routingAddress as `0x${string}`;
            const decimals = isEth ? 18 : 6;

            let holding = BigInt(0);
            try {
              holding = isEth
                ? await client.getBalance({ address: routingAddress })
                : await client.readContract({
                    address: first.token as `0x${string}`,
                    abi: erc20Abi,
                    functionName: 'balanceOf',
                    args: [routingAddress],
                  });
            } catch {
              return;
            }
            if (holding <= BigInt(0)) return;

            const newestFirst = [...group].sort(
              (x, y) =>
                Number(BigInt(y.deposit.deposit.blockNumber)) -
                Number(BigInt(x.deposit.deposit.blockNumber))
            );
            let attributed = BigInt(0);
            for (const { deposit: d } of newestFirst) {
              let raw = BigInt(0);
              try {
                raw = BigInt(d.deposit.amount);
              } catch {
                continue;
              }
              if (raw <= BigInt(0)) continue;
              // Dust tolerance: API amounts can round a hair above holdings.
              if (
                attributed + raw >
                holding + holding / BigInt(1000) + BigInt(1)
              )
                continue;
              attributed += raw;
              stuck.push({
                chainId: d.deposit.chainId,
                chainName,
                routingAddress: group[0].routingAddress,
                token: d.deposit.token as `0x${string}`,
                tokenSymbol: isEth ? 'ETH' : 'USDC',
                amountFormatted: Number(formatUnits(raw, decimals)).toFixed(
                  isEth ? 6 : 2
                ),
                txHash: d.deposit.transactionHash,
                blockNumber: d.deposit.blockNumber,
              });
            }
          })
        );

        if (!isMounted) return;
        setUnbridgedDeposits(stuck);
        setStuckState(stuck.length ? 'ready' : 'empty');
        if (stuck.length) void buildRefundPlan(stuck);
      } catch (err) {
        console.warn('Check stuck deposits note:', err);
        if (!isMounted) return;
        setStuckState('error');
      }
    };
    checkStuck();
    return () => {
      isMounted = false;
    };
  }, [
    address,
    inView,
    stuckNonce,
    smartRouting.smartRoutingAddress,
    smartRouting.smartRoutingAddresses,
  ]);

  // Withdraw calls for already-proven rows. Nothing executes here.
  const buildRefundPlan = async (deposits: typeof unbridgedDeposits) => {
    if (!smartRouting.isRoutingConfigured || !deposits.length) return;
    if (recoveringRef.current) return;
    recoveringRef.current = true;
    try {
      setIsRecovering(true);

      // Group tokens by the routing address that holds them.
      const byAddr = new Map<
        string,
        { chainId: number; token: `0x${string}` }[]
      >();
      for (const d of deposits) {
        const list = byAddr.get(d.routingAddress) || [];
        if (
          !list.some(
            (t) =>
              t.chainId === d.chainId &&
              t.token.toLowerCase() === d.token.toLowerCase()
          )
        )
          list.push({ chainId: d.chainId, token: d.token });
        byAddr.set(d.routingAddress, list);
      }

      // 2. Query withdrawal calls per routing address.
      const plan: {
        routingAddress: string;
        chainId: number;
        chainName: string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        calls: any[];
      }[] = [];
      for (const [addr, tokens] of byAddr) {
        const refundCallsRes = await getRefundCalls(addr, tokens);
        for (const item of refundCallsRes?.data || []) {
          plan.push({
            routingAddress: addr,
            chainId: item.chainId,
            chainName: chainNameFor(item.chainId),
            calls: item.calls,
          });
        }
      }
      if (!plan.length) {
        toast.info('No withdrawal calls returned by router.');
        return;
      }
      setRefundStatus({});
      setPendingRefund(plan);
    } catch (err: unknown) {
      const e = err as Error;
      console.error('[handleRecoverUnbridged error]:', e);
      toast.error(e?.message || 'Failed to refund unbridged deposits');
    } finally {
      recoveringRef.current = false;
      setIsRecovering(false);
    }
  };

  // Step 2: run one reviewed plan item. Each item is its own op with its
  // own approval + signature, so chains succeed or fail independently.
  const executeRefund = async (item: {
    routingAddress: string;
    chainId: number;
    chainName: string;
    calls: any[];
  }) => {
    if (recoveringRef.current) return;
    recoveringRef.current = true;
    try {
      setIsRecovering(true);
      const store = await (connector as any)?.getStore?.();
      {
        toast.info(`Submitting refund on ${item.chainName}...`);

        const formattedCalls: {
          to: `0x${string}`;
          data: `0x${string}`;
          value: bigint;
          skip?: boolean;
        }[] = item.calls.map((c: any) => ({
          to: c.to as `0x${string}`,
          data: (c.data || '0x') as `0x${string}`,
          value: typeof c.value === 'bigint' ? c.value : BigInt(c.value || 0),
        }));

        // Clamp router withdrawals to actual on-chain holdings. The server
        // derives amounts from its deposit records, which can exceed what the
        // router holds (stale records, rounding) — withdrawing even 1 unit
        // more reverts the whole call.
        for (const fc of formattedCalls) {
          if (
            fc.to.toLowerCase() !== item.routingAddress.toLowerCase() ||
            !fc.data.startsWith('0xf3fef3a3') ||
            fc.data.length < 138
          )
            continue;
          try {
            const client = publicClientFor(item.chainId);
            const token = `0x${fc.data.slice(34, 74)}` as `0x${string}`;
            const asked = BigInt(`0x${fc.data.slice(74, 138)}`);
            const holding = isNativeToken(token)
              ? await client.getBalance({ address: fc.to })
              : await client.readContract({
                  address: token,
                  abi: erc20Abi,
                  functionName: 'balanceOf',
                  args: [fc.to],
                });
            if (asked > holding) {
              if (holding <= BigInt(0)) {
                fc.skip = true;
                continue;
              }
              fc.data = `0xf3fef3a3${fc.data.slice(10, 74)}${holding
                .toString(16)
                .padStart(64, '0')}` as `0x${string}`;
              toast.info(
                `Adjusted refund to actual router holding on ${item.chainName}.`
              );
            }
          } catch {
            // Unreadable holdings: send the call as-is.
          }
        }

        // Dedupe identical calls: the server can return the same withdraw
        // twice, and the second execution drains an empty pool (TransferFailed).
        const seen = new Set<string>();
        const liveCalls = formattedCalls.filter((fc: any) => {
          if (fc.skip) return false;
          const key = `${fc.to.toLowerCase()}-${fc.data.toLowerCase()}-${String(
            fc.value
          )}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        if (!liveCalls.length) {
          toast.info(
            `Nothing left to withdraw on ${item.chainName}; skipping.`
          );
          setRefundStatus((prev) => ({
            ...prev,
            [item.chainId]: { state: 'ok' },
          }));
          setPendingRefund((prev) =>
            prev.filter((p) => p.chainId !== item.chainId)
          );
          recoveringRef.current = false;
          setIsRecovering(false);
          return;
        }
        const kClient = await getOrInitKernelClient(store, item.chainId);
        if (!kClient) {
          throw new Error(
            `Smart account unavailable for chain ${item.chainName} (${item.chainId})`
          );
        }
        // One approval per call, one op per call: what the user reviews is
        // exactly what gets signed and executed. Never batch behind one
        // preview.
        const hashes: string[] = [];
        for (let i = 0; i < liveCalls.length; i++) {
          const call = liveCalls[i];
          const label =
            liveCalls.length > 1
              ? `Refund ${i + 1} of ${liveCalls.length} on ${
                  item.chainName
                } to your smart account`
              : `Refund on ${item.chainName} to your smart account`;
          await new Promise<void>((resolve, reject) => {
            window.dispatchEvent(
              new CustomEvent('zerodev-request-approval', {
                detail: {
                  type: 'transaction',
                  keepOpen: true,
                  tx: {
                    to: call.to,
                    value: call.value ?? BigInt(0),
                    data: call.data ?? '0x',
                    chainId: item.chainId,
                  },
                  message: label,
                  resolve,
                  reject,
                },
              })
            );
          });
          const hash = (await (kClient as any).sendTransaction({
            calls: [call],
          })) as string;
          hashes.push(hash);
        }
        const txHash = hashes[hashes.length - 1];

        console.log(
          `[Refund] Refunded on chain ${item.chainId}, hash:`,
          txHash
        );
        toast.success(`Successfully refunded on ${item.chainName}!`);
        setRefundStatus((prev) => ({
          ...prev,
          [item.chainId]: { state: 'ok' },
        }));
      }
      setPendingRefund((prev) => {
        const rest = prev.filter((p) => p.chainId !== item.chainId);
        if (!rest.length) {
          setUnbridgedDeposits([]);
          anychain.refetch();
        }
        return rest;
      });
    } catch (err: unknown) {
      const e = err as Error;
      // Cancel (reject) backs out quietly; real errors surface.
      if (e?.message === 'User rejected the transaction') return;
      console.error('[executeRefund error]:', e);
      toast.error(e?.message || `Failed to refund on ${item.chainName}`);
      setRefundStatus((prev) => ({
        ...prev,
        [item.chainId]: {
          state: 'error',
          message: e?.message || 'Failed to refund',
        },
      }));
    } finally {
      recoveringRef.current = false;
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
                    ? `${anychain.totalCombinedEthFormatted} ETH`
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

        {/* Routing unavailable: project ID missing */}
        {!smartRouting.isRoutingConfigured && (
          <div className='p-4 rounded-2xl bg-red-500/10 border border-red-500/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'>
            <p className='text-[11px] text-red-300 leading-relaxed font-sans'>
              Routing unavailable: the ZeroDev project ID is not configured.
              Balances still show, but sends and recovery are disabled.
            </p>
          </div>
        )}

        {/* Unbridged deposits: checks only once this card scrolls into view. */}
        <div
          ref={cardRef}
          className='p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
        >
          <div className='text-xs font-bold text-white font-sans'>
            Unbridged Deposits
          </div>
          <p className='text-[11px] text-white/70 mt-1.5 leading-relaxed font-sans'>
            Deposits below route minimums sit in the routing contract until you
            pull them back to your smart account.
          </p>
          {(stuckState === 'idle' || stuckState === 'checking') && (
            <div className='flex items-center gap-2 py-2 text-[11px] text-white/50 font-sans'>
              <Loader2 size={13} className='animate-spin' />
              <span>Checking routing contract...</span>
            </div>
          )}
          {stuckState === 'error' && (
            <div className='space-y-2'>
              <p className='text-[11px] text-amber-300 leading-relaxed font-sans'>
                Couldn't check for unbridged deposits. Check your connection and
                try again.
              </p>
              <button
                type='button'
                onClick={() => setStuckNonce((n) => n + 1)}
                className='rounded-full border border-white/20 bg-white/5 hover:bg-white/10 text-white font-semibold text-xs py-1.5 px-4 transition active:scale-[0.99] font-sans'
              >
                Try again
              </button>
            </div>
          )}
          {stuckState === 'empty' && (
            <p className='text-[11px] text-white/50 leading-relaxed font-sans'>
              Nothing unbridged. Every deposit met its route minimum.
            </p>
          )}
          {stuckState === 'ready' && (
            <div className='divide-y divide-white/5'>
              {Object.entries(
                unbridgedDeposits.reduce<
                  Record<number, typeof unbridgedDeposits>
                >((groups, d) => {
                  (groups[d.chainId] = groups[d.chainId] || []).push(d);
                  return groups;
                }, {})
              ).map(([chainId, deposits]) => {
                const id = Number(chainId);
                const plan = pendingRefund.find((p) => p.chainId === id);
                const status = refundStatus[id];
                return (
                  <div
                    key={chainId}
                    className='flex items-center justify-between gap-2 py-1.5'
                  >
                    <div>
                      <div className='text-[11px] font-medium text-white font-sans'>
                        {deposits[0].chainName}
                      </div>
                      {deposits.map((d, i) => (
                        <div
                          key={`${d.token}-${i}`}
                          className='text-[11px] font-mono text-white/50'
                        >
                          {d.amountFormatted} {d.tokenSymbol}
                        </div>
                      ))}
                    </div>
                    {status?.state === 'ok' ? (
                      <span className='text-[11px] text-emerald-400 font-semibold font-sans'>
                        Refunded
                      </span>
                    ) : plan ? (
                      <button
                        type='button'
                        onClick={() => executeRefund(plan)}
                        disabled={
                          isRecovering || !smartRouting.isRoutingConfigured
                        }
                        className='flex items-center gap-1 rounded-full bg-amber-500 hover:bg-amber-600 text-black font-sans font-semibold text-[11px] py-1 px-3 transition active:scale-[0.99] disabled:opacity-50'
                      >
                        {isRecovering ? (
                          <Loader2 size={11} className='animate-spin' />
                        ) : null}
                        <span>
                          {status?.state === 'error' ? 'Retry' : 'Confirm'}
                        </span>
                      </button>
                    ) : (
                      <Loader2
                        size={13}
                        className='animate-spin text-white/30'
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
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
