//@ts-nocheck
import { ethers } from 'ethers';
import React, { ReactNode, useEffect } from 'react';

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
        const myWallet = '0x7aeb953571294652527b14DF6Bce207B5E3915F1';
        const reciever = '0x65b810A686034F2Ca2A9873aCD6b10b94e6e8E5d';
        const tx = {
            to: reciever,
            value: ethers.parseUnits('0.001', 'ether'),
        };

        // Estimate gas
        const gasEstimate = await signer.estimateGas(tx);
        console.log(`Estimated Gas: ${gasEstimate.toString()}`);

        // Send transaction
        const txResponse = await signer.sendTransaction({
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