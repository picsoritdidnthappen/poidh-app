import clsx, { ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Currency } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getBanSignatureFirstLine({
  id,
  chainId,
  type,
}: {
  id: number;
  chainId: number;
  type: 'claim' | 'bounty' | 'comment';
}) {
  return `Ban ${type} id: ${id} chainId: ${chainId}\n`;
}

export function getCommentSignatureFirstLine({ address }: { address: string }) {
  return `${address} wants to create a comment. Comment content: \n`;
}

export function getReactionSignatureMessage({
  address,
  commentId,
  type,
}: {
  address: string;
  commentId: number;
  type: 'upvote' | 'downvote';
}) {
  return `${address.toLocaleLowerCase()} wants to ${type} comment ${commentId}`;
}

export function formatAmount({
  amount,
  price,
  currency,
  precision,
}: {
  amount: string;
  price: string;
  currency: Currency;
  precision?: number;
}) {
  let numAmount = parseFloat(amount);
  const numPrice = parseFloat(price);
  const numAmountUSD = numAmount * numPrice;

  if (isNaN(numAmount) || isNaN(numPrice)) {
    return `0 ${currency}`;
  }

  if (numAmount < 0.00001) {
    return `<0.00001 ${currency}`;
  }

  if (currency === 'degen' && numAmount >= 1_000) {
    if (numAmount >= 10_000) {
      return `${formatAmountShort({
        amount: numAmount,
      })} ${currency} (${numAmountUSD.toFixed(2)} usd)`;
    } else {
      numAmount = Number(numAmount.toFixed(0));
    }
  }

  if (precision) {
    numAmount = Number(numAmount.toFixed(precision));
  }
  return `${numAmount} ${currency} (${numAmountUSD.toFixed(2)} usd)`;
}

export function formatSortAmount({
  amount,
  usdAmount,
  currency,
  precision,
}: {
  amount: string;
  usdAmount: number;
  currency: Currency;
  precision?: number;
}) {
  let numAmount = parseFloat(amount);

  if (isNaN(numAmount) || isNaN(usdAmount)) {
    return `0 ${currency}`;
  }

  if (numAmount < 0.00001) {
    return `<0.00001 ${currency}`;
  }

  if (currency === 'degen' && numAmount >= 1_000) {
    if (numAmount >= 10_000) {
      return `${formatAmountShort({
        amount: numAmount,
      })} ${currency} (${usdAmount.toFixed(2)} usd)`;
    } else {
      numAmount = Number(numAmount.toFixed(0));
    }
  }

  if (precision) {
    numAmount = Number(numAmount.toFixed(precision));
  }
  return `${numAmount} ${currency} (${usdAmount.toFixed(2)} usd)`;
}

export async function fetchPrice({ currency }: { currency: Currency }) {
  const response = await fetch(
    `https://api.coinbase.com/v2/exchange-rates?currency=${currency}`
  );
  const body = await response.json();
  return Number(body.data.rates.USD);
}

export function formatAmountShort({
  amount,
  precision = 2,
}: {
  amount: number;
  precision?: number;
}): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000_000_000_000_000_000)
    return (amount / 1_000_000_000_000_000_000_000).toFixed(2) + 'Sx';
  if (abs >= 1_000_000_000_000_000_000)
    return (amount / 1_000_000_000_000_000_000).toFixed(2) + 'Qi';
  if (abs >= 1_000_000_000_000_000)
    return (amount / 1_000_000_000_000_000).toFixed(2) + 'Qa';
  if (abs >= 1_000_000_000_000)
    return (amount / 1_000_000_000_000).toFixed(2) + 'T';
  if (abs >= 1_000_000_000) return (amount / 1_000_000_000).toFixed(2) + 'B';
  if (abs >= 1_000_000) return (amount / 1_000_000).toFixed(2) + 'M';
  if (abs >= 1_000) return (amount / 1_000).toFixed(2) + 'K';
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: precision,
  });
}

export function tryCatch<T, E = Error>(fn: () => T): [T, null] | [null, E] {
  try {
    const result = fn();
    return [result, null];
  } catch (error) {
    console.error(error);
    return [null, error as E];
  }
}

export async function tryCatchAsync<T, E = Error>(
  fn: () => Promise<T>
): Promise<[T, null] | [null, E]> {
  try {
    const result = await fn();
    return [result, null];
  } catch (error) {
    return [null, error as E];
  }
}
