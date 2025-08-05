import { z } from 'zod';

export const bulkUserSchema = z.object({
  object: z.literal('user'),
  fid: z.number(),
  username: z.string(),
  display_name: z.string().optional().nullable(),
  custody_address: z.string(),
  pro: z
    .object({
      status: z.enum(['subscribed', 'none']).optional().optional().nullable(),
      subscribed_at: z.string().datetime().optional().optional().nullable(),
      expires_at: z.string().datetime().optional().optional().nullable(),
    })
    .optional()
    .optional()
    .nullable(),
  pfp_url: z.string().url().optional().nullable(),
  profile: z.object({
    bio: z.object({
      text: z.string(),
      mentioned_profiles: z
        .array(
          z.object({
            object: z.literal('user_dehydrated'),
            fid: z.number(),
            username: z.string(),
            display_name: z.string(),
            pfp_url: z.string().url().optional().optional().nullable(),
            custody_address: z.string(),
          })
        )
        .optional()
        .optional()
        .nullable(),
      mentioned_profiles_ranges: z
        .array(z.object({ start: z.number(), end: z.number() }))
        .optional()
        .optional()
        .nullable(),
      mentioned_channels: z
        .array(
          z.object({
            id: z.string(),
            name: z.string(),
            object: z.literal('channel_dehydrated'),
            image_url: z.string().url().optional().optional().nullable(),
            viewer_context: z
              .object({
                following: z.boolean(),
                role: z
                  .enum(['member', 'moderator'])
                  .optional()
                  .optional()
                  .nullable(),
              })
              .optional()
              .optional()
              .nullable(),
          })
        )
        .optional()
        .optional()
        .nullable(),
      mentioned_channels_ranges: z
        .array(z.object({ start: z.number(), end: z.number() }))
        .optional()
        .optional()
        .nullable(),
    }),
    location: z
      .object({
        latitude: z.number(),
        longitude: z.number(),
        address: z.object({
          city: z.string().optional().optional().nullable(),
          state: z.string().optional().optional().nullable(),
          state_code: z.string().optional().optional().nullable(),
          country: z.string().optional().optional().nullable(),
          country_code: z.string().optional().optional().nullable(),
        }),
        radius: z.number().optional().optional().nullable(),
      })
      .optional()
      .optional()
      .nullable(),
    banner: z
      .object({ url: z.string().url() })
      .optional()
      .optional()
      .nullable(),
  }),
  follower_count: z.number(),
  following_count: z.number(),
  verifications: z.array(z.string()),
  verified_addresses: z.object({
    eth_addresses: z.array(z.string()),
    sol_addresses: z.array(z.string()),
    primary: z.object({
      eth_address: z.string().optional().nullable(),
      sol_address: z.string().optional().nullable(),
    }),
  }),
  verified_accounts: z
    .array(
      z.object({
        platform: z
          .enum(['x', 'github', 'lens', 'farquest'])
          .optional()
          .optional()
          .nullable(),
        username: z.string(),
      })
    )
    .optional()
    .optional()
    .nullable(),
  power_badge: z.boolean().optional().optional().nullable(),
  experimental: z
    .object({
      deprecation_notice: z.string().optional().optional().nullable(),
      neynar_user_score: z.number().optional().optional().nullable(),
    })
    .optional()
    .optional()
    .nullable(),
  viewer_context: z
    .object({
      following: z.boolean(),
      followed_by: z.boolean(),
      blocking: z.boolean(),
      blocked_by: z.boolean(),
    })
    .optional()
    .optional()
    .nullable(),
  score: z.number().optional().optional().nullable(),
});

export const bulkUsersByAddressResponseSchema = z.record(
  z.string(),
  z.array(bulkUserSchema)
);
