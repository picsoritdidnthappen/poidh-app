import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v4';
import { createNonce } from '@/trpc/nonce';
import { getDraftPublishMessage } from './draftSigning';
import { createHmac } from 'crypto';
import prisma from 'prisma/prisma';

const wallet = z.string().regex(/^0x[a-fA-F0-9]{40}$/);
const fields = {
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(20000),
  amount: z.string().max(50).regex(/^\d+(?:\.\d{1,18})?$/),
  chain: z.enum(['mainnet', 'base', 'arbitrum']),
  isOpenBounty: z.boolean(),
  album: z.string().max(30),
};

function json(value: Record<string, unknown>) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
    structuredContent: value,
  };
}

export function registerDraftTools(server: McpServer, mcpRequest?: Request) {
  const site = mcpRequest ? new URL(mcpRequest.url).origin : 'https://poidh.xyz';

  server.registerTool(
    'prepare_save_draft',
    {
      title: 'Prepare: publish a bounty draft',
      description:
        'Creates a one-time signing message for publishing a PUBLIC poidh bounty draft. ' +
        'The draft will appear in the public /feed. Do not request the signature ' +
        'until the user has approved the full draft and publication.',
      inputSchema: { creator: wallet, ...fields },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async ({ creator, ...draft }) => {
      const ip =
        mcpRequest?.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ||
        mcpRequest?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        'unknown';
    
      const secret = process.env.PINATA_JWT;
      if (!secret) {
        throw new Error('Draft publishing temporarily unavailable');
      }
    
      // Stable per-IP prefix without storing the raw IP.
      const prefix =
        'draft' +
        createHmac('sha256', secret)
          .update(ip)
          .digest('hex')
          .slice(0, 20);
    
      // Maximum 5 draft authorizations per IP per minute.
      const recent = await prisma.authNonces.count({
        where: {
          nonce: { startsWith: prefix },
          createdAt: { gt: new Date(Date.now() - 60_000) },
        },
      });
    
      if (recent >= 5) {
        throw new Error(
          'Too many draft authorization requests. Try again in one minute.'
        );
      }
    
      const nonce = await createNonce(prefix);
    
      return json({
        creator,
        nonce,
        draft,
        message: getDraftPublishMessage({ site, creator, nonce, draft }),
        signMethod: 'personal_sign / EIP-191',
        expiresInSeconds: 600,
        note: 'Have the named wallet sign this exact message; then call save_draft with these same draft fields, creator, nonce and signature. No ETH or gas is needed.',
      });
    }
  );

  server.registerTool(
    'save_draft',
    {
      title: 'Publish signed bounty draft',
      description:
        'Publishes a public bounty draft after verifying a one-time signed authorization. ' +
        'A published draft is publicly readable and appears in the poidh /feed. ' +
        'Requires the exact draft fields used in prepare_save_draft.',
      inputSchema: {
        creator: wallet,
        nonce: z.string().regex(/^[A-Za-z0-9]{8,128}$/),
        signature: z.string().max(8194).regex(/^0x(?:[0-9a-fA-F]{2})+$/),
        ...fields,
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ creator, nonce, signature, ...draft }) => {
      const headers: Record<string, string> = {
        'content-type': 'application/json',
        'x-poidh-agent-publish': '1',
        'x-poidh-agent-creator': creator,
        'x-poidh-agent-nonce': nonce,
        'x-poidh-agent-signature': signature,
      };
      // Forward the real request IP to the existing draft rate limiter.
      const forwardedFor = mcpRequest?.headers.get('x-forwarded-for');
      if (forwardedFor) headers['x-forwarded-for'] = forwardedFor;

      const { POST: postBountyDraft } = await import('@/app/api/bounty-drafts/route');
      const response = await postBountyDraft(
        new Request(`${site}/api/bounty-drafts`, {
          method: 'POST',
          headers,
          body: JSON.stringify(draft),
        })
      );
      const result = (await response.json()) as {
        error?: string;
        cid?: string;
        url?: string;
      };
      if (!response.ok || !result.url) {
        throw new Error(result.error ?? 'Draft publication failed');
      }
      return json({
        cid: result.cid,
        url: new URL(result.url, site).toString(),
        publicFeed: new URL('/feed', site).toString(),
        note: 'Draft published publicly. No onchain bounty was created or funded.',
      });
    }
  );
}
