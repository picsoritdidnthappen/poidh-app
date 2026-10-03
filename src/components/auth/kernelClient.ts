import { arbitrum, base, mainnet, robinhood } from 'viem/chains';
import { createPublicClient, http } from 'viem';
import {
  createKernelAccount,
  createKernelAccountClient,
  createZeroDevPaymasterClient,
} from '@zerodev/sdk';
import { signerToEcdsaValidator } from '@zerodev/ecdsa-validator';
import { getEntryPoint, KERNEL_V3_3 } from '@zerodev/sdk/constants';
import clientEnv from '@/utils/clientEnv';

interface KernelClientOptions {
  /**
   * Allows Robinhood Chain ONLY for Smart Routing Address recovery.
   * Normal poidh sends remain restricted to Arbitrum, Base, and Ethereum.
   */
  allowRoutingRecovery?: boolean;
}

export async function getOrInitKernelClient(
  store: any,
  targetChainId: number,
  options: KernelClientOptions = {}
) {
  if (!store) return null;

  const isPoidhChain =
    targetChainId === base.id ||
    targetChainId === mainnet.id ||
    targetChainId === arbitrum.id;

  const isRobinhoodRecovery =
    options.allowRoutingRecovery === true && targetChainId === robinhood.id;

  // Validate BEFORE returning a cached client so a Robinhood recovery client
  // can never later bypass the normal poidh send-chain restriction.
  if (!isPoidhChain && !isRobinhoodRecovery) {
    throw new Error(
      `Unsupported chain for smart account sends: ${targetChainId}. Normal poidh sends support Arbitrum, Base, and Ethereum only.`
    );
  }

  const chainObj =
    targetChainId === base.id
      ? base
      : targetChainId === mainnet.id
      ? mainnet
      : targetChainId === arbitrum.id
      ? arbitrum
      : robinhood;

  const state = store.getState?.();
  const existing = state?.kernelClients?.get(targetChainId);
  if (existing) return existing;

  const eoaAccount = state?.eoaAccount;
  if (!eoaAccount) return null;

  const projectId = clientEnv.ZERODEV_PROJECT_ID;
  if (!projectId) {
    throw new Error(
      'Missing NEXT_PUBLIC_ZERODEV_PROJECT_ID: set it to your ZeroDev project ID.'
    );
  }

  // Preserve the existing poidh RPC setup for normal chains.
  // Robinhood exists here only for routing recovery, so use the ZeroDev
  // project RPC for the ERC-4337 account/client path on chain 4663.
  const zeroDevRpcUrl = `https://rpc.zerodev.app/api/v3/${projectId}/chain/${targetChainId}`;

  const rpcUrl =
    targetChainId === base.id
      ? clientEnv.BASE_RPC_URL || 'https://mainnet.base.org'
      : targetChainId === mainnet.id
      ? clientEnv.MAINNET_RPC_URL || 'https://ethereum-rpc.publicnode.com'
      : targetChainId === arbitrum.id
      ? clientEnv.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc'
      : zeroDevRpcUrl;

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

  const bundlerUrl = `${zeroDevRpcUrl}?provider=ULTRA_RELAY`;

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
