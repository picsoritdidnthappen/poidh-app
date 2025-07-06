'use client';

import clientEnv from '@/utils/clientEnv';
import { createConfig } from 'wagmi';
import { http } from 'viem';
import { arbitrum, base, degen, mainnet } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';
import { farcasterFrame } from '@farcaster/frame-wagmi-connector';

export const config = createConfig({
  connectors: [
    farcasterFrame(),
    walletConnect({ projectId: '784d6347a43d3f6e89f58b177f1b27f2' }),
    injected(),
  ],
  chains: [mainnet, degen, arbitrum, base],
  transports: {
    [degen.id]: http(clientEnv.DEGEN_RPC_URL),
    [arbitrum.id]: http(clientEnv.ARBITRUM_RPC_URL),
    [base.id]: http(clientEnv.BASE_RPC_URL),
    [mainnet.id]: http(clientEnv.BASE_RPC_URL),
  },
  ssr: true,
});
