'use client';

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Sheet } from '@/components/ui/Sheet';
import { useAnychainBalances } from '@/hooks/useAnychainBalances';
import { useSmartRouting } from '@/hooks/useSmartRouting';
import { ApprovalDetail, ZeroDevAuthModalProps } from './types';
import AuthSignInView from './sheet/AuthSignInView';
import AuthAccountView from './sheet/AuthAccountView';
import AuthAnychainView from './sheet/AuthAnychainView';
import AuthApprovalView from './sheet/AuthApprovalView';

export type { ZeroDevAuthModalProps, ApprovalDetail };

export default function ZeroDevAuthModal({
  open,
  onClose,
  openRainbowKitModal,
  openChainModal,
}: ZeroDevAuthModalProps) {
  const { address, isConnected, chain } = useAccount();
  const [activeTab, setActiveTab] = useState<'account' | 'anychain'>('account');
  const [pendingApproval, setPendingApproval] = useState<ApprovalDetail | null>(
    null
  );

  const anychain = useAnychainBalances({ enabled: open || !!address });
  const anychainRef = React.useRef(anychain);
  useEffect(() => {
    anychainRef.current = anychain;
  });

  useEffect(() => {
    const handleApproval = (e: Event) => {
      const customEvent = e as CustomEvent<ApprovalDetail>;
      if (customEvent.detail) {
        setPendingApproval(customEvent.detail);
        anychainRef.current.refetch();
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
    setActiveTab('account');
    onClose();
  };

  const txChainId = pendingApproval?.tx?.chainId
    ? Number(pendingApproval.tx.chainId)
    : chain?.id;

  const smartRouting = useSmartRouting({
    targetChainId: txChainId,
    requiredValue: pendingApproval?.tx?.value,
    chainList: anychain.chainList,
    balances: anychain.balances,
    enabled: open && (!!address || pendingApproval?.type === 'transaction'),
    userAddress: address,
    anychainEnabled: anychain.anychainEnabled,
  });

  return (
    <Sheet open={open} onClose={handleClose} side='right'>
      {pendingApproval ? (
        <AuthApprovalView
          pendingApproval={pendingApproval}
          onClose={handleClose}
          onBackToAccount={() => {
            pendingApproval.reject(new Error('User rejected the transaction'));
            setPendingApproval(null);
          }}
          onResolve={() => setPendingApproval(null)}
          onReject={() => {
            pendingApproval.reject(new Error('User rejected the transaction'));
            setPendingApproval(null);
            onClose();
          }}
          anychain={anychain}
          isConnected={isConnected}
          address={address}
        />
      ) : activeTab === 'anychain' ? (
        <AuthAnychainView
          onClose={handleClose}
          onBack={() => setActiveTab('account')}
          anychain={anychain}
          smartRouting={smartRouting}
          isConnected={isConnected}
          address={address}
        />
      ) : isConnected ? (
        <AuthAccountView
          onClose={handleClose}
          onOpenAnychain={() => setActiveTab('anychain')}
          openRainbowKitModal={openRainbowKitModal}
          openChainModal={openChainModal}
          anychain={anychain}
        />
      ) : (
        <AuthSignInView onClose={handleClose} />
      )}
    </Sheet>
  );
}
