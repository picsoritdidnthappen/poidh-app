import { BountyResponse } from '@/app/(root)/api/bounties/[chainName]/[bountyId]/route';
import clsx, { ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Currency, SocialType } from './types';

export const TWITTER_URL_REGEX =
  /^https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/([^\/]+)\/?$/i;
export const FARCASTER_URL_REGEX =
  /^https?:\/\/(?:www\.)?warpcast\.com\/([^\/]{1,30})\/?$/i;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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

export function getAddSocialSignatureFirstLine({
  link,
  type,
  address,
}: {
  link: string;
  type: SocialType;
  address: string;
}) {
  return `Add ${type}: ${link} for ${address}\n`;
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

export async function fetchPrice({ currency }: { currency: Currency }) {
  const response = await fetch(
    `https://api.coinbase.com/v2/exchange-rates?currency=${currency}`
  );
  const body = await response.json();
  return Number(body.data.rates.USD);
}
