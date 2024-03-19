import { useContract } from '@/app/context/web3';
import React, { ReactNode, useEffect } from 'react';
import { ethers, Contract, Signer } from 'ethers';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';

interface WalletProviderProps {
  children: ReactNode;
}







const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const {signer, contract} = useContract()
  const { primaryWallet } = useDynamicContext();

// useEffect(() => {

// async function balanceGet() {

//       const balance = await primaryWallet?.connector.getBalance();
//       console.log(balance)
//       return balance;
  
// }

// balanceGet()

// }, [primaryWallet])
 
  // useEffect(() => {
  //   async function sendTransaction() {
  //     try {
  //       if (!signer || !contract) {
  //         console.error('Signer or contract not available.');
  //         return;
  //       }

  //       const toAddress = '0x65b810A686034F2Ca2A9873aCD6b10b94e6e8E5d';
  //       const value = ethers.parseEther('0.01');

  //       const tx = await signer.sendTransaction({
  //         to: toAddress,
  //         value: value,
  //       });
  //       console.log('Transaction sent:', tx);
  //     } catch (error) {
  //       console.error('Error sending transaction:', error);
  //     }
  //   }

  //   sendTransaction();
  // }, [signer, contract]);


  //   const getBounties = async () => {
  //   try{
    
  //   const userAddress = "0x7aeb953571294652527b14DF6Bce207B5E3915F1"
  //   const userBounties = await contract?.getBountiesByUser(
  //     userAddress
  //   );
  //   // console.log(userBounties)

  // } catch (error) {
  //   console.error("Error occurred during getting bounties:", error);
  // }

  // }
  // getBounties()

  return (
    <div>
      {children }
    </div>
  );
};

export default WalletProvider;