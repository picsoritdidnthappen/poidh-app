import { createHash, randomBytes } from 'crypto';
import prisma from 'prisma/prisma';
import { SESSION_COOKIE_NAME, SESSION_TTL_MS } from '@/utils/authConfig';

export type Session = {
  address: string;
};

/**
 * Hashes a session token for storage. The database keeps only the hash, so a
 * leaked table can't be turned back into working cookies.
 */
function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Starts a new session for an address on a host and returns the token to put
 * in the cookie. Also clears out expired sessions, since sign-ins are rare
 * enough to make this a cheap place to do it.
 */
export async function createSession({
  address,
  host,
}: {
  address: string;
  host: string;
}) {
  const token = randomBytes(32).toString('base64url');

  await prisma.$transaction([
    prisma.sessions.deleteMany({
      where: { createdAt: { lte: new Date(Date.now() - SESSION_TTL_MS) } },
    }),
    prisma.sessions.create({
      data: {
        tokenHash: hashToken(token),
        address: address.toLowerCase(),
        host,
      },
    }),
  ]);

  return token;
}

/**
 * Looks up the session for a token, or returns null if there isn't one or it
 * has expired. A session only counts on the host that created it, so one made
 * on staging or a preview can't be used on prod when they share a database.
 */
export async function findSession({
  token,
  host,
}: {
  token: string;
  host: string;
}): Promise<Session | null> {
  const session = await prisma.sessions.findFirst({
    where: {
      tokenHash: hashToken(token),
      host,
      createdAt: { gt: new Date(Date.now() - SESSION_TTL_MS) },
    },
    select: { address: true },
  });

  return session;
}

/**
 * Ends a session, so its token stops working even if the cookie is kept.
 */
export async function deleteSession(token: string) {
  await prisma.sessions.deleteMany({
    where: { tokenHash: hashToken(token) },
  });
}

/**
 * Builds the Set-Cookie value for a session token, or one that clears the
 * cookie when the token is null. The cookie is HttpOnly so page scripts can't
 * read it, and has no Domain so it only goes back to the host that set it.
 * Secure is left off in dev because Safari drops Secure cookies on
 * http://localhost.
 */
export function serializeSessionCookie(
  token: string | null,
  env: NodeJS.ProcessEnv = process.env
) {
  const maxAge = token ? Math.floor(SESSION_TTL_MS / 1000) : 0;

  return [
    `${SESSION_COOKIE_NAME}=${token ?? ''}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
    ...(env.NODE_ENV === 'development' ? [] : ['Secure']),
  ].join('; ');
}
