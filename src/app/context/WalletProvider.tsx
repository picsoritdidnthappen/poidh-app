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
  const { primaryWallet, network } = useDynamicContext();
  const router = useRouter();

  // const walletConnection = async (): Promise<void> => {
  //   if ((window as any).ethereum === undefined) {
  //     setWalletAddress('No wallet');
  //     return;
  //   }
  //   try {
  //     const provider = new ethers.BrowserProvider((window as any).ethereum);
  //     const accounts = await provider.send('eth_requestAccounts', []);
  //     const account = accounts[0];
  //     setWalletAddress(account);
  //   } catch (error) {
  //     console.log(error);
  //   }
  // };
  // !-Check for breaking changes
  const walletConnection = async (): Promise<void> => {
    const ethereum = window.ethereum as EIP1193Provider | undefined;
    // Teat to make sure non-breaking changes
    if (ethereum) {
      try {
        const provider = new ethers.BrowserProvider(
          window.ethereum as EIP1193Provider
        );
        const accounts = await provider.send('eth_requestAccounts', []);
        const account = accounts[0];
        setWalletAddress(account);
      } catch (error) {
        console.log(error);
      }
    } else {
      setWalletAddress('No wallet');
      return;
    }
  };

  // const connectedWallet = () => {
  //   if (primaryWallet) {
  //     setWalletAddress(primaryWallet.address);
  //   }
  // };

  useEffect(() => {
    walletConnection();
  }, [primaryWallet]);

  useEffect(() => {
    if (network === '42161') {
      router.push('/arbitrum');
    } else if (network === '8453') {
      router.push('/base');
    }
  }, [network, router]);

  return (
    <WalletContext.Provider value={{ walletAddress }}>
      <div>{children}</div>
    </WalletContext.Provider>
  );
};

export default WalletProvider;
