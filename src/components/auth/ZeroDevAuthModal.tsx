'use client';

import React, { useState, useEffect } from 'react';
import {
  OAUTH_PROVIDERS,
  useAuthenticateOAuth,
  useLoginPasskey,
  useRegisterPasskey,
} from '@zerodev/wallet-react';
import { useAccount, useDisconnect, useSwitchChain } from 'wagmi';
import { toast } from 'react-toastify';
import { arbitrum, base, mainnet } from 'viem/chains';
import { formatEther } from 'viem';
import {
  Sheet,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetContent,
  SheetFooter,
  SheetClose,
} from '@/components/ui/Sheet';
import {
  ArbitrumIcon,
  BaseIcon,
  CopyDoneIcon,
  CopyIcon,
  MainIcon,
} from '@/components/global/Icons';
import {
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Fingerprint,
  Loader2,
  LogOut,
  Plus,
  Sparkles,
  X,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAnychainBalances } from '@/hooks/useAnychainBalances';

interface ApprovalDetail {
  type: 'transaction' | 'signature';
  tx?: {
    to?: string;
    value?: string | number | bigint;
    data?: string;
    chainId?: number | string;
  };
  message?: string;
  resolve: () => void;
  // eslint-disable-next-line no-unused-vars
  reject: (err: Error) => void;
}

interface ZeroDevAuthModalProps {
  open: boolean;
  onClose: () => void;
  openRainbowKitModal?: () => void;
  openChainModal?: () => void;
}

const SUPPORTED_CHAINS = [
  { id: arbitrum.id, name: 'Arbitrum', Icon: ArbitrumIcon },
  { id: base.id, name: 'Base', Icon: BaseIcon },
  { id: mainnet.id, name: 'Ethereum', Icon: MainIcon },
];

