//@ts-nocheck
import { useContract } from '@/app/context/web3';
import  { ReactNode, useEffect, useState, createContext } from 'react';
import { ethers, Contract, Signer } from 'ethers';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
// import { getContract, getSigner } from '@/app/context/web3';
import { getSigner, getContract, getContractRead, getProvider, fetchBounties } from '@/app/context/web3';

import abi from './abi';


interface WalletProviderProps {
  children: ReactNode;
}



export const WalletContext = createContext();




const WalletProvider =  ({ children }) => {
  const [contract, setContract] = useState(null);
  const [contractRead, setContractRead] = useState(null);


 
  

  // useEffect(() => {
  //   const fetchBountiesByUser = async () => {
  //     const signer = await getSigner(primaryWallet);
  //     const provider = await getProvider(primaryWallet);
  //     const contractRead = await getContractRead(provider);
  //     const userAddress = signer.address
  //     console.log(userAddress)
  
  //   //   const contract = await getContract(signer);
  //   //   setContract(contract);
  //   //   setContractRead(contractRead);
  
  //   //   console.log("i read bounties by user");
  
  //   //   const bounties = await contractRead.getBountiesByUser(userAddress, 5);
  //   //   const formattedBounties = bounties.map(bounty => ({
  //   //     id: bounty[0].toString(), 
  //   //     issuer: bounty[1],
  //   //     name: bounty[2],
  //   //     description: bounty[3], // Convert BigNumber to string for consistency
  //   //     claimer: bounty[5],
  //   //     createdAt: bounty[6],
  //   //     claimId: bounty[7]?.toString(), 
  //   //     participants: bounty[8], 
  //   //     participantAmounts: bounty[9], 
  //   //     yesVotes: bounty[10],
  //   //     noVotes: bounty[11],
  //   //     deadline: bounty[12],
  //   //     // Add or adjust fields as necessary
  //   //   }));
  //   //   console.log(formattedBounties);
  //   };
  
  //   if (primaryWallet) {
  //     fetchBountiesByUser().catch(console.error);
  //   }
  // }, [primaryWallet]);



// useEffect(() => {
//   createBounty('New Bounty', 'DisDas', 0.001);
// }, [primaryWallet]);


// const [contract, setContract] = useState(null);


// useEffect(() => {
//     const fetchContract = async () => {
//       const contract = await getContract();
//       setContract(contract);
// };
  
//     fetchContract().catch(console.error);
// }, []);
  
  




  // const [isSending, setIsSending] = useState(false);

  // const basicSend = async () => {
  //   if (isSending) return; // Prevent multiple invocations
  //   setIsSending(true);
  //   try {
  //     console.log("starting send ")
  //     const signer = await getSigner();
  //     console.log(signer?.address);
  //     let myWallet = '0x7aeb953571294652527b14DF6Bce207B5E3915F1';
  //     let receiver = '0x65b810A686034F2Ca2A9873aCD6b10b94e6e8E5d';
  //     let tx = {
  //         to: receiver,
  //         value: ethers.utils.parseUnits('0.001', 'ether'),
  //     };
  //     const gasEstimate = await signer.estimateGas(tx);
  //     console.log(`Estimated Gas: ${gasEstimate.toString()}`);
  //     let txResponse = await signer.sendTransaction({ ...tx, gasLimit: gasEstimate });
  //     console.log(txResponse);
  //   } catch (error) {
  //       console.error("Error occurred during basicSend:", error);
  //   } finally {
  //     setIsSending(false); // Reset the state after completion
  //   }
  // };

  // useEffect(() => {
  //   // Uncomment and adjust according to when you want to call basicSend or createBounty
  //   basicSend();
  // }, []); // Empty dependency array ensures this runs only once after initial render



// useEffect(() => {
//   basicSend();
// }, [signer]);





  return (
    <div>
      {children }
    </div>
  );
};

export default WalletProvider;