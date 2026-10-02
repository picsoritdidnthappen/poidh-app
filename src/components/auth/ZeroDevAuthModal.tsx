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
import SendFundsView from './sheet/SendFundsSection';

export type { ZeroDevAuthModalProps, ApprovalDetail };

export default function ZeroDevAuthModal({
  open,
  onClose,
  openChainModal,
}: ZeroDevAuthModalProps) {
  const { address, isConnected, chain } = useAccount();
  const [activeTab, setActiveTab] = useState<'account' | 'anychain' | 'send'>(
    'account'
  );
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
      {pendingApproval && !pendingApproval.keepOpen ? (
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
      ) : (
        <div className='relative flex min-h-0 flex-1 flex-col'>
          {activeTab === 'anychain' ? (
            <AuthAnychainView
              onClose={handleClose}
              onBack={() => setActiveTab('account')}
              anychain={anychain}
              smartRouting={smartRouting}
              isConnected={isConnected}
              address={address}
            />
          ) : activeTab === 'send' ? (
            <SendFundsView
              onClose={handleClose}
              onBack={() => setActiveTab('account')}
              anychain={anychain}
            />
          ) : isConnected ? (
            <AuthAccountView
              onClose={handleClose}
              onOpenAnychain={() => setActiveTab('anychain')}
              onOpenSend={() => setActiveTab('send')}
              openChainModal={openChainModal}
              anychain={anychain}
            />
          ) : (
            <AuthSignInView onClose={handleClose} />
          )}
          {/* keepOpen approvals (e.g. Manage Tokens sends) float above the
              caller so its state survives Accept/Cancel. */}
          {pendingApproval?.keepOpen && (
            <div className='absolute inset-0 z-10 flex flex-col bg-[#121B28]'>
              <AuthApprovalView
                pendingApproval={pendingApproval}
                onClose={handleClose}
                onBackToAccount={() => {
                  pendingApproval.reject(
                    new Error('User rejected the transaction')
                  );
                  setPendingApproval(null);
                }}
                onResolve={() => setPendingApproval(null)}
                onReject={() => {
                  pendingApproval.reject(
                    new Error('User rejected the transaction')
                  );
                  setPendingApproval(null);
                  onClose();
                }}
                anychain={anychain}
                isConnected={isConnected}
                address={address}
              />
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}
