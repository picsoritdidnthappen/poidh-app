import { z } from 'zod';
import { ETH_MIN_AMOUNT } from '@/utils/constants';

export const draftSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().min(1).max(20000),
    amount: z
      .string()
      .max(50)
      .regex(/^\d+(?:\.\d{1,18})?$/)
      .refine(
        (value) =>
          Number.isFinite(Number(value)) &&
          Number(value) >= ETH_MIN_AMOUNT
      ),
    chain: z.enum(['mainnet', 'base', 'arbitrum']),
    isOpenBounty: z.boolean(),
    album: z
      .string()
      .max(30)
      .refine(
        (value) => !value || /^[a-z]+(?:-[a-z]+)*$/.test(value)
      ),
  })
  .strict();

