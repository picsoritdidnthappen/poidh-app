import { arbitrum, base, mainnet } from 'viem/chains';
import { ArbitrumIcon, BaseIcon, MainIcon } from '@/components/global/Icons';
import React from 'react';

export interface ApprovalDetail {
  type: 'transaction' | 'signature';
  tx?: {
    to?: string;
    value?: string | number | bigint;
    data?: string;
    chainId?: number | string;
  };
  message?: string;
  // When true, the caller owns post-approval UX: stay open instead of
  // closing the sheet after Accept.
  keepOpen?: boolean;
  resolve: () => void;
  // eslint-disable-next-line no-unused-vars
  reject: (err: Error) => void;
}

export interface ZeroDevAuthModalProps {
  open: boolean;
  onClose: () => void;
  openChainModal?: () => void;
}

export interface SupportedChain {
  id: number;
  name: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
}

export const SUPPORTED_CHAINS: SupportedChain[] = [
  { id: arbitrum.id, name: 'Arbitrum', Icon: ArbitrumIcon },
  { id: base.id, name: 'Base', Icon: BaseIcon },
  { id: mainnet.id, name: 'Ethereum', Icon: MainIcon },
];

// Re-exported here so existing imports keep working; chains.ts owns it.
export { USDC_ADDRESSES } from './chains';
