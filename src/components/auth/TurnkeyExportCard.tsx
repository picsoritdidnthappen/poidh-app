'use client';

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useExportPrivateKey, useExportWallet } from '@zerodev/wallet-react';
import { toast } from 'react-toastify';
import { AlertCircle, Fingerprint, KeyRound, Loader2, X } from 'lucide-react';
import { CopyDoneIcon, CopyIcon } from '@/components/global/Icons';

export interface TurnkeyExportCardProps {
  address?: string;
  containerId: string;
}

export default function TurnkeyExportCard({
  containerId,
}: TurnkeyExportCardProps) {
  const { connector } = useAccount();

  const isZeroDev =
    connector?.id?.includes('zerodev') ||
    connector?.name?.toLowerCase().includes('zerodev');

  const [signerAddress, setSignerAddress] = useState<string | null>(null);
  const [copiedSigner, setCopiedSigner] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeExport, setActiveExport] = useState<'key' | 'wallet' | null>(
    null
  );
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState(false);

  const { mutateAsync: exportPrivateKeyMutate } = useExportPrivateKey();
  const { mutateAsync: exportWalletMutate } = useExportWallet();

  // Load the underlying EOA Signer address from the connector's store
  useEffect(() => {
    let isMounted = true;
    async function loadSigner() {
      if (!connector) return;
      try {
        if (
          'getStore' in connector &&
          typeof (connector as unknown as { getStore: () => Promise<unknown> })
            .getStore === 'function'
        ) {
          const store = (await (
            connector as unknown as {
              getStore: () => Promise<{
                getState: () => {
                  eoaAccount?: { address?: string };
                  wallet?: {
                    toAccount: () => Promise<{ address?: string }>;
                  };
                };
              }>;
            }
          ).getStore()) as {
            getState: () => {
              eoaAccount?: { address?: string };
              wallet?: {
                toAccount: () => Promise<{ address?: string }>;
              };
            };
          };

          const state = store?.getState?.();
          const eoa = state?.eoaAccount?.address;
          if (eoa && isMounted) {
            setSignerAddress(eoa);
            return;
          }
          if (state?.wallet && typeof state.wallet.toAccount === 'function') {
            const acc = await state.wallet.toAccount();
            if (acc?.address && isMounted) {
              setSignerAddress(acc.address);
            }
          }
        }
      } catch (err) {
        console.warn(
          'Could not read signer address from connector store:',
          err
        );
      }
    }
    loadSigner();
    return () => {
      isMounted = false;
    };
  }, [connector]);

  const handleCopySigner = () => {
    if (signerAddress) {
      navigator.clipboard.writeText(signerAddress);
      setCopiedSigner(true);
      toast.success('Signer address copied');
      setTimeout(() => setCopiedSigner(false), 1500);
    }
  };

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
        // Export the EOA Signer key, NEVER the smart contract address
        await exportPrivateKeyMutate({
          iframeContainerId: containerId,
          address: signerAddress ? (signerAddress as `0x${string}`) : undefined,
          keyFormat: 'Hexadecimal',
          iframeStyles,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          connector: connector as any,
        });
        setExportSuccess(true);
        toast.success('Signer private key decrypted');
      } else {
        await exportWalletMutate({
          iframeContainerId: containerId,
          iframeStyles,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          connector: connector as any,
        });
        setExportSuccess(true);
        toast.success('Signer recovery phrase decrypted');
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      const msg =
        e?.message ||
        `Failed to export ${
          type === 'key' ? 'signer private key' : 'recovery phrase'
        }`;
      setExportError(msg);
      toast.error(msg);
    } finally {
      setIsExporting(false);
    }
  };

  if (!isZeroDev) {
    return (
      <div className='p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-1.5 text-xs shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'>
        <div className='text-xs font-bold text-white normal-case'>
          Signer Credentials
        </div>
        <p className='text-[11px] text-white/60 leading-relaxed normal-case'>
          Connected via {connector?.name || 'External Wallet'}. Credentials are
          managed directly inside your wallet app.
        </p>
      </div>
    );
  }

  return (
    <div className='p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'>
      <div className='text-left'>
        <div className='text-xs font-bold text-white normal-case'>
          Export Signer Credentials
        </div>
        <p className='text-[11px] text-white/70 mt-1.5 leading-relaxed normal-case'>
          Export your underlying signer credentials for use in external wallets
          like MetaMask or Rabby. Because smart accounts are contract-based,
          external wallets will display this signer address.
        </p>
      </div>

      {signerAddress && (
        <div className='flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/10'>
          <div>
            <div className='text-[10px] text-white/40 uppercase tracking-wider font-semibold'>
              Signer Address
            </div>
            <div className='text-xs text-white font-mono font-medium'>
              {signerAddress.slice(0, 6)}...{signerAddress.slice(-4)}
            </div>
          </div>
          <button
            type='button'
            onClick={handleCopySigner}
            className='text-white/60 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors'
            aria-label='Copy signer address'
          >
            {copiedSigner ? <CopyDoneIcon size={15} /> : <CopyIcon size={15} />}
          </button>
        </div>
      )}

      {/* Export Action Buttons */}
      <div className='flex items-center gap-2 pt-0.5'>
        <button
          type='button'
          onClick={() => handleExport('key')}
          disabled={isExporting}
          className='flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/10 transition active:scale-[0.98] disabled:opacity-50 normal-case'
        >
          {isExporting && activeExport === 'key' ? (
            <Loader2 size={13} className='animate-spin text-white' />
          ) : (
            <KeyRound size={13} className='text-white/70' />
          )}
          <span>Export Key</span>
        </button>

        <button
          type='button'
          onClick={() => handleExport('wallet')}
          disabled={isExporting}
          className='flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white font-medium text-xs border border-white/5 transition active:scale-[0.98] disabled:opacity-50 normal-case'
        >
          {isExporting && activeExport === 'wallet' ? (
            <Loader2 size={13} className='animate-spin text-white' />
          ) : (
            <Fingerprint size={13} className='text-white/70' />
          )}
          <span>Export Passphrase</span>
        </button>
      </div>

      {/* Error state */}
      {exportError && (
        <div className='p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2 text-[11px] text-red-400 leading-normal'>
          <AlertCircle size={14} className='shrink-0 mt-0.5 text-red-400' />
          <div className='flex-1 break-words'>{exportError}</div>
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

      {/* Decrypted Display Container */}
      <div
        className={`space-y-2 pt-2 border-t border-white/10 ${
          isOpen ? 'block' : 'hidden'
        }`}
      >
        <div className='flex items-center justify-between text-[11px] text-white/50'>
          <span>
            {activeExport === 'key'
              ? 'Signer Private Key'
              : 'Signer Passphrase'}
          </span>
          {exportSuccess && (
            <span className='text-emerald-400 text-[10px] font-medium'>
              Decrypted
            </span>
          )}
        </div>

        {/* Dedicated empty container for Turnkey iframe - NO React children allowed inside */}
        <div
          id={containerId}
          className='w-full min-h-[140px] rounded-xl overflow-hidden bg-white/[0.03] border border-white/10 p-2 text-white [&>iframe]:w-full [&>iframe]:min-h-[130px] [&>iframe]:border-0'
        />
      </div>
    </div>
  );
}
