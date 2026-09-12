'use client';

import React, { useState } from 'react';
import { useAccount, useDisconnect, useSwitchChain } from 'wagmi';
import { toast } from 'react-toastify';
import {
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetContent,
  SheetFooter,
  SheetClose,
} from '@/components/ui/Sheet';
import { CopyDoneIcon, CopyIcon } from '@/components/global/Icons';
import { AlertCircle, ChevronRight, LogOut, X } from 'lucide-react';
import { SUPPORTED_CHAINS } from '../types';

interface AuthAccountViewProps {
  onClose: () => void;
  onOpenAnychain: () => void;
  openRainbowKitModal?: () => void;
  openChainModal?: () => void;
  anychain: {
    anychainEnabled: boolean;
    isDisclosed: boolean;
    totalEthFormatted: string;
  };
}

export default function AuthAccountView({
  onClose,
  onOpenAnychain,
  openRainbowKitModal,
  openChainModal,
  anychain,
}: AuthAccountViewProps) {
  const { address, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const { disconnect } = useDisconnect();

  const [copied, setCopied] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success('Address copied');
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handleSwitchChain = async (chainId: number) => {
    try {
      if (openChainModal) {
        onClose();
        openChainModal();
        return;
      }
      if (switchChain) {
        switchChain({ chainId });
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      const msg = e?.message || 'Failed to switch network';
      setAuthError(msg);
      toast.error(msg);
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
            <SheetDescription className='text-xs text-white/50 mt-1 font-normal normal-case'>
              Manage your smart account and network
            </SheetDescription>
          </div>
          <SheetClose onClick={onClose} />
        </div>
      </SheetHeader>

      <SheetContent className='space-y-6 pt-5'>
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

        {/* Address Card */}
        <div className='p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'>
          <div className='flex items-center gap-3'>
            <div className='w-9 h-9 rounded-full bg-gradient-to-tr from-[#f15e5f]/30 to-[#2a81d5]/30 border border-white/15 flex items-center justify-center text-white font-bold text-xs'>
              {address ? address.slice(2, 4).toUpperCase() : '0X'}
            </div>
            <div>
              <div className='text-[10px] text-white/40 uppercase tracking-wider font-semibold'>
                Smart Account
              </div>
              <div className='text-xs text-white font-mono font-medium normal-case'>
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </div>
            </div>
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

        {/* Network Switcher */}
        <div>
          <div className='text-[11px] uppercase tracking-wider text-white/50 font-semibold mb-2.5'>
            Network
          </div>
          <div className='grid grid-cols-2 gap-2'>
            {SUPPORTED_CHAINS.map(({ id, name, Icon }) => {
              const isCurrent = chain?.id === id;
              return (
                <button
                  key={id}
                  onClick={() => handleSwitchChain(id)}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-full text-xs border transition-all normal-case ${
                    isCurrent
                      ? 'bg-white/15 border-white/35 text-white font-semibold shadow-sm'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/70 hover:text-white'
                  }`}
                >
                  <Icon size={16} />
                  <span>{name}</span>
                  {isCurrent && (
                    <span className='ml-auto w-1.5 h-1.5 rounded-full bg-green-400' />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Anychain Smart Routing Card */}
        <div className='p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-1.5'>
              <span className='text-amber-400 text-sm'>⚡</span>
              <span className='text-xs font-bold text-white tracking-tight normal-case'>
                Anychain Smart Routing
              </span>
            </div>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                anychain.anychainEnabled
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-white/5 text-white/40 border-white/10'
              }`}
            >
              {anychain.anychainEnabled ? 'Active' : 'Disabled'}
            </span>
          </div>

          <div className='flex items-center justify-between pt-1'>
            <div>
              <div className='text-[10px] text-white/40 uppercase tracking-wider font-semibold'>
                Multi-Chain Portfolio
              </div>
              <div className='text-xs text-white font-mono font-medium'>
                {anychain.isDisclosed
                  ? `${anychain.totalEthFormatted} ETH across chains`
                  : '•••• ETH across chains'}
              </div>
            </div>
            <button
              type='button'
              onClick={onOpenAnychain}
              className='text-[11px] font-semibold text-[#f15e5f] hover:text-[#ff7576] flex items-center gap-1 transition-colors normal-case'
            >
              <span>Anychain Details</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </SheetContent>

      <SheetFooter className='gap-2.5 pt-4'>
        <button
          onClick={handleDisconnect}
          className='flex-1 flex items-center justify-center gap-1.5 rounded-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-semibold text-xs py-2.5 px-4 transition active:scale-[0.99] normal-case'
        >
          <LogOut size={14} />
          <span>Disconnect</span>
        </button>
        {openRainbowKitModal && (
          <button
            onClick={() => {
              onClose();
              openRainbowKitModal();
            }}
            className='rounded-full bg-white/5 hover:bg-white/10 border border-white/20 text-white/80 hover:text-white font-semibold text-xs py-2.5 px-5 transition active:scale-[0.99] normal-case'
          >
            Details
          </button>
        )}
      </SheetFooter>
    </>
  );
}
