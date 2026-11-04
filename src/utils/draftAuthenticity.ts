import { verifyMessage } from 'viem';
import { cache } from 'react';
import axios from 'axios';
import { unstable_cache } from 'next/cache';
import { draftSchema } from '@/utils/draftSchema';
import { z } from 'zod';
import { getDraftPublishMessage } from '@/mcp/draftSigning';
import { chains } from '@/utils/config';

const authorizationSchema = z.object({
  method: z.literal('eip191'),
  site: z.enum(['https://poidh.xyz', 'https://staging.poidh.xyz']),
  nonce: z.string().regex(/^[A-Za-z0-9]{8,128}$/),
  signature: z.string().regex(/^0x(?:[0-9a-fA-F]{2})+$/).max(8194),
});

const storedDraftSchema = z.object({
  type: z.literal('poidh-bounty-draft'),
  version: z.literal(1),
  creator: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(20000),
  amount: z.string().regex(/^\d+(?:\.\d{1,18})?$/),
  chain: z.enum(['mainnet', 'base', 'arbitrum']),
  isOpenBounty: z.boolean(),
  album: z.string().max(30),
  createdAt: z.string().datetime(),
  authorization: z.unknown().optional(),
});

class DraftNotFound extends Error {}

export const CID_PATTERN = /^b[a-z2-7]{30,120}$/;

const getRawDraft = unstable_cache(async (cid: string) => {
  const gateway = process.env.PINATA_DRAFT_GATEWAY_URL?.trim();
  if (!gateway) throw new Error('Draft gateway not configured');
  const base = new URL(gateway);
  if (base.protocol !== 'https:') throw new Error('Draft gateway must use HTTPS');
  const url = new URL(base.origin);
  url.pathname = `${base.pathname.replace(/\/+(?:ipfs)?\/?$/, '')}/ipfs/${cid}`;
  let response;
  try {
    response = await axios.get<string>(url.toString(), {
      adapter: 'http', responseType: 'text', timeout: 12000,
      maxContentLength: 30000, maxRedirects: 0,
      headers: { Accept: 'application/json' },
    });
  } catch (error) {
    const info = error as { response?: { status?: number }; code?: string };
    if (info.response?.status === 404) throw new DraftNotFound();
    console.error('Draft gateway request failed', { status: info.response?.status, code: info.code });
    throw new Error('Draft gateway request failed');
  }
  if (typeof response.data !== 'string' || Buffer.byteLength(response.data, 'utf8') > 30000) return null;
  try {
    const parsed = storedDraftSchema.safeParse(JSON.parse(response.data));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}, ['poidh-bounty-draft-gateway-v5'], { revalidate: 86400 });

const getVerdict = unstable_cache(async (cid: string, expectedSite: string | null) => {
  const draft = await getRawDraft(cid);
  if (!draft) return null;
  return getAuthenticity(cid, draft, expectedSite);
}, ['poidh-draft-verdict-v1'], { revalidate: 60 });

export const getVerifiedDraft = cache(async (cid: string, expectedSite: string | null) => {
  if (!CID_PATTERN.test(cid)) return null;
  try {
    const verdict = await getVerdict(cid, expectedSite);
    if (!verdict) return null;
    const draft = await getRawDraft(cid);
    if (!draft) return null;
    const fields = draftSchema.safeParse({ title: draft.title, description: draft.description, amount: draft.amount, chain: draft.chain, isOpenBounty: draft.isOpenBounty, album: draft.album });
    if (!fields.success) return null;
    const authorization = authorizationSchema.safeParse(draft.authorization);
    const { createdAt, ...rest } = draft;
    return { ...rest, ...fields.data, ...(verdict === 'pin' ? { createdAt } : {}), authorization: authorization.success ? authorization.data : undefined };
  } catch (error) {
    if (error instanceof DraftNotFound) return null;
    throw error;
  }
});

export async function isAuthenticDraft(
  cid: string,
  draft: unknown,
  expectedSite: string | null = null
): Promise<boolean> {
  return (await getAuthenticity(cid, draft, expectedSite)) !== null;
}

async function getAuthenticity(cid: string, draft: unknown, expectedSite: string | null): Promise<'signature' | 'pin' | null> {
  const record = storedDraftSchema.pick({ creator: true, title: true, description: true, amount: true, chain: true, isOpenBounty: true, album: true, authorization: true }).safeParse(draft);
  const authorization = authorizationSchema.safeParse(record.success ? record.data.authorization : undefined);
  const parsed = record.success ? draftSchema.safeParse({
    title: record.data.title, description: record.data.description, amount: record.data.amount,
    chain: record.data.chain, isOpenBounty: record.data.isOpenBounty, album: record.data.album,
  }) : null;
  // Malformed authorization must not prevent a valid poidh pin from being checked.
  const creator = z
    .object({ creator: z.string().regex(/^0x[a-fA-F0-9]{40}$/) })
    .safeParse(draft);
  if (!creator.success || !parsed?.success) return null;
  let rpcError: unknown;

  if (parsed?.success && authorization.success && (!expectedSite || authorization.data.site === expectedSite)) {
    const fields = parsed.data;
    const message = getDraftPublishMessage({
      site: authorization.data.site,
      nonce: authorization.data.nonce,
      creator: creator.data.creator,
      draft: fields,
    });
    const args = {
      address: creator.data.creator as `0x${string}`,
      message,
      signature: authorization.data.signature as `0x${string}`,
    };
    const local = await verifyMessage(args).catch(() => false);
    if (local) return 'signature';
    try {
      if (await chains[fields.chain].provider.verifyMessage(args)) return 'signature';
    } catch (error) {
      rpcError = error;
    }
  }

  const jwt = process.env.PINATA_DRAFTS_READ_JWT?.trim();
  if (!jwt) throw new Error('Draft lookup JWT is not configured');
  const url = new URL('https://api.pinata.cloud/data/pinList');
  url.searchParams.set('status', 'pinned');
  url.searchParams.set('hashContains', cid);
  url.searchParams.set('metadata[name]', 'poidh-bounty-draft');
  let response: Response;
  try {
    response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${jwt}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
  } catch (error) {
    console.error('Pinata draft lookup failed', { code: (error as { code?: string }).code });
    throw new Error('Pinata draft lookup failed');
  }
  if (!response.ok) {
    console.error('Pinata draft lookup failed', { status: response.status });
    throw new Error('Pinata draft lookup failed');
  }
  const result = (await response.json()) as {
    rows?: {
      ipfs_pin_hash?: string;
      metadata?: { keyvalues?: Record<string, string> };
    }[];
  };
  if (!Array.isArray(result.rows))
    throw new Error('Invalid Pinata draft lookup response');
  const pinned = result.rows.some(
    (row) =>
      row.ipfs_pin_hash === cid &&
      row.metadata?.keyvalues?.type === 'bounty-draft' &&
      row.metadata.keyvalues.creator === creator.data.creator.toLowerCase()
  );
  if (pinned) return 'pin';
  if (rpcError) throw rpcError;
  return null;
}
