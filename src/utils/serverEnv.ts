import z from 'zod';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  DATABASE_URL: z.string().startsWith('postgresql://'),
  PORT: z.coerce.number().default(3000),
  ADMINS: z
    .string()
    .default('')
    .transform((v) =>
      v
        .toLowerCase()
        .split(',')
        .map((v) => v.trim())
    ),
  VERCEL_URL: z.string().default('https://poidh.xyz'),
  NEXT_PUBLIC_APP_URL: z.string().default('https://poidh.xyz'),
  MAINNET_RPC_URL: z.string(),
  DEGEN_RPC_URL: z.string(),
  ARBITRUM_RPC_URL: z.string(),
  BASE_RPC_URL: z.string(),
  NEYNAR_API_KEY: z.string().optional(),
  NEYNAR_CLIENT_ID: z.string(),
});

export default envSchema.parse(process.env);
