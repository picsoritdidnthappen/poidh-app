import { arbitrum, base, mainnet } from 'viem/chains';
import { createPublicClient, http } from 'viem';
import {
  createKernelAccount,
  createKernelAccountClient,
  createZeroDevPaymasterClient,
} from '@zerodev/sdk';
import { signerToEcdsaValidator } from '@zerodev/ecdsa-validator';
import { getEntryPoint, KERNEL_V3_3 } from '@zerodev/sdk/constants';
import clientEnv from '@/utils/clientEnv';

export async function getOrInitKernelClient(store: any, targetChainId: number) {
  if (!store) return null;
  const state = store.getState?.();
  const existing = state?.kernelClients?.get(targetChainId);
  if (existing) return existing;

  const eoaAccount = state?.eoaAccount;
  if (!eoaAccount) return null;

  const chainObj =
    targetChainId === base.id
      ? base
      : targetChainId === mainnet.id
      ? mainnet
      : arbitrum;

  const rpcUrl =
    targetChainId === base.id
      ? clientEnv.BASE_RPC_URL || 'https://mainnet.base.org'
      : targetChainId === mainnet.id
      ? clientEnv.MAINNET_RPC_URL || 'https://ethereum-rpc.publicnode.com'
      : clientEnv.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc';

  const publicClient = createPublicClient({
    chain: chainObj,
    transport: http(rpcUrl),
  });

  let kernelAccount = state?.kernelAccounts?.get(targetChainId);
  if (!kernelAccount) {
    const entryPoint = getEntryPoint('0.7');
    const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
      signer: eoaAccount,
      entryPoint,
      kernelVersion: KERNEL_V3_3,
    });

    kernelAccount = await createKernelAccount(publicClient, {
      entryPoint,
      kernelVersion: KERNEL_V3_3,
      plugins: { sudo: ecdsaValidator },
    });
    state?.setKernelAccount?.(targetChainId, kernelAccount);
  }

  const projectId =
    clientEnv.ZERODEV_PROJECT_ID || 'd577c9aa-a50c-40b3-adb9-2232e7f8edd1';
  const bundlerUrl = `https://rpc.zerodev.app/api/v3/${projectId}/chain/${targetChainId}?provider=ULTRA_RELAY`;

  const kernelClient = createKernelAccountClient({
    account: kernelAccount,
    bundlerTransport: http(bundlerUrl),
    chain: chainObj,
    client: publicClient,
    paymaster: createZeroDevPaymasterClient({
      chain: chainObj,
      transport: http(bundlerUrl),
    }),
  });

  state?.setKernelClient?.(targetChainId, kernelClient);

  return kernelClient;
}
