'use client';

import React, { useState } from 'react';
import { useExportPrivateKey, useExportWallet } from '@zerodev/wallet-react';
import { toast } from 'react-toastify';
import { AlertCircle, Fingerprint, KeyRound, Loader2, X } from 'lucide-react';

export interface TurnkeyExportCardProps {
  address?: string;
  containerId: string;
}

export default function TurnkeyExportCard({
  address,
  containerId,
}: TurnkeyExportCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeExport, setActiveExport] = useState<'key' | 'wallet' | null>(
    null
  );
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState(false);

  const { mutateAsync: exportPrivateKeyMutate } = useExportPrivateKey();
  const { mutateAsync: exportWalletMutate } = useExportWallet();

  const handleExport = async (type: 'key' | 'wallet') => {
    try {
      setIsExporting(true);
      setExportError(null);
      setExportSuccess(false);
      setActiveExport(type);
      setIsOpen(true);

      const container = document.getElementById(containerId);
      if (!container) {
        throw new Error('Export container element not found');
      }

      // Safely remove any previously injected iframes without touching React DOM
      const existingIframes = container.querySelectorAll('iframe');
      existingIframes.forEach((el) => el.remove());

      const iframeStyles = {
        backgroundColor: '#0c0c0e',
        color: '#f4f4f5',
        borderRadius: '12px',
        fontFamily: 'monospace',
        fontSize: '12px',
        padding: '14px',
        width: '100%',
      };

      if (type === 'key') {
        await exportPrivateKeyMutate({
          iframeContainerId: containerId,
          address: address ? (address as `0x${string}`) : undefined,
          keyFormat: 'Hexadecimal',
          iframeStyles,
        });
        setExportSuccess(true);
        toast.success('Private key decrypted via Turnkey');
      } else {
        await exportWalletMutate({
          iframeContainerId: containerId,
          iframeStyles,
        });
        setExportSuccess(true);
        toast.success('Seed phrase decrypted via Turnkey');
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      const msg =
        e?.message ||
        `Failed to export ${type === 'key' ? 'private key' : 'seed phrase'}`;
      setExportError(msg);
      toast.error(msg);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className='p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'>
      <div className='text-left'>
        <div className='text-xs font-bold text-white normal-case'>
          Turnkey Security & Key Export
        </div>
        <div className='text-[11px] text-white/50 mt-0.5 normal-case'>
          Export your raw private key or seed phrase from Turnkey's secure
          enclave to import into MetaMask, Rabby, or Coinbase Wallet.
        </div>
      </div>

      {/* Export Action Buttons */}
      <div className='flex items-center gap-2 pt-1'>
        <button
          type='button'
          onClick={() => handleExport('key')}
          disabled={isExporting}
          className='flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/10 transition active:scale-[0.98] disabled:opacity-50 normal-case shadow-sm'
        >
          {isExporting && activeExport === 'key' ? (
            <Loader2 size={13} className='animate-spin text-amber-400' />
          ) : (
            <KeyRound size={13} className='text-amber-400' />
          )}
          <span>Export Private Key</span>
        </button>

        <button
          type='button'
          onClick={() => handleExport('wallet')}
          disabled={isExporting}
          className='flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white font-medium text-xs border border-white/5 transition active:scale-[0.98] disabled:opacity-50 normal-case'
        >
          {isExporting && activeExport === 'wallet' ? (
            <Loader2 size={13} className='animate-spin text-blue-400' />
          ) : (
            <Fingerprint size={13} className='text-blue-400' />
          )}
          <span>Export Seed Phrase</span>
        </button>
      </div>

      {/* Error state */}
      {exportError && (
        <div className='p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2 text-[11px] text-red-400 leading-normal'>
          <AlertCircle size={14} className='shrink-0 mt-0.5 text-red-400' />
          <div className='flex-1 break-words font-sans'>{exportError}</div>
          <button
            type='button'
            onClick={() => setExportError(null)}
            className='text-red-400/60 hover:text-red-400 p-0.5 rounded transition-colors'
            aria-label='Dismiss export error'
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Loading state indicator outside the iframe container */}
      {isExporting && (
        <div className='flex items-center justify-center gap-2 text-xs text-white/70 py-3 bg-black/40 rounded-xl border border-white/10 font-sans'>
          <Loader2 size={14} className='animate-spin text-amber-400' />
          <span>Turnkey WebAuthn prompt... check your device</span>
        </div>
      )}

      {/* Decrypted Display Container */}
      <div
        className={`mt-2 space-y-2 pt-2 border-t border-white/10 ${
          isOpen ? 'block' : 'hidden'
        }`}
      >
        <div className='flex items-center justify-between text-[11px] text-white/50'>
          <span>
            {activeExport === 'key'
              ? 'Private Key (Hexadecimal)'
              : 'Seed Phrase (Mnemonic)'}
          </span>
          <span className='text-emerald-400 text-[10px] font-medium'>
            {exportSuccess ? 'Decrypted via Turnkey' : ''}
          </span>
        </div>

        {/* Dedicated empty container for Turnkey iframe - NO React children allowed inside */}
        <div
          id={containerId}
          className='w-full min-h-[140px] rounded-xl overflow-hidden bg-black/60 border border-white/15 p-2 text-white [&>iframe]:w-full [&>iframe]:min-h-[130px] [&>iframe]:border-0'
        />

        <div className='text-[10px] text-white/40 leading-normal font-sans'>
          ⚠️ Never share your private key. Anyone with this key has full control
          of your wallet across all chains.
        </div>
      </div>
    </div>
  );
}
