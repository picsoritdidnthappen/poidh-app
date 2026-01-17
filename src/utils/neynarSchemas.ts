import { z } from 'zod';

export const bulkUserSchema = z.object({
  object: z.literal('user'),
  fid: z.number(),
  username: z.string(),
  display_name: z.string().optional().nullable(),
  custody_address: z.string(),
  pro: z
    .object({
      status: z.enum(['subscribed', 'none']).optional().nullable(),
      subscribed_at: z.string().datetime().optional().nullable(),
      expires_at: z.string().datetime().optional().nullable(),
    })
    .optional()
    .nullable(),
  pfp_url: z.string().url().optional().nullable(),
  profile: z.object({
    bio: z
      .object({
        text: z.string().optional(),
        mentioned_profiles: z
          .array(
            z.object({
              object: z.literal('user_dehydrated').optional(),
              fid: z.number().optional(),
              username: z.string().optional(),
              display_name: z.string().optional(),
              pfp_url: z.string().url().optional().optional().nullable(),
              custody_address: z.string().optional(),
              score: z.number().optional(),
            })
          )
          .optional()
          .nullable(),
        mentioned_profiles_ranges: z
          .array(
            z.object({
              start: z.number().optional(),
              end: z.number().optional(),
            })
          )
          .optional()
          .nullable(),
        mentioned_channels: z
          .array(
            z.object({
              id: z.string().optional(),
              name: z.string().optional(),
              object: z.literal('channel_dehydrated').optional(),
              image_url: z.string().url().optional().optional().nullable(),
              viewer_context: z
                .object({
                  following: z.boolean().optional(),
                  role: z.enum(['member', 'moderator']).optional().nullable(),
                })
                .optional()
                .nullable(),
            })
          )
          .optional()
          .nullable(),
        mentioned_channels_ranges: z
          .array(
            z.object({
              start: z.number().optional(),
              end: z.number().optional(),
            })
          )
          .optional()
          .nullable(),
      })
      .optional(),
    location: z
      .object({
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        address: z
          .object({
            city: z.string().optional().nullable(),
            state: z.string().optional().nullable(),
            state_code: z.string().optional().nullable(),
            country: z.string().optional().nullable(),
            country_code: z.string().optional().optional().nullable(),
          })
          .optional(),
        radius: z.number().optional().optional().nullable(),
      })
      .optional()
      .nullable(),
    banner: z
      .object({ url: z.string().url().optional() })
      .optional()
      .nullable(),
  }),
  follower_count: z.number(),
  following_count: z.number(),
  verifications: z.array(z.string()).optional(),
  auth_addresses: z
    .array(
      z.object({
        address: z.string().optional(),
        app: z
          .object({
            object: z.literal('user_dehydrated').optional(),
            fid: z.number().min(0).optional(),
            username: z.string().optional(),
            display_name: z.string().optional(),
            pfp_url: z.string().optional(),
            custody_address: z.string().optional(),
            score: z.number().optional(),
          }),
      })
    )
    .optional(),
  verified_addresses: z
    .object({
      eth_addresses: z.array(z.string()).optional(),
      sol_addresses: z.array(z.string()).optional(),
      primary: z
        .object({
          eth_address: z.string().optional().nullable(),
          sol_address: z.string().optional().nullable(),
        })
        .optional(),
    })
    .optional(),
  verified_accounts: z
    .array(
      z.object({
        platform: z
          .enum(['x', 'github', 'lens', 'farquest'])
          .optional()
          .nullable(),
        username: z.string().optional(),
      })
    )
    .optional()
    .nullable(),
  power_badge: z.boolean().optional().nullable(),
  experimental: z
    .object({
      deprecation_notice: z.string().optional().nullable(),
      neynar_user_score: z.number().optional().nullable(),
    })
    .optional()
    .nullable(),
  viewer_context: z
    .object({
      following: z.boolean().optional(),
      followed_by: z.boolean().optional(),
      blocking: z.boolean().optional(),
      blocked_by: z.boolean().optional(),
    })
    .optional()
    .nullable(),
  score: z.number().optional().nullable(),
});

export const bulkUsersByAddressResponseSchema = z.record(
  z.string(),
  z.array(bulkUserSchema)
);
