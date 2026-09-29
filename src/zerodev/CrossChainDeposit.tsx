'use client';

import { useState } from 'react';
import { useAccount, useSendTransaction, useSwitchChain } from 'wagmi';
import { formatEther, parseEther, zeroAddress } from 'viem';
import {
  DEPOSIT_SOURCE_CHAIN_IDS,
  RELAY_QUOTE_URL,
  ZERODEV_DESTINATION_CHAIN,
} from '@/zerodev/config';

const SOURCE_CHAINS: Record<number, string> = {
  1: 'Ethereum',
  8453: 'Base',
  42161: 'Arbitrum',
  666666666: 'Degen',
};

interface RelayTx {
  to: `0x${string}`;
  data: `0x${string}`;
  value: string;
  chainId: number;
}
interface RelayQuote {
  steps: { id: string; items: { data: RelayTx }[] }[];
  details: { currencyOut: { amountFormatted: string } };
}

function isValidAmount(input: string): boolean {
  try {
    return parseEther(input) > BigInt(0);
  } catch {
    return false;
  }
}

/**
 * Cross-chain deposit: fund your poidh account on Arbitrum with ETH
 * held on any supported chain. Quotes come from Relay (relay.link);
 * the user signs one bridge transaction on the origin chain and the
 * funds arrive at the same address on Arbitrum — ready to create or
 * fund bounties. Works for EOAs and ZeroDev smart accounts alike
 * (smart accounts simply receive on Arbitrum).
 */
export function CrossChainDeposit() {
  const { address, chain } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { sendTransactionAsync } = useSendTransaction();
  const [sourceChainId, setSourceChainId] = useState<number>(8453);
  const [amount, setAmount] = useState('0.005');
  const [status, setStatus] = useState<string>('');

  if (!address) return null;

  const deposit = async () => {
    if (!isValidAmount(amount)) {
      setStatus('enter an amount > 0');
      return;
    }
    setStatus('quoting…');
    try {
      const res = await fetch(RELAY_QUOTE_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          user: address,
          originChainId: sourceChainId,
          destinationChainId: ZERODEV_DESTINATION_CHAIN.id,
          originCurrency: zeroAddress,
          destinationCurrency: zeroAddress,
          amount: parseEther(amount).toString(),
          recipient: address,
          tradeType: 'EXACT_INPUT',
        }),
      });
      if (!res.ok) throw new Error(`quote failed (${res.status})`);
      const quote = (await res.json()) as RelayQuote;
      const tx = quote.steps
        .flatMap((s) => s.items)
        .map((i) => i.data)
        .find((d) => d.chainId === sourceChainId && d.to && d.data);
      if (!tx) throw new Error('no executable step in quote');

      if (chain?.id !== sourceChainId) {
        setStatus(`switch to ${SOURCE_CHAINS[sourceChainId]}…`);
        await switchChainAsync({ chainId: sourceChainId });
      }
      setStatus('sign bridge tx…');
      const hash = await sendTransactionAsync({
        to: tx.to,
        data: tx.data,
        value: BigInt(tx.value),
        chainId: sourceChainId,
      });
      setStatus(
        `submitted ${hash.slice(0, 10)}… — expect ~${
          quote.details.currencyOut.amountFormatted
        } ETH on Arbitrum`
      );
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'deposit failed');
    }
  };

  return (
    <div className='border-[#D1ECFF] rounded-lg backdrop-blur-sm bg-white/30 p-3 flex flex-col gap-2'>
      <span className='text-sm font-semibold'>
        fund on Arbitrum from any chain
      </span>
      <div className='flex gap-2 items-center'>
        <select
          value={sourceChainId}
          onChange={(e) => setSourceChainId(Number(e.target.value))}
          className='bg-transparent border rounded p-1'
          aria-label='source chain'
        >
          {DEPOSIT_SOURCE_CHAIN_IDS.filter(
            (id) => id !== ZERODEV_DESTINATION_CHAIN.id
          ).map((id) => (
            <option key={id} value={id}>
              {SOURCE_CHAINS[id]}
            </option>
          ))}
        </select>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className='w-20 bg-transparent border rounded p-1'
          placeholder={formatEther(parseEther('0.005'))}
          aria-label='amount in ETH'
        />
        <button
          onClick={deposit}
          className='border-[#D1ECFF] rounded-lg bg-white/30 p-1 px-2 hover:bg-white/20'
        >
          deposit
        </button>
      </div>
      {status && <span className='text-xs opacity-80'>{status}</span>}
    </div>
  );
}
