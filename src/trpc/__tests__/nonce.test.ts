import prisma from 'prisma/prisma';
import { isNonceUsable } from '../nonce';
import { NONCE_TTL_MS } from '@/utils/authConfig';

jest.mock('prisma/prisma', () => ({ __esModule: true, default: { authNonces: { findFirst: jest.fn() } } }));

test('checks nonce, unused state, and TTL cutoff', async () => {
  jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00Z'));
  jest.mocked(prisma.authNonces.findFirst).mockResolvedValueOnce({ nonce: 'draft123' } as never).mockResolvedValueOnce(null);
  expect(await isNonceUsable('draft123')).toBe(true);
  expect(prisma.authNonces.findFirst).toHaveBeenCalledWith({
    where: { nonce: 'draft123', usedAt: null, createdAt: { gt: new Date(Date.now() - NONCE_TTL_MS) } },
    select: { nonce: true },
  });
  expect(await isNonceUsable('draft123')).toBe(false);
  jest.useRealTimers();
});
