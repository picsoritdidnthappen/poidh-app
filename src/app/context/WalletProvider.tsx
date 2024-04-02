import React, { ReactNode, createContext, useState, useEffect } from 'react';
import {
  useDynamicContext,
} from '@dynamic-labs/sdk-react-core'


interface WalletContextType {
  walletAddress: string | null; 
  connectedWallet: () => void;
}

export const WalletContext = createContext<WalletContextType | undefined>(undefined);

interface WalletProviderProps {
  children: ReactNode;
}



const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const {primaryWallet } = useDynamicContext();


  const connectedWallet = () => {
    if (primaryWallet) {
      setWalletAddress(primaryWallet.address);
    }
  };

  useEffect(() => {
    connectedWallet();
  }, [primaryWallet]); 



  return (
    <WalletContext.Provider value={{ walletAddress, connectedWallet }}>
      <div>{children}</div>
    </WalletContext.Provider>
  );
};

export default WalletProvider;