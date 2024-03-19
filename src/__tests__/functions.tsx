//@ts-nocheck

import { Contract, ethers } from "ethers";

import abi from '../app/context/abi';


export function getProvider() {
  return new ethers.BrowserProvider(window.ethereum)
}

export function getSigner(provider) {
  return provider.getSigner();
}


export function getContract(address, signer) {
  return new Contract(address, abi, signer);
}
