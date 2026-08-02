import { ExpandMoreIcon } from '@/components/global/Icons';
import { trpc } from '@/trpc/client';
import Link from 'next/link';
import { useState } from 'react';
import { useAccount } from 'wagmi';

const MenuLink = ({
  href,
  children,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  onClick?: () => void;
}) => (
  <Link href={href} className='hover:text-gray-300' onClick={onClick}>
    {children}
  </Link>
);

export default function SlideOverMenu({
  onClose,
  onOpenHowItWorks,
}: {
  onClose: () => void;
  onOpenHowItWorks: () => void;
}) {
  const account = useAccount();
  const [isResourcesExpanded, setIsResourcesExpanded] = useState(false);

  const trendingAlbums = trpc.albums.trending.useQuery({});

  const handleCloseWithDelay = () => {
    setTimeout(() => {
      onClose();
    }, 500);
  };

  return (
    <div className='flex gap-2 flex-col p-5 text-white'>
      {account.address && (
        <MenuLink
          href={`/account/${account.address}`}
          onClick={handleCloseWithDelay}
        >
          my account 👤
        </MenuLink>
      )}
      <MenuLink href='/feed' onClick={handleCloseWithDelay}>
        feed 🖼️
      </MenuLink>
      <MenuLink href='/leaderboard' onClick={handleCloseWithDelay}>
        leaderboard 🕹️
      </MenuLink>
      <MenuLink href='/explore' onClick={handleCloseWithDelay}>
        explore 🔎
      </MenuLink>

      {trendingAlbums.data && trendingAlbums.data.length > 0 && (
        <>
          <span className='ml-4 my-1.5 text-sm'>trending 📈</span>
          {trendingAlbums.data.map((album) => (
            <Link
              key={album.name}
              href={`/a/${encodeURIComponent(album.name)}`}
              className='hover:text-gray-300 ml-4 text-sm'
              onClick={handleCloseWithDelay}
            >
              {album.name.length > 15
                ? `${album.name.slice(0, 15)}…`
                : album.name}{' '}
              ({album.count})
            </Link>
          ))}
        </>
      )}

      <button
        onClick={onOpenHowItWorks}
        className='hover:text-gray-300 text-left'
      >
        how it works 💡
      </button>

      <MenuLink href='https://docs.poidh.xyz/' onClick={handleCloseWithDelay}>
        docs ⚙️
      </MenuLink>

      <button
        className='flex items-center gap-2 hover:text-gray-300 transition-colors'
        onClick={() => setIsResourcesExpanded(!isResourcesExpanded)}
      >
        links 🔗
        <span
          className={`h-4 w-4 transition-transform duration-200 ${
            isResourcesExpanded ? 'rotate-180' : ''
          }`}
        >
          <ExpandMoreIcon size={16} />
        </span>
      </button>

      {isResourcesExpanded && (
        <div className='ml-4 flex flex-col gap-2'>
          <MenuLink
            href='https://github.com/picsoritdidnthappen/poidh-app'
            onClick={handleCloseWithDelay}
          >
            github 🛠️
          </MenuLink>
          <MenuLink
            href='https://words.poidh.xyz'
            onClick={handleCloseWithDelay}
          >
            blog 📝
          </MenuLink>
          <MenuLink
            href='https://warpcast.com/poidhbot'
            onClick={handleCloseWithDelay}
          >
            farcaster 🟪
          </MenuLink>
          <MenuLink
            href='https://x.com/poidhxyz'
            onClick={handleCloseWithDelay}
          >
            twitter 🐦
          </MenuLink>
          <MenuLink
            href='https://www.tiktok.com/@poidhxyz'
            onClick={handleCloseWithDelay}
          >
            tiktok 📹
          </MenuLink>
          <MenuLink
            href='https://www.instagram.com/poidhxyz'
            onClick={handleCloseWithDelay}
          >
            instagram 📸
          </MenuLink>
          <MenuLink
            href='https://github.com/picsoritdidnthappen/poidh-app/issues/new'
            onClick={handleCloseWithDelay}
          >
            report bug 🐛
          </MenuLink>
        </div>
      )}
      <MenuLink href='/terms' onClick={handleCloseWithDelay}>
        terms 📜
      </MenuLink>
    </div>
  );
}
