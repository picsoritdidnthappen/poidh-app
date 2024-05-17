'use client';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { ethers } from 'ethers';
import React, { createContext, ReactNode, useEffect, useState } from 'react';

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
  const { primaryWallet } = useDynamicContext();

  const walletConnection = async (): Promise<void> => {
    if ((window as any).ethereum === undefined) {
      setWalletAddress('No wallet');
      return;
    }
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      const account = accounts[0];
      setWalletAddress(account);
    } catch (error) {
      console.log(error);
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

  return (
    <WalletContext.Provider value={{ walletAddress }}>
      <div>{children}</div>
    </WalletContext.Provider>
  );
};

export default WalletProvider;
