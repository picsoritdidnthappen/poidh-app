'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import { toast } from 'react-toastify';
import {
  encodeFunctionData,
  erc20Abi,
  formatUnits,
  isAddress,
  parseEther,
  parseUnits,
} from 'viem';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import {
  SheetHeader,
  SheetTitle,
  SheetContent,
  SheetClose,
} from '@/components/ui/Sheet';
import { useAnychainBalances } from '@/hooks/useAnychainBalances';
import { SUPPORTED_CHAINS } from '../types';
import { getOrInitKernelClient } from '../kernelClient';
import {
  arbitrumPublicClient,
  basePublicClient,
  mainnetPublicClient,
} from '@/utils/publicClients';

const getPublicClientForChain = (targetChainId: number) => {
  if (targetChainId === basePublicClient.chain.id) return basePublicClient;
  if (targetChainId === mainnetPublicClient.chain.id)
    return mainnetPublicClient;
  return arbitrumPublicClient;
};

interface SendFundsViewProps {
  anychain: ReturnType<typeof useAnychainBalances>;
  onClose: () => void;
  onBack: () => void;
}

export default function SendFundsView({
  anychain,
  onClose,
  onBack,
}: SendFundsViewProps) {
  const { connector, chain } = useAccount();
  const [chainId, setChainId] = useState<number>(chain?.id ?? 42161);
  const [tokenKey, setTokenKey] = useState<string>('native');
  const [tokenOpen, setTokenOpen] = useState(false);
  const [netOpen, setNetOpen] = useState(false);
  const [customAddress, setCustomAddress] = useState('');
  const [customDecimals, setCustomDecimals] = useState<number | null>(null);
  const [customBalance, setCustomBalance] = useState<bigint | null>(null);
  const [customLoading, setCustomLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState<{
    amount: string;
    symbol: string;
    hash: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeChain = useMemo(
    () =>
      anychain.chainList.find((c) => c.chainId === chainId) ??
      anychain.chainList[0],
    [anychain.chainList, chainId]
  );

  useEffect(() => {
    setTokenKey('native');
    setCustomAddress('');
    setCustomDecimals(null);
    setCustomBalance(null);
    setAmount('');
    setError(null);
    setTokenOpen(false);
    setNetOpen(false);
  }, [chainId]);

  useEffect(() => {
    if (tokenKey !== 'custom' || !isAddress(customAddress)) {
      setCustomDecimals(null);
      setCustomBalance(null);
      return;
    }
    let cancelled = false;
    setCustomLoading(true);
    (async () => {
      try {
        const client = getPublicClientForChain(chainId);
        const [decimals, balance] = await Promise.all([
          client.readContract({
            address: customAddress as `0x${string}`,
            abi: erc20Abi,
            functionName: 'decimals',
          }),
          anychain.address
            ? client.readContract({
                address: customAddress as `0x${string}`,
                abi: erc20Abi,
                functionName: 'balanceOf',
                args: [anychain.address],
              })
            : Promise.resolve(BigInt(0)),
        ]);
        if (!cancelled) {
          setCustomDecimals(Number(decimals));
          setCustomBalance(balance as bigint);
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setCustomDecimals(null);
          setCustomBalance(null);
          setError('Could not read that token contract on this chain.');
        }
      } finally {
        if (!cancelled) setCustomLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tokenKey, customAddress, chainId, anychain.address]);

  const selectedToken = useMemo(() => {
    if (!activeChain) return null;
    if (tokenKey === 'native') {
      return {
        symbol: activeChain.symbol,
        decimals: 18,
        raw: activeChain.raw,
        formatted: activeChain.formatted,
        address: null as `0x${string}` | null,
      };
    }
    if (tokenKey === 'custom') {
      if (customDecimals === null || customBalance === null) return null;
      return {
        symbol: 'Token',
        decimals: customDecimals,
        raw: customBalance,
        formatted: formatUnits(customBalance, customDecimals),
        address: customAddress as `0x${string}`,
      };
    }
    const t = activeChain.tokens.find((tok) => tok.address === tokenKey);
    if (!t) return null;
    return {
      symbol: t.symbol,
      decimals: t.decimals,
      raw: t.raw ?? BigInt(0),
      formatted: t.formatted ?? '0.00',
      address: t.address as `0x${string}`,
    };
  }, [activeChain, tokenKey, customDecimals, customBalance, customAddress]);

  const handleMax = () => {
    if (selectedToken) setAmount(selectedToken.formatted);
  };

  const handleSend = async () => {
    setError(null);
    setSent(null);
    if (!selectedToken || !activeChain) return;
    if (!isAddress(recipient)) {
      setError('Enter a valid recipient address.');
      return;
    }
    let value: bigint;
    try {
      value =
        selectedToken.address === null
          ? parseEther(amount || '0')
          : parseUnits(amount || '0', selectedToken.decimals);
    } catch {
      setError('Enter a valid amount.');
      return;
    }
    if (value <= BigInt(0)) {
      setError('Enter an amount greater than zero.');
      return;
    }
    if (value > selectedToken.raw) {
      setError(
        `Insufficient ${selectedToken.symbol} balance on ${activeChain.name}.`
      );
      return;
    }
    setIsSending(true);
    try {
      const store = await (connector as any)?.getStore?.();
      let kernelClient = null;
      try {
        kernelClient =
          (await getOrInitKernelClient(store, activeChain.chainId)) ||
          store?.getState?.()?.kernelClients?.get(activeChain.chainId);
      } catch {
        kernelClient = null;
      }
      const to = recipient as `0x${string}`;
      const tx =
        selectedToken.address === null
          ? { to, value, data: '0x' as `0x${string}` }
          : {
              to: selectedToken.address,
              value: BigInt(0),
              data: encodeFunctionData({
                abi: erc20Abi,
                functionName: 'transfer',
                args: [to, value],
              }),
            };
      // Route through the shared approval sheet (Confirm / Cancel) first.
      // Resolve means approved: only then do we actually send.
      await new Promise<void>((resolve, reject) => {
        window.dispatchEvent(
          new CustomEvent('zerodev-request-approval', {
            detail: {
              type: 'transaction',
              keepOpen: true,
              tx: {
                to: tx.to,
                value: tx.value,
                data: tx.data,
                chainId: activeChain.chainId,
              },
              resolve,
              reject,
            },
          })
        );
      });
      let hash: string;
      if (kernelClient) {
        hash = (await (kernelClient as any).sendTransaction({
          ...tx,
          calls: [{ to: tx.to, value: tx.value, data: tx.data }],
        })) as string;
      } else {
        // No smart account (e.g. MetaMask EOA): send directly from the
        // connected wallet. The approval sheet above already confirmed it.
        const provider = (await (connector as any)?.getProvider?.()) as any;
        if (!provider?.request) {
          throw new Error(
            `Smart account unavailable for ${activeChain.name} and no wallet provider found. Please reconnect.`
          );
        }
        const valueHex = `0x${tx.value.toString(16)}`;
        hash = (await provider.request({
          method: 'eth_sendTransaction',
          params: [
            {
              to: tx.to,
              value: valueHex,
              data: tx.data,
            },
          ],
        })) as string;
      }
      setSent({
        amount,
        symbol: selectedToken.symbol,
        hash,
      });
      setAmount('');
      setRecipient('');
      anychain.refetch();
    } catch (e: unknown) {
      const msg =
        (e as { message?: string })?.message || 'Failed to send funds.';
      // User hit Cancel on the approval sheet: back out quietly.
      if (/reject|cancel/i.test(msg)) {
        setError(null);
        return;
      }
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSending(false);
    }
  };

  if (!activeChain) return null;

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
              <span>Account</span>
            </button>
            <SheetTitle className='text-lg font-bold text-white tracking-tight normal-case'>
              Manage Tokens
            </SheetTitle>
          </div>
          <SheetClose onClick={onClose} />
        </div>
      </SheetHeader>

      <SheetContent className='space-y-3 pt-4'>
        {isSending ? (
          <div className='py-10 text-center'>
            <Loader2 size={28} className='mx-auto animate-spin text-white/70' />
            <div className='text-sm font-semibold text-white mt-4 normal-case'>
              Sending…
            </div>
            <div className='text-[11px] text-white/50 mt-1.5 normal-case'>
              Confirm with your passkey if prompted
            </div>
          </div>
        ) : sent ? (
          <div className='py-10 text-center'>
            <CheckCircle2 size={28} className='mx-auto text-emerald-400' />
            <div className='text-sm font-semibold text-white mt-4 normal-case'>
              Sent
            </div>
            <div className='text-[11px] font-mono text-white/50 mt-1.5 tabular-nums'>
              {`${sent.amount} ${sent.symbol} (${sent.hash.slice(0, 8)}...)`}
            </div>
            <button
              type='button'
              onClick={() => setSent(null)}
              className='mt-5 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 text-white font-semibold text-xs px-5 py-2.5 transition active:scale-[0.99] normal-case'
            >
              Send another
            </button>
          </div>
        ) : (
          <>
            {/* Amount hero */}
            <div className='pt-3 pb-2 text-center'>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder='0.00'
                inputMode='decimal'
                aria-label='Amount'
                className='w-full bg-transparent outline-none text-center text-4xl font-mono font-semibold text-white placeholder:text-white/25 tabular-nums'
              />
              <div className='flex items-center justify-center gap-1.5 mt-2 text-[11px] text-white/50 normal-case'>
                <span>
                  {`Balance: ${selectedToken?.formatted ?? '—'} ${
                    selectedToken?.symbol ?? ''
                  }`}
                </span>
                <span aria-hidden='true'>·</span>
                <button
                  type='button'
                  onClick={handleMax}
                  className='font-semibold text-white hover:underline transition normal-case'
                >
                  Max
                </button>
              </div>
            </div>

            {/* Route pickers */}
            <div className='flex gap-2'>
              <button
                type='button'
                onClick={() => {
                  setTokenOpen((v) => !v);
                  setNetOpen(false);
                }}
                className='flex flex-1 items-center justify-center gap-1.5 rounded-full bg-white/5 border border-white/20 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-white/10 normal-case'
              >
                <span>
                  {selectedToken
                    ? selectedToken.symbol
                    : tokenKey === 'custom'
                    ? 'Custom'
                    : 'Token'}
                </span>
                <ChevronDown
                  size={14}
                  className={`text-white/40 shrink-0 transition-transform ${
                    tokenOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <button
                type='button'
                onClick={() => {
                  setNetOpen((v) => !v);
                  setTokenOpen(false);
                }}
                className='flex flex-1 items-center justify-center gap-1.5 rounded-full bg-white/5 border border-white/20 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-white/10 normal-case'
              >
                {(() => {
                  const Icon = SUPPORTED_CHAINS.find(
                    (s) => s.id === chainId
                  )?.Icon;
                  return Icon ? <Icon size={15} /> : null;
                })()}
                <span>{activeChain.name}</span>
                <ChevronDown
                  size={14}
                  className={`text-white/40 shrink-0 transition-transform ${
                    netOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </div>

            {tokenOpen && (
              <div className='rounded-3xl bg-white/[0.04] border border-white/10 p-2'>
                <button
                  type='button'
                  onClick={() => {
                    setTokenKey('native');
                    setTokenOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-left transition-colors normal-case ${
                    tokenKey === 'native' ? 'bg-white/10' : 'hover:bg-white/5'
                  }`}
                >
                  <span className='flex-1 text-xs font-semibold text-white'>
                    {activeChain.symbol}
                  </span>
                  <span className='text-[11px] font-mono text-white/50 tabular-nums'>
                    {activeChain.formatted}
                  </span>
                  {tokenKey === 'native' && (
                    <span className='w-1.5 h-1.5 rounded-full bg-green-400 shrink-0' />
                  )}
                </button>
                {activeChain.tokens.map((t) => (
                  <button
                    key={t.address}
                    type='button'
                    onClick={() => {
                      setTokenKey(t.address);
                      setTokenOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-left transition-colors normal-case ${
                      tokenKey === t.address
                        ? 'bg-white/10'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <span className='flex-1 text-xs font-semibold text-white'>
                      {t.symbol}
                    </span>
                    <span className='text-[11px] font-mono text-white/50 tabular-nums'>
                      {t.formatted ?? '0.00'}
                    </span>
                    {tokenKey === t.address && (
                      <span className='w-1.5 h-1.5 rounded-full bg-green-400 shrink-0' />
                    )}
                  </button>
                ))}
                <button
                  type='button'
                  onClick={() => {
                    setTokenKey('custom');
                    setTokenOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-left transition-colors normal-case ${
                    tokenKey === 'custom' ? 'bg-white/10' : 'hover:bg-white/5'
                  }`}
                >
                  <span className='flex-1 min-w-0'>
                    <span className='block text-xs font-semibold text-white'>
                      Custom token
                    </span>
                    <span className='block text-[11px] text-white/50 mt-0.5'>
                      Any contract address
                    </span>
                  </span>
                  {tokenKey === 'custom' && (
                    <span className='w-1.5 h-1.5 rounded-full bg-green-400 shrink-0' />
                  )}
                </button>
              </div>
            )}

            {netOpen && (
              <div className='rounded-3xl bg-white/[0.04] border border-white/10 p-2'>
                {anychain.chainList.map((c) => {
                  const isSelected = c.chainId === chainId;
                  const Icon = SUPPORTED_CHAINS.find(
                    (s) => s.id === c.chainId
                  )?.Icon;
                  return (
                    <button
                      key={c.chainId}
                      type='button'
                      onClick={() => {
                        setChainId(c.chainId);
                        setNetOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-left transition-colors normal-case ${
                        isSelected ? 'bg-white/10' : 'hover:bg-white/5'
                      }`}
                    >
                      {Icon && <Icon size={16} />}
                      <span className='flex-1 text-xs font-semibold text-white'>
                        {c.name}
                      </span>
                      {isSelected && (
                        <span className='w-1.5 h-1.5 rounded-full bg-green-400 shrink-0' />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {tokenKey === 'custom' && (
              <input
                value={customAddress}
                onChange={(e) => setCustomAddress(e.target.value.trim())}
                placeholder='Paste token contract address (0x...)'
                spellCheck={false}
                className='w-full bg-white/5 border border-white/20 rounded-full px-4 py-2.5 text-xs font-mono text-white/90 placeholder:text-white/30 outline-none focus:border-white/40 transition-colors'
              />
            )}

            <input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value.trim())}
              placeholder='Recipient address (0x...)'
              spellCheck={false}
              className='w-full bg-white/5 border border-white/20 rounded-full px-4 py-2.5 text-xs font-mono text-white/90 placeholder:text-white/30 outline-none focus:border-white/40 transition-colors'
            />

            {error && (
              <div className='p-3.5 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-start gap-2.5 text-xs text-red-400 normal-case leading-relaxed'>
                <AlertCircle
                  size={16}
                  className='shrink-0 mt-0.5 text-red-400'
                />
                <div className='flex-1 break-words font-sans'>{error}</div>
              </div>
            )}

            <button
              type='button'
              onClick={handleSend}
              disabled={isSending || customLoading || !selectedToken}
              className='w-full flex items-center justify-center gap-2 rounded-full bg-[#f15e5f] hover:bg-[#cf5d5d] text-white font-semibold text-sm px-4 py-2.5 transition active:scale-[0.99] disabled:opacity-50 shadow-sm normal-case'
            >
              {isSending ? (
                <>
                  <Loader2 size={16} className='animate-spin' />
                  <span>Sending...</span>
                </>
              ) : (
                <span>
                  Send{selectedToken ? ` ${selectedToken.symbol}` : ''}
                </span>
              )}
            </button>
          </>
        )}
      </SheetContent>
    </>
  );
}
