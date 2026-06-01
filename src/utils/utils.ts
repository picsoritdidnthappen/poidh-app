import clsx, { ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Currency } from './types';
import {
  ARBITRUM_LAST_PRE_V3_BOUNTY,
  BASE_LAST_PRE_V3_BOUNTY,
  DEGEN_LAST_PRE_V3_BOUNTY,
} from './constants';

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

const alpha3ToAlpha2: Record<string, string> = {
  AFG: 'AF',
  ALB: 'AL',
  DZA: 'DZ',
  ASM: 'AS',
  AND: 'AD',
  AGO: 'AO',
  AIA: 'AI',
  ATA: 'AQ',
  ATG: 'AG',
  ARG: 'AR',
  ARM: 'AM',
  ABW: 'AW',
  AUS: 'AU',
  AUT: 'AT',
  AZE: 'AZ',
  BHS: 'BS',
  BHR: 'BH',
  BGD: 'BD',
  BRB: 'BB',
  BLR: 'BY',
  BEL: 'BE',
  BLZ: 'BZ',
  BEN: 'BJ',
  BMU: 'BM',
  BTN: 'BT',
  BOL: 'BO',
  BIH: 'BA',
  BWA: 'BW',
  BRA: 'BR',
  BRN: 'BN',
  BGR: 'BG',
  BFA: 'BF',
  BDI: 'BI',
  KHM: 'KH',
  CMR: 'CM',
  CAN: 'CA',
  CPV: 'CV',
  CYM: 'KY',
  CAF: 'CF',
  TCD: 'TD',
  CHL: 'CL',
  CHN: 'CN',
  COL: 'CO',
  COM: 'KM',
  COG: 'CG',
  COD: 'CD',
  COK: 'CK',
  CRI: 'CR',
  CIV: 'CI',
  HRV: 'HR',
  CUB: 'CU',
  CYP: 'CY',
  CZE: 'CZ',
  DNK: 'DK',
  DJI: 'DJ',
  DMA: 'DM',
  DOM: 'DO',
  ECU: 'EC',
  EGY: 'EG',
  SLV: 'SV',
  GNQ: 'GQ',
  ERI: 'ER',
  EST: 'EE',
  SWZ: 'SZ',
  ETH: 'ET',
  FJI: 'FJ',
  FIN: 'FI',
  FRA: 'FR',
  GAB: 'GA',
  GMB: 'GM',
  GEO: 'GE',
  DEU: 'DE',
  GHA: 'GH',
  GRC: 'GR',
  GRD: 'GD',
  GTM: 'GT',
  GIN: 'GN',
  GNB: 'GW',
  GUY: 'GY',
  HTI: 'HT',
  HND: 'HN',
  HKG: 'HK',
  HUN: 'HU',
  ISL: 'IS',
  IND: 'IN',
  IDN: 'ID',
  IRN: 'IR',
  IRQ: 'IQ',
  IRL: 'IE',
  ISR: 'IL',
  ITA: 'IT',
  JAM: 'JM',
  JPN: 'JP',
  JOR: 'JO',
  KAZ: 'KZ',
  KEN: 'KE',
  KIR: 'KI',
  PRK: 'KP',
  KOR: 'KR',
  KWT: 'KW',
  KGZ: 'KG',
  LAO: 'LA',
  LVA: 'LV',
  LBN: 'LB',
  LSO: 'LS',
  LBR: 'LR',
  LBY: 'LY',
  LIE: 'LI',
  LTU: 'LT',
  LUX: 'LU',
  MAC: 'MO',
  MDG: 'MG',
  MWI: 'MW',
  MYS: 'MY',
  MDV: 'MV',
  MLI: 'ML',
  MLT: 'MT',
  MHL: 'MH',
  MRT: 'MR',
  MUS: 'MU',
  MEX: 'MX',
  FSM: 'FM',
  MDA: 'MD',
  MCO: 'MC',
  MNG: 'MN',
  MNE: 'ME',
  MAR: 'MA',
  MOZ: 'MZ',
  MMR: 'MM',
  NAM: 'NA',
  NRU: 'NR',
  NPL: 'NP',
  NLD: 'NL',
  NZL: 'NZ',
  NIC: 'NI',
  NER: 'NE',
  NGA: 'NG',
  MKD: 'MK',
  NOR: 'NO',
  OMN: 'OM',
  PAK: 'PK',
  PLW: 'PW',
  PAN: 'PA',
  PNG: 'PG',
  PRY: 'PY',
  PER: 'PE',
  PHL: 'PH',
  POL: 'PL',
  PRT: 'PT',
  QAT: 'QA',
  ROU: 'RO',
  RUS: 'RU',
  RWA: 'RW',
  KNA: 'KN',
  LCA: 'LC',
  VCT: 'VC',
  WSM: 'WS',
  SMR: 'SM',
  STP: 'ST',
  SAU: 'SA',
  SEN: 'SN',
  SRB: 'RS',
  SYC: 'SC',
  SLE: 'SL',
  SGP: 'SG',
  SVK: 'SK',
  SVN: 'SI',
  SLB: 'SB',
  SOM: 'SO',
  ZAF: 'ZA',
  ESP: 'ES',
  LKA: 'LK',
  SDN: 'SD',
  SUR: 'SR',
  SWE: 'SE',
  CHE: 'CH',
  SYR: 'SY',
  TWN: 'TW',
  TJK: 'TJ',
  TZA: 'TZ',
  THA: 'TH',
  TLS: 'TL',
  TGO: 'TG',
  TON: 'TO',
  TTO: 'TT',
  TUN: 'TN',
  TUR: 'TR',
  TKM: 'TM',
  TUV: 'TV',
  UGA: 'UG',
  UKR: 'UA',
  ARE: 'AE',
  GBR: 'GB',
  USA: 'US',
  URY: 'UY',
  UZB: 'UZ',
  VUT: 'VU',
  VEN: 'VE',
  VNM: 'VN',
  YEM: 'YE',
  ZMB: 'ZM',
  ZWE: 'ZW',
  PSE: 'PS',
  XKX: 'XK',
};

export function getAlpha2CountryCode(code: string) {
  return code.length === 3 ? alpha3ToAlpha2[code.toUpperCase()] ?? code : code;
}

export function getFlagForCountryCode(code: string) {
  return getAlpha2CountryCode(code)
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

export function getCountryName(code: string) {
  const alpha2 = getAlpha2CountryCode(code).toUpperCase();
  return regionNames.of(alpha2) ?? code;
}

const LAST_V2_BOUNTY_BY_CHAIN: Record<number, number> = {
  42161: ARBITRUM_LAST_PRE_V3_BOUNTY,
  666666666: DEGEN_LAST_PRE_V3_BOUNTY,
  8453: BASE_LAST_PRE_V3_BOUNTY,
};

export function isV3Bounty(chainId: number, onChainId: number): boolean {
  if (chainId === 1) return true; // mainnet existed only on v3
  const lastV2 = LAST_V2_BOUNTY_BY_CHAIN[chainId];
  if (lastV2 === undefined) return false;
  return onChainId > lastV2;
}
