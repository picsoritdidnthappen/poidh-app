import { BountyResponse } from '@/app/api/bounties/[chainName]/[bountyId]/route';
import clsx, { ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Currency } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatWalletAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function getBanSignatureFirstLine({
  id,
  chainId,
  type,
}: {
  id: number;
  chainId: number;
  type: 'claim' | 'bounty';
}) {
  return `Ban ${type} id: ${id} chainId: ${chainId}\n`;
}

export const fetchBounty = async (
  chainName: string | null,
  bountyId: string | null
): Promise<BountyResponse> => {
  const response = await fetch(
    `https://poidh-app-theta.vercel.app/api/bounties/${chainName}/${bountyId}`
  );
  const data = await response.json();

  return data as BountyResponse;
};

export function formatAmount({
  amount,
  price,
  currency,
}: {
  amount: string;
  price: string;
  currency: Currency;
}) {
  const numAmount = parseFloat(amount);
  const numPrice = parseFloat(price);
  const numAmountUSD = numAmount * numPrice;

  if (isNaN(numAmount) || isNaN(numPrice)) {
    return `0 ${currency}`;
  }

  if (numAmount < 0.001) {
    return `<0.001 ${currency}`;
  }

  return `${numAmount} ${currency} (${numAmountUSD.toFixed(2)} usd)`;
}

export async function fetchPrice({ currency }: { currency: Currency }) {
  const response = await fetch(
    `https://api.coinbase.com/v2/exchange-rates?currency=${currency}`
  );
  const body = await response.json();
  return Number(body.data.rates.USD);
}
