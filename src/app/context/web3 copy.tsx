//@ts-nocheck

import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { Contract } from "ethers";

import abi from './abi';



export const getSigner = async () => {
  const { primaryWallet } = useDynamicContext();
  const signer = await primaryWallet?.connector.ethers?.getSigner();
  return signer;
}

export const getContract = async () =>  {
  const { primaryWallet } = useDynamicContext();
  const signer = await primaryWallet?.connector.ethers?.getSigner();
  const contractAddress = "0x0Aa50ce0d724cc28f8F7aF4630c32377B4d5c27d";
  return new Contract(contractAddress, abi, signer);
}



// export const tokenContract = async (address) => {
//   const provider = new ethers.providers.Web3Provider(window.ethereum);
//   const { ethereum } = window;

//   if (ethereum) {
//     const signer = provider.getSigner();

//     const contractReader = new ethers.Contract(
//       address,
//       CustomTokenABI.abi,
//       signer
//     );

//     return contractReader;
//   }
// };
