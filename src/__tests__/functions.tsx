import { IEthereum } from '@dynamic-labs/ethereum';
import { Contract, ethers, JsonRpcApiProvider } from 'ethers';

import abi from '../app/context/abi';

export function getProvider() {
  return new ethers.BrowserProvider(window.ethereum as IEthereum);
}

export function getSigner(provider: JsonRpcApiProvider) {
  return provider.getSigner();
}

export function getContract(address: string, signer: ethers.ContractRunner) {
  return new Contract(address, abi, signer);
}
