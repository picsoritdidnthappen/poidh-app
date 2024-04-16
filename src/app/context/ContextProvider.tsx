'use client'
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { EthersExtension } from "@dynamic-labs/ethers-v6";
import {
  DynamicContextProvider,
} from "@dynamic-labs/sdk-react-core";
import React, { ReactNode } from 'react';



interface ContextProviderProps {
  children: ReactNode;
}


const ContextProvider: React.FC<ContextProviderProps> = ({ children }) => {


  return (
    <DynamicContextProvider 
      settings={{ 
        environmentId: 'f22c5820-7435-4025-a7ef-0a9b56286070',
        walletConnectors: [EthereumWalletConnectors],
        networkValidationMode: "always",
        walletConnectorExtensions: [EthersExtension],
       
      }}
      > 
     
      {children}
      
    </DynamicContextProvider> 
  );
};

export default ContextProvider;