export default function ZeroDevAuthModal({
  open,
  onClose,
  openRainbowKitModal,
  openChainModal,
}: ZeroDevAuthModalProps) {
  const { address, isConnected, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const { disconnect } = useDisconnect();

  const loginPasskey = useLoginPasskey();
  const registerPasskey = useRegisterPasskey();
  const authenticateOAuth = useAuthenticateOAuth();
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedDeposit, setCopiedDeposit] = useState(false);
  const [activeTab, setActiveTab] = useState<'account' | 'anychain'>('account');
  const [pendingApproval, setPendingApproval] = useState<ApprovalDetail | null>(
    null
  );
  const [addingTokenChainId, setAddingTokenChainId] = useState<number | null>(
    null
  );
  const [tokenAddressInput, setTokenAddressInput] = useState('');
  const [isAddingToken, setIsAddingToken] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const anychain = useAnychainBalances({ enabled: open });

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
    const handleApproval = (e: Event) => {
      const customEvent = e as CustomEvent<ApprovalDetail>;
      if (customEvent.detail) {
        setPendingApproval(customEvent.detail);
      }
    };

    const handleOpenAuth = () => {
      setActiveTab('account');
    };

    window.addEventListener('zerodev-request-approval', handleApproval);
    window.addEventListener('open-zerodev-auth', handleOpenAuth);
    return () => {
      window.removeEventListener('zerodev-request-approval', handleApproval);
      window.removeEventListener('open-zerodev-auth', handleOpenAuth);
    };
  }, []);

  const handleClose = () => {
    if (pendingApproval) {
      pendingApproval.reject(new Error('User rejected the transaction'));
      setPendingApproval(null);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('zerodev-auth-cancel'));
    }
    setAuthError(null);
    setTokenError(null);
    setApprovalError(null);
    setActiveTab('account');
    onClose();
  };

  const handleApprove = () => {
    if (pendingApproval) {
      try {
        pendingApproval.resolve();
        setPendingApproval(null);
        setApprovalError(null);
        toast.info('Please confirm with your passkey');
        onClose();
      } catch (err: unknown) {
        const e = err as Error;
        setApprovalError(e?.message || 'Approval failed');
      }
    }
  };

  const handleReject = () => {
    if (pendingApproval) {
      pendingApproval.reject(new Error('User rejected the transaction'));
      setPendingApproval(null);
      setApprovalError(null);
      toast.info('Transaction rejected');
    }
    onClose();
  };

  const handleBackToAccount = () => {
    if (pendingApproval) {
      pendingApproval.reject(new Error('User rejected the transaction'));
      setPendingApproval(null);
      setApprovalError(null);
    }
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

  const isMainContract = (addr?: string) => {
    if (!addr) return false;
    const known = [
      '0xE731dFadBFf20542E10D09D26Fc71445C70d4232',
      '0x5555fa783936c260f77385b4e153b9725fef1719',
      '0x18e5585ca7ce31b90bc8bb7aaf84152857ce243f',
    ].map((a) => a.toLowerCase());
    return known.includes(addr.toLowerCase());
  };

  const txChainId = pendingApproval?.tx?.chainId
    ? Number(pendingApproval.tx.chainId)
    : chain?.id;

  const targetChain = SUPPORTED_CHAINS.find((c) => c.id === txChainId) || {
    name: chain?.name || 'Arbitrum',
    Icon: ArbitrumIcon,
  };

  const handlePasskeyLogin = async () => {
    setAuthError(null);
    try {
      setActiveAction('passkey-login');
      await loginPasskey.mutateAsync();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('zerodev-auth-success'));
      }
      toast.success('Logged in with passkey');
      onClose();
    } catch (err: unknown) {
      const e = err as { message?: string; name?: string };
      const msg =
        e?.message?.includes('not found') || e?.name === 'NotAllowedError'
          ? 'No passkey found on this device. Create one below.'
          : e?.message || 'Passkey login failed';
      setAuthError(msg);
      if (e?.message?.includes('not found') || e?.name === 'NotAllowedError') {
        toast.info('No passkey found, create one below');
      } else {
        toast.error(msg);
      }
    } finally {
      setActiveAction(null);
    }
  };

  const handlePasskeyRegister = async () => {
    setAuthError(null);
    try {
      setActiveAction('passkey-register');
      await registerPasskey.mutateAsync();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('zerodev-auth-success'));
      }
      toast.success(isConnected ? 'Passkey device added' : 'Account created');
      onClose();
    } catch (err: unknown) {
      const e = err as { message?: string };
      const msg = e?.message || 'Passkey registration failed';
      setAuthError(msg);
      toast.error(msg);
    } finally {
      setActiveAction(null);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthError(null);
    try {
      setActiveAction('google');
      await authenticateOAuth.mutateAsync({
        provider: OAUTH_PROVIDERS.GOOGLE,
      });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('zerodev-auth-success'));
      }
      toast.success('Logged in with Google');
      onClose();
    } catch (err: unknown) {
      const e = err as { message?: string };
      const msg = e?.message || 'Google login failed';
      setAuthError(msg);
      toast.error(msg);
    } finally {
      setActiveAction(null);
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

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success('Address copied');
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handleCopyDeposit = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopiedDeposit(true);
      toast.success('Universal deposit address copied');
      setTimeout(() => setCopiedDeposit(false), 1500);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    toast.info('Disconnected');
    onClose();
  };

  const isPending =
    loginPasskey.isPending ||
    registerPasskey.isPending ||
    authenticateOAuth.isPending;

  return (
    <Sheet open={open} onClose={handleClose} side='right'>
      {pendingApproval ? (
        /* ================= APPROVAL PAGE ================= */
        <>
          <SheetHeader className='pb-5'>
            <div className='flex items-start justify-between w-full'>
              <div>
                {isConnected && (
                  <button
                    type='button'
                    onClick={handleBackToAccount}
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
              <SheetClose onClick={handleClose} />
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
                      <span className='text-sm font-normal text-white/60'>
                        ETH
                      </span>
                    </div>
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

                {/* Calldata Preview if data exists */}
                {pendingApproval.tx?.data &&
                  pendingApproval.tx.data !== '0x' && (
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
                <AlertCircle
                  size={16}
                  className='shrink-0 mt-0.5 text-red-400'
                />
                <div className='flex-1 break-words font-sans'>
                  {approvalError}
                </div>
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
              onClick={handleReject}
              className='flex-1 flex items-center justify-center gap-1.5 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/40 text-white/80 hover:text-white font-semibold text-xs py-2.5 px-4 transition active:scale-[0.99] normal-case'
            >
              <span>Reject</span>
            </button>
            <button
              type='button'
              onClick={handleApprove}
              className='flex-1 flex items-center justify-center gap-1.5 rounded-full border border-transparent bg-[#f15e5f] hover:bg-[#cf5d5d] text-white font-semibold text-xs py-2.5 px-4 transition active:scale-[0.99] shadow-sm normal-case'
            >
              <Sparkles size={14} className='text-white' />
              <span>Confirm & Sign</span>
            </button>
          </SheetFooter>
        </>
      ) : activeTab === 'anychain' ? (
        /* ================= ANYCHAIN SETTINGS ================= */
        <>
          <SheetHeader className='pb-5'>
            <div className='flex items-start justify-between w-full'>
              <div>
                <button
                  type='button'
                  onClick={() => setActiveTab('account')}
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
              <SheetClose onClick={handleClose} />
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
                              onChange={(e) =>
                                setTokenAddressInput(e.target.value)
                              }
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
                              disabled={
                                isAddingToken || !tokenAddressInput.trim()
                              }
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
                            Queries ERC-20 contract for symbol, decimals, and
                            live balance.
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

            {/* Universal Smart Routing Deposit */}
            <div className='p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] text-center'>
              <div className='text-left'>
                <div className='text-xs font-bold text-white normal-case'>
                  Universal Deposit Address
                </div>
                <div className='text-[11px] text-white/50 mt-0.5 normal-case'>
                  Send ETH or USDC from any chain or CEX. ZeroDev routes funds
                  to your smart account automatically.
                </div>
              </div>

              {address ? (
                <div className='flex flex-col items-center pt-1 pb-2'>
                  <div className='p-2 bg-white rounded-xl shadow-md mb-2.5'>
                    <QRCodeSVG value={address} size={110} />
                  </div>
                  <div className='w-full flex items-center justify-between bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white/90'>
                    <span className='truncate mr-2'>{address}</span>
                    <button
                      type='button'
                      onClick={handleCopyDeposit}
                      className='shrink-0 text-white/60 hover:text-white p-1 rounded hover:bg-white/10 transition-colors'
                      title='Copy universal address'
                    >
                      {copiedDeposit ? (
                        <CopyDoneIcon size={15} />
                      ) : (
                        <CopyIcon size={15} />
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className='p-4 rounded-xl bg-white/[0.02] border border-dashed border-white/15 my-1 text-center'>
                  <p className='text-xs text-white/60 mb-2.5 normal-case'>
                    Sign in to get your unified multi-chain deposit address
                  </p>
                  <button
                    type='button'
                    onClick={() => setActiveTab('account')}
                    className='text-xs font-semibold px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors normal-case'
                  >
                    Sign In to Activate
                  </button>
                </div>
              )}

              <div className='flex flex-wrap gap-1 justify-center pt-0.5'>
                <span className='text-[10px] text-white/60 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full'>
                  Ethereum L1
                </span>
                <span className='text-[10px] text-white/60 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full'>
                  Base
                </span>
                <span className='text-[10px] text-white/60 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full'>
                  Arbitrum
                </span>
                <span className='text-[10px] text-white/60 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full'>
                  Optimism
                </span>
                <span className='text-[10px] text-white/60 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full'>
                  Any CEX
                </span>
              </div>
            </div>
          </SheetContent>

          <SheetFooter className='gap-2.5 pt-4'>
            <button
              type='button'
              onClick={() => setActiveTab('account')}
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
      ) : isConnected ? (
        /* ================= CONNECTED ACCOUNT ================= */
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
              <SheetClose onClick={handleClose} />
            </div>
          </SheetHeader>

          <SheetContent className='space-y-6 pt-5'>
            {authError && (
              <div className='p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-2.5 text-xs text-red-400 normal-case leading-relaxed'>
                <AlertCircle
                  size={16}
                  className='shrink-0 mt-0.5 text-red-400'
                />
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
                  onClick={() => setActiveTab('anychain')}
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
      ) : (
        /* ================= DISCONNECTED SHEET ================= */
        <>
          <SheetHeader className='pb-5'>
            <div className='flex items-start justify-between w-full'>
              <div>
                <SheetTitle className='text-lg font-bold text-white tracking-tight normal-case'>
                  Sign In
                </SheetTitle>
                <SheetDescription className='text-xs text-white/50 mt-1 font-normal normal-case'>
                  Choose a passkey or social account to continue
                </SheetDescription>
              </div>
              <SheetClose onClick={handleClose} />
            </div>
          </SheetHeader>

          <SheetContent className='space-y-4 pt-5'>
            {authError && (
              <div className='p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-2.5 text-xs text-red-400 normal-case leading-relaxed'>
                <AlertCircle
                  size={16}
                  className='shrink-0 mt-0.5 text-red-400'
                />
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
            {/* Primary Passkey Action */}
            <button
              onClick={handlePasskeyLogin}
              disabled={isPending}
              className='w-full flex items-center justify-center gap-2.5 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/40 text-white font-semibold text-sm px-4 py-2.5 transition active:scale-[0.99] disabled:opacity-50 normal-case'
            >
              <Fingerprint size={16} className='text-white/80' />
              <span>
                {activeAction === 'passkey-login'
                  ? 'Signing In...'
                  : 'Sign In with Passkey'}
              </span>
            </button>

            {/* Create Passkey Account */}
            <button
              onClick={handlePasskeyRegister}
              disabled={isPending}
              className='w-full flex items-center justify-center gap-2.5 rounded-full bg-[#f15e5f] hover:bg-[#cf5d5d] text-white font-semibold text-sm px-4 py-2.5 transition active:scale-[0.99] disabled:opacity-50 shadow-sm normal-case'
            >
              <Sparkles size={16} className='text-white' />
              <span>
                {activeAction === 'passkey-register'
                  ? 'Creating Account...'
                  : 'Create Passkey Account'}
              </span>
            </button>

            {/* Hairline Divider */}
            <div className='relative flex items-center py-2'>
              <div className='flex-grow border-t border-white/10' />
              <span className='flex-shrink mx-3 text-[11px] font-medium text-white/40 uppercase tracking-widest'>
                or
              </span>
              <div className='flex-grow border-t border-white/10' />
            </div>

            {/* Google OAuth */}
            <button
              onClick={handleGoogleLogin}
              disabled={isPending}
              className='w-full flex items-center justify-center gap-2.5 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/40 text-white font-semibold text-sm px-4 py-2.5 transition active:scale-[0.99] disabled:opacity-50 normal-case'
            >
              <svg className='h-4 w-4' viewBox='0 0 24 24'>
                <path
                  fill='#4285F4'
                  d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
                />
                <path
                  fill='#34A853'
                  d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
                />
                <path
                  fill='#FBBC05'
                  d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z'
                />
                <path
                  fill='#EA4335'
                  d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z'
                />
              </svg>
              <span>
                {activeAction === 'google'
                  ? 'Connecting Google...'
                  : 'Continue with Google'}
              </span>
            </button>
          </SheetContent>
        </>
      )}
    </Sheet>
  );
}
