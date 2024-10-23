// 'use client';
// import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
// import React, { createContext, ReactNode } from 'react';

// interface WalletContextType {
//   walletAddress: string | null;
// }
// export const WalletContext = createContext<WalletContextType | undefined>(
//   undefined
// );
// interface WalletProviderProps {
//   children: ReactNode;
// }
// const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
//   const { primaryWallet } = useDynamicContext();

//   return (
//     <WalletContext.Provider value={{ primaryWallet?.address }}>
//       {children}
//     </WalletContext.Provider>
//   );
// };
// export default WalletProvider;
