import clsx, { ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge classes with tailwind-merge with clsx full feature */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getNetworkNameFromPath(path: string) {
  const token = path.split('/')[1];
  let networkName: 'base' | 'degen' | 'arbitrum' = 'base';
  if (
    token &&
    (token === 'base' || token === 'degen' || token === 'arbitrum')
  ) {
    networkName = token;
  }

  return networkName;
}
