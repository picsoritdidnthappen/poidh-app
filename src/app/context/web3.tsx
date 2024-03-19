//@ts-nocheck

import { useEffect, useState } from 'react';
import { ethers, Contract, Signer } from 'ethers';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import abi from '@/app/context/abi';

interface SignerState {
  signer: Signer | null;
}

interface ContractState {
  contract: Contract | null;
}

export const useContract = () => {
  const [signerState, setSignerState] = useState<SignerState>({ signer: null });

  const [contractState, setContractState] = useState<ContractState>({ contract: null });
  const { primaryWallet } = useDynamicContext();

  useEffect(() => {

  const getBalance = async () => {
    const balance = await primaryWallet?.connector.getBalance();
    return balance;
  };
 
  getBalance()
}, [primaryWallet]);

  useEffect(() => {
    const fetchSigner = async () => {
      const signer = await primaryWallet?.connector.ethers?.getSigner();
      if (signer) {
        setSignerState({ signer });
      }
    };

    fetchSigner();
  }, [primaryWallet]);

  useEffect(() => {
    if (signerState.signer) {
      const contractAddress = "0x0Aa50ce0d724cc28f8F7aF4630c32377B4d5c27d";
      // const signerAddress = signerState.signer.getAddress();

      // console.log(signerAddress)

      const contractInstance = new ethers.Contract(contractAddress, abi, signerState.signer);
      setContractState({ contract: contractInstance });
    }
  }, [signerState]);



  return {

    signer: signerState.signer,
    contract: contractState.contract
  };
};
