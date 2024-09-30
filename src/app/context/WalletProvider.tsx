'use client';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { ethers } from 'ethers';
import { useRouter } from 'next/navigation';
import React, { createContext, ReactNode, useEffect, useState } from 'react';
import { EIP1193Provider } from 'viem';

interface WalletContextType {
  walletAddress: string | null;
}

export const WalletContext = createContext<WalletContextType | undefined>(
  undefined
);

interface WalletProviderProps {
  children: ReactNode;
}

const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const { primaryWallet, network, isAuthenticated } = useDynamicContext();
  const router = useRouter();

  const walletConnection = async (): Promise<void> => {
    const ethereum = window.ethereum as EIP1193Provider | undefined;
    if (!ethereum) {
      setWalletAddress('No wallet');
      return;
    }
    try {
      const provider = new ethers.BrowserProvider(
        window.ethereum as EIP1193Provider
      );
      const accounts = await provider.send('eth_requestAccounts', []);
      const account = accounts[0];
      setWalletAddress(account);
    } catch (error) {
      return;
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      walletConnection();
    }
  }, [primaryWallet, isAuthenticated]);

  useEffect(() => {
    if (network === '42161') {
      router.push('/arbitrum');
    } else if (network === '8453') {
      router.push('/base');
    }
  }, [network, router]);

  return (
    <WalletContext.Provider value={{ walletAddress }}>
      {children}
    </WalletContext.Provider>
  );
};

export default WalletProvider;
