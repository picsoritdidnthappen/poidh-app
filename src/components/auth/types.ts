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
  resolve: () => void;
  // eslint-disable-next-line no-unused-vars
  reject: (err: Error) => void;
}

export interface ZeroDevAuthModalProps {
  open: boolean;
  onClose: () => void;
  openRainbowKitModal?: () => void;
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

export const USDC_ADDRESSES: Record<number, `0x${string}`> = {
  [arbitrum.id]: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
  [base.id]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  [mainnet.id]: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
};
