import { generateSiweNonce } from 'viem/siwe';
import prisma from 'prisma/prisma';
import { NONCE_TTL_MS } from '@/utils/authConfig';

/**
 * Makes a one-time random value for the client to put in a message it signs,
 * so the signed message can only be used once. Also clears out nonces old
 * enough to have expired.
 */
export async function createNonce() {
  const nonce = generateSiweNonce();
  const cutoff = new Date(Date.now() - NONCE_TTL_MS);

  await prisma.$transaction([
    prisma.authNonces.deleteMany({ where: { createdAt: { lte: cutoff } } }),
    prisma.authNonces.create({ data: { nonce } }),
  ]);

  return nonce;
}

/**
 * Marks a nonce as used. Returns false if it doesn't exist, has expired, or
 * was already used.
 */
export async function claimNonce(nonce: string) {
  // A single update, so two requests racing with the same nonce can't both
  // claim it
  const { count } = await prisma.authNonces.updateMany({
    where: {
      nonce,
      usedAt: null,
      createdAt: { gt: new Date(Date.now() - NONCE_TTL_MS) },
    },
    data: { usedAt: new Date() },
  });

  return count === 1;
}
