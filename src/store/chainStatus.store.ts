import { action, makeObservable, observable } from 'mobx';
import chains from '../app/context/config';

class ChainStatusStore {
  currentChain = chains.base;

  constructor() {
    makeObservable(this, {
      currentChain: observable,
      setCurrentChain: action,
    });
  }

  setCurrentChain(chain: any) {
    this.currentChain = chain;
  }

  async setCurrentChainFromNetwork(
    network?: string,
    asyncMode: boolean = false
  ) {
    const setChain = (chain: any) => {
      this.setCurrentChain(chain);
    };

    if (asyncMode) {
      switch (network) {
        case 'degen':
          return new Promise<void>((resolve) => {
            setChain(chains.degen);
            resolve();
          });
        case 'base':
          return new Promise<void>((resolve) => {
            setChain(chains.base);
            resolve();
          });
        case 'arbitrum':
          return new Promise<void>((resolve) => {
            setChain(chains.arbitrum);
            resolve();
          });
        default:
          return Promise.resolve();
      }
    } else {
      switch (network) {
        case 'degen':
          setChain(chains.degen);
          break;
        case 'base':
          setChain(chains.base);
          break;
        case 'arbitrum':
          setChain(chains.arbitrum);
          break;
      }
    }
  }
}

export default new ChainStatusStore();
