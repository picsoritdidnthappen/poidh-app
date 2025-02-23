import Link from 'next/link';
import React from 'react';

import { useGetChain } from '@/hooks/useGetChain';
import { useAccount } from 'wagmi';

const MenuLink = ({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) => (
  <Link href={href} className='hover:text-gray-300'>
    {children}
  </Link>
);

export default function SlideOverMenu() {
  const chain = useGetChain();
  const account = useAccount();

  return (
    <div className='flex gap-2 flex-col p-5 text-white'>
      {account.address && (
        <MenuLink href={`/${chain.slug}/account/${account.address}`}>
          my account
        </MenuLink>
      )}
      <MenuLink href='https://paragraph.xyz/@poidh/poidh-beginner-guide'>
        how it works
      </MenuLink>
      <MenuLink href='https://github.com/picsoritdidnthappen/poidh-app'>
        github
      </MenuLink>
      <MenuLink href='https://dune.com/yesyes/poidh-pics-or-it-didnt-happen'>
        analytics
      </MenuLink>
      <MenuLink href='https://warpcast.com/poidhbot'>farcaster</MenuLink>
      <MenuLink href='https://x.com/poidhxyz'>twitter</MenuLink>
      <MenuLink href='https://github.com/picsoritdidnthappen/poidh-app/issues/new'>
        report bug
      </MenuLink>
      <MenuLink href='https://poidh.xyz/terms'>terms</MenuLink>
    </div>
  );
}
