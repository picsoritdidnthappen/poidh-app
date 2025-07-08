'use client';

import clientEnv from '@/utils/clientEnv';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'viem';
import { arbitrum, base, degen, mainnet } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'poidh',
  projectId: '784d6347a43d3f6e89f58b177f1b27f2',
  chains: [mainnet, degen, arbitrum, base],
  transports: {
    [degen.id]: http(clientEnv.DEGEN_RPC_URL),
    [arbitrum.id]: http(clientEnv.ARBITRUM_RPC_URL),
    [base.id]: http(clientEnv.BASE_RPC_URL),
    [mainnet.id]: http(clientEnv.BASE_RPC_URL),
  },
  ssr: true,
});
