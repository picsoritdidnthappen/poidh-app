import { createPublicClient, http } from 'viem';
import { arbitrum, base, degen, mainnet } from 'viem/chains';
import clientEnv from './clientEnv';

export const mainnetPublicClient = createPublicClient({
  chain: mainnet,
  transport: http(clientEnv.MAINNET_RPC_URL),
});

export const basePublicClient = createPublicClient({
  chain: base,
  transport: http(clientEnv.BASE_RPC_URL),
});

export const degenPublicClient = createPublicClient({
  chain: degen,
  transport: http(clientEnv.DEGEN_RPC_URL),
});

export const arbitrumPublicClient = createPublicClient({
  chain: arbitrum,
  transport: http(clientEnv.ARBITRUM_RPC_URL),
});
