import { action, makeObservable, observable } from 'mobx';

import { chains } from '@/app/context';
import { Chain } from '@/types';

class ChainStatusStore {
  currentChain = chains.base;

  constructor() {
    makeObservable(this, {
      currentChain: observable,
      setCurrentChain: action,
    });
  }

  setCurrentChain(chain: Chain) {
    this.currentChain = chain;
  }

  setCurrentChainFromNetwork(network?: string) {
    switch (network) {
      case 'degen':
        this.setCurrentChain(chains.degen);
        break;
      case 'base':
        this.setCurrentChain(chains.base);
        break;
      case 'arbitrum':
        this.setCurrentChain(chains.arbitrum);
        break;
    }
  }
}

export default new ChainStatusStore();
