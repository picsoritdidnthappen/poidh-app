import type { Prisma } from 'generated/prisma/client';
import prisma from 'prisma/prisma';

type BanRow = {
  chainId: number;
  claimId: number | null;
  claimOnChainId: number | null;
};

let cached: { filter: Prisma.ClaimsWhereInput; expires: number } | null = null;
/** Short TTL so new bans apply quickly across serverless instances. */
const CACHE_TTL_MS = 5_000;

export function invalidateClaimBanFilterCache() {
  cached = null;
}

export function buildClaimsNotBannedWhereFromBanRows(
  rows: BanRow[]
): Prisma.ClaimsWhereInput {
  const orExclude: Prisma.ClaimsWhereInput[] = [];
  for (const b of rows) {
    if (b.claimId != null) {
      orExclude.push({ AND: [{ chainId: b.chainId }, { id: b.claimId }] });
    }
    if (b.claimOnChainId != null) {
      orExclude.push({
        AND: [{ chainId: b.chainId }, { onChainId: b.claimOnChainId }],
      });
    }
  }
  if (orExclude.length === 0) {
    return { ban: { none: {} } };
  }
  // AND-of-NOT avoids some Prisma/SQL edge cases with NOT+OR on large lists and
  // matches NOT (c1 OR c2 OR …) for independent row predicates.
  return { AND: orExclude.map((condition) => ({ NOT: condition })) };
}

/**
 * Rows in Ban that refer to a claim (by internal id and/or stable on-chain id).
 * Resolves missing `claimOnChainId` from current `Claims` so filters stay correct
 * after indexer remaps internal `id` while `on_chain_id` stays stable.
 */
export async function fetchClaimBanRows(): Promise<BanRow[]> {
  const rows = await prisma.ban.findMany({
    where: {
      OR: [{ claimId: { not: null } }, { claimOnChainId: { not: null } }],
    },
    select: { chainId: true, claimId: true, claimOnChainId: true },
  });

  const needsOnChain = rows.filter(
    (r): r is BanRow & { claimId: number } =>
      r.claimId != null && r.claimOnChainId == null
  );
  if (needsOnChain.length === 0) {
    return rows;
  }

  const claims = await prisma.claims.findMany({
    where: {
      OR: needsOnChain.map((b) => ({
        chainId: b.chainId,
        id: b.claimId,
      })),
    },
    select: { id: true, chainId: true, onChainId: true },
  });
  const onChainByKey = new Map(
    claims.map((c) => [`${c.chainId}:${c.id}`, c.onChainId] as const)
  );

  return rows.map((b) => {
    if (b.claimId == null || b.claimOnChainId != null) {
      return b;
    }
    const oc = onChainByKey.get(`${b.chainId}:${b.claimId}`);
    return oc == null ? b : { ...b, claimOnChainId: oc };
  });
}

export async function getClaimsNotBannedPrismaFilter(): Promise<Prisma.ClaimsWhereInput> {
  const now = Date.now();
  if (cached && cached.expires > now) {
    return cached.filter;
  }
  const rows = await fetchClaimBanRows();
  const filter = buildClaimsNotBannedWhereFromBanRows(rows);
  cached = { filter, expires: now + CACHE_TTL_MS };
  return filter;
}
