import z from 'zod';

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
});

export default envSchema.parse(process.env);
