import { getAddress } from 'viem';
import { z } from 'zod';

export const addressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/)
  .transform((v) => getAddress(v));

export const chainNameSchema = z
  .string()
  .regex(/^(degen|arbitrum|base)$/)
  .transform((v) => v as 'degen' | 'arbitrum' | 'base');

export const bytes32Schema = z
  .string()
  .regex(/^(0x)?[a-fA-F0-9]{64}$/)
  .transform((v) => (v.startsWith('0x') ? v : '0x' + v) as `0x${string}`);

export const bytesSchema = z
  .string()
  .regex(/^(0x)?([a-fA-F0-9]{2})*$/)
  .transform((v) => (v.startsWith('0x') ? v : '0x' + v) as `0x${string}`);
