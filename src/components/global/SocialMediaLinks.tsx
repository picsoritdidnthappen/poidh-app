import { useEffect, useState } from 'react';
import Image from 'next/image';
import { trpc } from '@/trpc/client';
import { TwitterXIcon } from '@/components/global/Icons';

export default function SocialMediaLinks({ address }: { address: string }) {
  const [farcasterUsername, setFarcasterUsername] = useState<string | null>(
    null
  );
  const [xUsername, setXUsername] = useState<string | null>(null);
  const farcasterUser = trpc.farcasterUser.useQuery({ address });

  useEffect(() => {
    if (farcasterUser?.data) {
      if (farcasterUser?.data[address][0]?.username) {
        setFarcasterUsername(farcasterUser?.data[address][0]?.username);
      }
      const xUsername = farcasterUser?.data[address][0]?.verified_accounts.find(
        (account: any) => account.platform === 'x'
      )?.username;
      if (xUsername) {
        setXUsername(xUsername);
      }
    }
  }, [farcasterUser, address]);

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
          src='/images/farcaster_icon_white.svg'
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
