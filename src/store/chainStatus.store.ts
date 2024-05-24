import { action,makeObservable, observable } from "mobx";

import chains from '../app/context/config';

class ChainStatusStore {
    currentChain = chains.degen;

    constructor() {
        makeObservable(this, {
            currentChain: observable,   
            setCurrentChain: action,
        })
    }

    setCurrentChain(chain: any) {
        this.currentChain = chain;
    }
}

export default new ChainStatusStore();