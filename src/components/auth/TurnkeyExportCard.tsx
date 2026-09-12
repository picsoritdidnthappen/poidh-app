'use client';

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useExportPrivateKey, useExportWallet } from '@zerodev/wallet-react';
import { toast } from 'react-toastify';
import {
  AlertCircle,
  Fingerprint,
  KeyRound,
  Loader2,
  X,
  Info,
} from 'lucide-react';
import { CopyDoneIcon, CopyIcon } from '@/components/global/Icons';

export interface TurnkeyExportCardProps {
  address?: string;
  containerId: string;
}

export default function TurnkeyExportCard({
  address: propAddress,
  containerId,
}: TurnkeyExportCardProps) {
  const { address: accountAddress, connector } = useAccount();
  const contractAddress = propAddress || accountAddress;

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
          connector,
        });
        setExportSuccess(true);
        toast.success('Signer private key decrypted via Turnkey');
      } else {
        await exportWalletMutate({
          iframeContainerId: containerId,
          iframeStyles,
          connector,
        });
        setExportSuccess(true);
        toast.success('Signer recovery phrase decrypted via Turnkey');
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
      <div className='p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2 text-xs font-sans shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'>
        <div className='flex items-center gap-1.5 font-semibold text-white'>
          <KeyRound size={15} className='text-white/60' />
          <span>External Wallet Signer</span>
        </div>
        <p className='text-[11px] text-white/50 leading-relaxed'>
          You are connected via{' '}
          <span className='text-white font-medium'>
            {connector?.name || 'External Wallet'}
          </span>
          . Your private key and recovery phrase are managed directly inside
          your external wallet app.
        </p>
      </div>
    );
  }

  return (
    <div className='p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'>
      <div className='flex items-start justify-between'>
        <div className='text-left'>
          <div className='flex items-center gap-1.5'>
            <KeyRound size={15} className='text-amber-400' />
            <span className='text-xs font-bold text-white normal-case'>
              Export Signer Credentials
            </span>
          </div>
          <div className='text-[11px] text-white/50 mt-1 normal-case leading-relaxed font-sans'>
            Export credentials for the underlying Signer (EOA) that authorizes
            transactions for this smart account.
          </div>
        </div>
        <span className='text-[10px] uppercase font-semibold text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full font-sans'>
          Signer EOA
        </span>
      </div>

      {/* Signer vs Smart Contract Account Architecture Callout */}
      <div className='p-3 rounded-xl bg-black/40 border border-white/10 space-y-2 text-xs font-sans'>
        <div className='flex items-center justify-between text-[11px]'>
          <span className='text-white/50'>Smart Contract Account:</span>
          <span className='font-mono text-white/80 font-medium'>
            {contractAddress
              ? `${contractAddress.slice(0, 6)}...${contractAddress.slice(-4)}`
              : 'N/A'}
          </span>
        </div>

        <div className='flex items-center justify-between text-[11px] pt-1.5 border-t border-white/5'>
          <span className='text-white/50'>Underlying Signer (EOA):</span>
          <div className='flex items-center gap-1.5'>
            <span className='font-mono text-emerald-400 font-medium'>
              {signerAddress
                ? `${signerAddress.slice(0, 6)}...${signerAddress.slice(-4)}`
                : 'Turnkey Signer'}
            </span>
            {signerAddress && (
              <button
                type='button'
                onClick={handleCopySigner}
                className='text-white/40 hover:text-white p-0.5 rounded transition'
                title='Copy Signer Address'
              >
                {copiedSigner ? (
                  <CopyDoneIcon size={12} className='text-emerald-400' />
                ) : (
                  <CopyIcon size={12} />
                )}
              </button>
            )}
          </div>
        </div>

        <div className='flex items-start gap-1.5 text-[10px] text-white/45 leading-relaxed pt-1.5 border-t border-white/5 font-sans'>
          <Info size={13} className='shrink-0 mt-0.5 text-amber-400/80' />
          <span>
            Smart contracts do not possess private keys. You are exporting the
            credentials of your{' '}
            <strong className='text-white/70'>Signer</strong>. When imported
            into MetaMask or Rabby, your wallet will display the{' '}
            <strong className='text-white/70'>Signer address</strong>.
          </span>
        </div>
      </div>

      {/* Export Action Buttons */}
      <div className='flex items-center gap-2 pt-0.5'>
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
          <span>Export Signer Key</span>
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
          <span>Export Passphrase</span>
        </button>
      </div>

      {/* Error state */}
      {exportError && (
        <div className='p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2 text-[11px] text-red-400 leading-normal font-sans'>
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
        <div className='flex items-center justify-between text-[11px] text-white/50 font-sans'>
          <span>
            {activeExport === 'key'
              ? 'Signer Private Key (Hexadecimal)'
              : 'Signer Seed Phrase (Mnemonic)'}
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
          ⚠️ Never share your signer private key or passphrase. Anyone with this
          key can authorize transactions on your smart account.
        </div>
      </div>
    </div>
  );
}
