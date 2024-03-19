'use client'
import React, { ReactNode, useEffect } from 'react';
import {
  DynamicContextProvider,
} from "@dynamic-labs/sdk-react-core";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { EthersExtension } from "@dynamic-labs/ethers-v6";











interface ContextProviderProps {
  children: ReactNode;
}



 

const ContextProvider: React.FC<ContextProviderProps> = ({ children }) => {



  return (
    <DynamicContextProvider 
      settings={{ 
        environmentId: '622731b3-a151-4656-8b08-de858d71d397',
        walletConnectors: [ EthereumWalletConnectors],
        networkValidationMode: "always",
        walletConnectorExtensions: [EthersExtension],
      }}
      > 
     
      {children}
      
    </DynamicContextProvider> 
  );
};

export default ContextProvider;
