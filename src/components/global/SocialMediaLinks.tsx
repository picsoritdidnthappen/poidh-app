import { useEffect, useState } from 'react';
import Image from 'next/image';
import { trpc } from '@/trpc/client';
import { TwitterXIcon } from '@/components/global/Icons';

export default function SocialMediaLinks({ address }: { address: string }) {
  const [farcasterUsername, setFarcasterUsername] = useState<string | null>(
    null
  );
  const [xUsername, setXUsername] = useState<string | null>(null);
  const userDataNeynar = trpc.usersDataNeynar.useQuery({
    addresses: [address],
  });

  useEffect(() => {
    if (userDataNeynar?.data) {
      const userData = userDataNeynar.data[address]?.[0];
      const xUsername = userData?.verified_accounts?.find(
        (account) => account.platform === 'x'
      )?.username;

      setFarcasterUsername(userData?.username ?? null);
      setXUsername(xUsername ?? null);
    }
  }, [userDataNeynar, address]);

  return address && farcasterUsername ? (
    <div className='flex flex-row items-center gap-2'>
      <a
        href={`https://warpcast.com/${farcasterUsername}`}
        target='_blank'
        rel='noopener noreferrer'
        className='inline-block text-gray-400 hover:text-gray-200 transition-colors'
        aria-label={`Visit ${farcasterUsername}'s Warpcast profile`}
      >
        <Image
          src='/images/farcaster_arch.svg'
          alt='Warpcast'
          width={17}
          height={20}
          className='hover:opacity-80 transition-opacity'
        />
      </a>
      {xUsername && (
        <a
          href={`https://x.com/${xUsername}`}
          target='_blank'
          rel='noopener noreferrer'
          className='inline-block'
          aria-label={`Visit ${xUsername}'s X profile`}
        >
          <TwitterXIcon width={17} height={20} />
        </a>
      )}
    </div>
  ) : null;
}
