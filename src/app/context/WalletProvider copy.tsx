//@ts-nocheck
import { useContract } from '@/app/context/web3';
import React, { ReactNode, useEffect, useState } from 'react';
import { ethers, Contract, Signer } from 'ethers';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { getContract, getSigner } from '@/app/context/web3';

interface WalletProviderProps {
  children: ReactNode;
}





const WalletProvider: React.FC<WalletProviderProps> =  ({ children }) => {

  const signer = getSigner().then(signer => {
    // Use the contract here
    console.log(signer);
  })
  .catch(error => {
    // Handle any errors here
    console.error('Error fetching signer:', error);
  });
  const contract = getContract()


  const basicSend = async () => {
    try {
      console.log("starting send ")
      const signer = await getSigner();
      

      console.log(signer?.address);
        let myWallet = '0x7aeb953571294652527b14DF6Bce207B5E3915F1';
        let reciever = '0x65b810A686034F2Ca2A9873aCD6b10b94e6e8E5d';
        let tx = {
            to: reciever,
            value: ethers.parseUnits('0.001', 'ether'),
        };

        // Estimate gas
        const gasEstimate = await signer.estimateGas(tx);
        console.log(`Estimated Gas: ${gasEstimate.toString()}`);

        // Send transaction
        let txResponse = await signer.sendTransaction({
            ...tx, 
            gasLimit: gasEstimate, 
        });
        console.log(txResponse);
    } catch (error) {
        console.error("Error occurred during basicSend:", error);
    }
};





useEffect(() => {
  basicSend();
}, [signer]);


// const createBounty = async (name: string, description: string, value: number) => {
//   if (!contract) {
//     console.error("Contract is not initialized");
//     return;
//   }


//   const options = {
//     value: ethers.parseEther(value.toString()),
//   };
  
//   const transaction = await contract.createSoloBounty(name, description, options);
//   await transaction.wait();
// };
// useEffect(() => {
//   createBounty('TEST', 'TEST', 0.0001);
// }, [contract]);

  return (
    <div>
      {children }
    </div>
  );
};

export default WalletProvider;