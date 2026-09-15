'use client';

import React, { useEffect, useState } from 'react';
import { useAccount, useDisconnect, useSwitchChain } from 'wagmi';
import { toast } from 'react-toastify';
import {
  SheetHeader,
  SheetTitle,
  SheetContent,
  SheetFooter,
  SheetClose,
} from '@/components/ui/Sheet';
import { CopyDoneIcon, CopyIcon } from '@/components/global/Icons';
import {
  AlertCircle,
  ChevronRight,
  Eye,
  EyeOff,
  Loader2,
  LogOut,
  Send,
  X,
  Zap,
} from 'lucide-react';
import { SUPPORTED_CHAINS } from '../types';
import TurnkeyExportCard from '../TurnkeyExportCard';
import { useAnychainBalances } from '@/hooks/useAnychainBalances';

interface AuthAccountViewProps {
  onClose: () => void;
  onOpenAnychain: () => void;
  onOpenSend: () => void;
  openChainModal?: () => void;
  anychain: ReturnType<typeof useAnychainBalances>;
}

export default function AuthAccountView({
  onClose,
  onOpenAnychain,
  onOpenSend,
  openChainModal,
  anychain,
}: AuthAccountViewProps) {
  const { address, chain } = useAccount();
  const {
    switchChain,
    switchChainAsync,
    isPending: isSwitchPending,
    variables: switchVariables,
  } = useSwitchChain();
  const { disconnect } = useDisconnect();

  const [copied, setCopied] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  // Real loading state from wagmi: target chain id while a switch is in flight.
  const switchingChainId: number | null = isSwitchPending
    ? switchVariables?.chainId ?? null
    : null;
  const [showSwitchLoader, setShowSwitchLoader] = useState(false);

  // Only show the spinner if the switch is slow (>400ms).
  // Fast switches go dot -> dot with no blink in between.
  useEffect(() => {
    if (switchingChainId === null) {
      setShowSwitchLoader(false);
      return;
    }
    const t = setTimeout(() => setShowSwitchLoader(true), 400);
    return () => clearTimeout(t);
  }, [switchingChainId]);

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success('Address copied');
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handleSwitchChain = async (chainId: number) => {
    if (chain?.id === chainId || isSwitchPending) return;
    if (!switchChainAsync && !switchChain) {
      try {
        if (openChainModal) {
          onClose();
          openChainModal();
        }
      } catch (err: unknown) {
        const e = err as { message?: string };
        const msg = e?.message || 'Failed to switch network';
        setAuthError(msg);
        toast.error(msg);
      }
      return;
    }
    try {
      if (switchChainAsync) {
        await switchChainAsync({ chainId });
      } else {
        switchChain({ chainId });
      }
    } catch {
      // user rejected or switch failed: wagmi clears isPending, dot stays put
    }
  };

  const handleDisconnect = () => {
    disconnect();
    toast.info('Disconnected');
    onClose();
  };

  return (
    <>
      <SheetHeader className='pb-5'>
        <div className='flex items-start justify-between w-full'>
          <div>
            <SheetTitle className='text-lg font-bold text-white tracking-tight normal-case'>
              Account
            </SheetTitle>
          </div>
          <SheetClose onClick={onClose} />
        </div>
      </SheetHeader>

      <SheetContent className='space-y-4 pt-5'>
        {authError && (
          <div className='p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-2.5 text-xs text-red-400 normal-case leading-relaxed'>
            <AlertCircle size={16} className='shrink-0 mt-0.5 text-red-400' />
            <div className='flex-1 break-words font-sans'>{authError}</div>
            <button
              type='button'
              onClick={() => setAuthError(null)}
              className='text-red-400/60 hover:text-red-400 p-0.5 rounded transition-colors'
              aria-label='Dismiss error'
            >
              <X size={13} />
            </button>
          </div>
        )}

        {/* Balance hero */}
        <div className='p-5 rounded-2xl bg-white/[0.04] border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'>
          <div className='flex items-center gap-1'>
            <span className='text-[11px] text-white/50 normal-case'>
              Total balance
            </span>
            <button
              type='button'
              onClick={() => anychain.toggleDisclose()}
              className='text-white/40 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors shrink-0'
              title={anychain.isDisclosed ? 'Hide balances' : 'Show balances'}
              aria-label={
                anychain.isDisclosed ? 'Hide balances' : 'Show balances'
              }
            >
              {anychain.isDisclosed ? <Eye size={12} /> : <EyeOff size={12} />}
            </button>
          </div>
          {(() => {
            const combined = anychain.anychainEnabled;
            const current = anychain.chainList.find((c) => c.isCurrent);
            const heroAmount = combined
              ? `${anychain.totalCombinedEthFormatted} ETH`
              : `${current?.formatted ?? '0.0000'} ETH`;
            const heroCaption = combined
              ? `Combined across ${SUPPORTED_CHAINS.map((c) => c.name).join(
                  ', '
                )}`
              : (current?.name ?? 'Current chain') + ' balance';
            return (
              <>
                <div className='text-3xl text-white font-mono font-semibold tracking-tight tabular-nums mt-1.5'>
                  <span
                    className={
                      anychain.isDisclosed ? undefined : 'blur-sm select-none'
                    }
                  >
                    {heroAmount}
                  </span>
                </div>
                <div className='text-[11px] text-white/50 mt-1.5 normal-case'>
                  {heroCaption}
                </div>
              </>
            );
          })()}
        </div>

        {/* Identity + network */}
        <div className='p-4 rounded-2xl bg-white/[0.04] border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'>
          <div className='flex items-center justify-between'>
            <div className='text-xs text-white font-mono font-medium normal-case'>
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </div>
            <button
              type='button'
              onClick={handleCopy}
              className='text-white/60 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors'
              aria-label='Copy address'
            >
              {copied ? <CopyDoneIcon size={16} /> : <CopyIcon size={16} />}
            </button>
          </div>

          <div className='grid grid-cols-2 gap-2 mt-4'>
            {SUPPORTED_CHAINS.map(({ id, name, Icon }, idx) => {
              const isSwitching = switchingChainId === id;
              const isCurrent = switchingChainId === null && chain?.id === id;
              return (
                <button
                  key={id}
                  onClick={() => handleSwitchChain(id)}
                  disabled={switchingChainId !== null}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-full text-xs border transition-all normal-case disabled:opacity-70 ${
                    idx === SUPPORTED_CHAINS.length - 1 ? 'col-span-2' : ''
                  } ${
                    isCurrent || isSwitching
                      ? 'bg-white/15 border-white/35 text-white font-semibold shadow-sm'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/70 hover:text-white'
                  }`}
                >
                  <Icon size={16} />
                  <span>{name}</span>
                  {isSwitching && showSwitchLoader ? (
                    <Loader2
                      size={12}
                      className='ml-auto animate-spin text-white/70'
                    />
                  ) : (
                    isCurrent && (
                      <span className='ml-auto w-1.5 h-1.5 rounded-full bg-green-400' />
                    )
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className='rounded-2xl bg-white/[0.04] border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] divide-y divide-white/5'>
          <button
            type='button'
            onClick={onOpenSend}
            className='w-full flex items-center gap-3 p-3.5 text-left hover:bg-white/5 transition-colors rounded-t-2xl normal-case'
          >
            <span className='w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0'>
              <Send size={15} className='text-white/70' />
            </span>
            <span className='flex-1 min-w-0'>
              <span className='block text-xs font-semibold text-white'>
                Manage Tokens
              </span>
              <span className='block text-[11px] text-white/50 mt-0.5'>
                Send to any wallet
              </span>
            </span>
            <ChevronRight size={14} className='text-white/40 shrink-0' />
          </button>
          <button
            type='button'
            onClick={onOpenAnychain}
            className='w-full flex items-center gap-3 p-3.5 text-left hover:bg-white/5 transition-colors rounded-b-2xl normal-case'
          >
            <span className='w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0'>
              <Zap
                size={15}
                className={
                  anychain.anychainEnabled ? 'text-amber-400' : 'text-white/50'
                }
              />
            </span>
            <span className='flex-1 min-w-0'>
              <span className='block text-xs font-semibold text-white'>
                Anychain Router
              </span>
              <span className='block text-[11px] text-white/50 mt-0.5'>
                Spend from every chain
              </span>
            </span>
            {anychain.anychainEnabled ? (
              <span className='text-[11px] font-medium text-emerald-400 shrink-0'>
                On
              </span>
            ) : (
              <span className='text-[11px] text-white/40 shrink-0'>Off</span>
            )}
            <ChevronRight size={14} className='text-white/40 shrink-0' />
          </button>
        </div>

        {address && (
          <TurnkeyExportCard
            address={address}
            containerId='turnkey-export-container-account'
          />
        )}
      </SheetContent>

      <SheetFooter className='gap-2.5 pt-4'>
        <button
          onClick={handleDisconnect}
          className='flex-1 flex items-center justify-center gap-1.5 rounded-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-semibold text-xs py-2.5 px-4 transition active:scale-[0.99] normal-case'
        >
          <LogOut size={14} />
          <span>Disconnect</span>
        </button>
      </SheetFooter>
    </>
  );
}
