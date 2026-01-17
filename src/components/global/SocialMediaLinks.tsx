import Image from 'next/image';
import { trpc } from '@/trpc/client';
import { TwitterXIcon } from '@/components/global/Icons';

export const FARCASTER_URL = 'https://farcaster.xyz';
export const TWITTER_URL = 'https://x.com';

export default function SocialMediaLinks({ address }: { address: string }) {
  const userQuery = trpc.neynar.usersData.useQuery({
    addresses: [address],
  });

  const user = userQuery.data?.[0];

  if (!user) {
    return null;
  }

  return (
    <div className='flex flex-row items-center gap-2'>
      {user.farcasterTag && (
        <a
          href={`${FARCASTER_URL}/${user.farcasterTag}`}
          target='_blank'
          rel='noopener noreferrer'
          className='inline-block text-gray-400 hover:text-gray-200 transition-colors'
          aria-label={`Visit ${user.farcasterTag}'s Farcaster profile`}
        >
          <Image
            src='/images/farcaster_arch.svg'
            alt='Warpcast'
            width={17}
            height={20}
            className='hover:opacity-80 transition-opacity'
          />
        </a>
      )}
      {user.twitterTag && (
        <a
          href={`${TWITTER_URL}/${user.twitterTag}`}
          target='_blank'
          rel='noopener noreferrer'
          className='inline-block'
          aria-label={`Visit ${user.twitterTag}'s X profile`}
        >
          <TwitterXIcon width={17} height={20} />
        </a>
      )}
    </div>
  );
}
