import GameButton, { PlainGameButton } from '@/components/global/GameButton';
import { useEffect, useState, type ReactNode } from 'react';
import { useAccount } from 'wagmi';
import FormBounty from '../bounty/FormBounty';
import FormClaim from '../claims/FormClaim';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useChainInfo } from '@/hooks/useChainInfo';
import { trpc } from '@/trpc/client';
import { useScreenSize } from '@/hooks/useScreenSize';
import ButtonCTA from './ButtonCTA';
import {
  ProfileIcon,
  LeaderboardIcon,
  ImageIcon,
  MagnifyingGlassIcon,
} from '@/components/global/Icons';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { toast } from 'react-toastify';

function getYouFeedStorageKey(address: string) {
  return `poidh:lastSeenYouFeed:${address.toLowerCase()}`;
}

function getActivityKey(
  activity:
    | {
        tx: string;
        index?: number | null;
      }
    | undefined
) {
  if (!activity) {
    return null;
  }

  return `${activity.tx}:${activity.index ?? ''}`;
}

export default function Navbar({
  type,
  bountyId,
}: {
  type: 'claim' | 'bounty';
  bountyId?: string;
}) {
  const [showForm, setShowForm] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [hasUnseenYouActivity, setHasUnseenYouActivity] = useState(false);

  const account = useAccount();
  const { openConnectModal } = useConnectModal();
  const chain = useChainInfo();
  const isMobile = useScreenSize();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const user = trpc.users.fetchByAddress.useQuery(
    {
      address: account.address as `0x${string}`,
    },
    {
      enabled: !!account.address,
    }
  );

  const latestYouActivity = trpc.accounts.activities.useQuery(
    {
      address: account.address,
      limit: 1,
    },
    {
      enabled: !!account.address,
      staleTime: 30_000,
      refetchOnWindowFocus: true,
    }
  );

  const bounty = trpc.bounties.fetch.useQuery(
    {
      id: Number(bountyId),
      chainId: chain.id,
    },
    {
      enabled: type === 'claim' && !!bountyId,
    }
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname, searchParams]);

  useEffect(() => {
    if (
      !account.address ||
      typeof window === 'undefined'
    ) {
      setHasUnseenYouActivity(false);
      return;
    }

    const newestActivity =
      latestYouActivity.data?.items?.[0];

    const newestActivityKey =
      getActivityKey(newestActivity);

    if (!newestActivityKey) {
      setHasUnseenYouActivity(false);
      return;
    }

    const storageKey =
      getYouFeedStorageKey(account.address);

    const lastSeenActivityKey =
      window.localStorage.getItem(storageKey);

    setHasUnseenYouActivity(
      lastSeenActivityKey !== newestActivityKey
    );
  }, [
    account.address,
    latestYouActivity.data,
  ]);

  useEffect(() => {
    if (
      !account.address ||
      typeof window === 'undefined'
    ) {
      return;
    }

    const handleYouFeedSeen = () => {
      const newestActivity =
        latestYouActivity.data?.items?.[0];

      const newestActivityKey =
        getActivityKey(newestActivity);

      if (!newestActivityKey) {
        setHasUnseenYouActivity(false);
        return;
      }

      const storageKey =
        getYouFeedStorageKey(account.address);

      const lastSeenActivityKey =
        window.localStorage.getItem(storageKey);

      setHasUnseenYouActivity(
        lastSeenActivityKey !== newestActivityKey
      );
    };

    window.addEventListener(
      'poidh-you-feed-seen',
      handleYouFeedSeen
    );

    return () => {
      window.removeEventListener(
        'poidh-you-feed-seen',
        handleYouFeedSeen
      );
    };
  }, [
    account.address,
    latestYouActivity.data,
  ]);

  const handleClick = () => {
    if (type === 'claim' && !bounty.data?.inProgress) {
      toast.error(
        'this bounty is now finalized, claims can no longer be submitted'
      );
      return;
    }

    if (account.address) {
      setShowForm(true);
      return;
    }

    openConnectModal?.();
  };

  const handleNavigationStart = (href: string) => {
    const currentHref =
      pathname === '/feed'
        ? `${pathname}${
            searchParams.toString()
              ? `?${searchParams.toString()}`
              : ''
          }`
        : pathname;

    if (currentHref === href) {
      return;
    }

    setPendingHref(href);
  };

  const profileHref = account.address
    ? `/account/${account.address}`
    : '#';

  const isProfileActive =
    !!account.address && pathname === profileHref;

  const feedHref =
    account.address && hasUnseenYouActivity
      ? '/feed?tab=you'
      : '/feed';

  const feedPending =
    pendingHref === feedHref;

  const mobileNavClass = (active: boolean, pending: boolean) =>
    [
      'relative flex flex-col items-center justify-center gap-1 text-white z-10',
      'py-2 transition-all duration-150',
      'active:scale-90 active:opacity-70',
      active
        ? 'font-bold drop-shadow-[0_0_5px_rgba(255,255,255,0.75)]'
        : '',
      pending ? 'opacity-80' : '',
    ]
      .filter(Boolean)
      .join(' ');

  const MobileIcon = ({
    pending,
    active,
    children,
  }: {
    pending: boolean;
    active: boolean;
    children: ReactNode;
  }) => (
    <div
      className={`relative w-6 h-6 flex items-center justify-center transition-all duration-150 ${
        active
          ? 'scale-110 drop-shadow-[0_0_4px_rgba(255,255,255,0.85)]'
          : ''
      }`}
    >
      {children}

      {pending && (
        <div className='absolute -inset-1.5 rounded-full border-2 border-white/25 border-t-white animate-spin pointer-events-none' />
      )}
    </div>
  );

  // Prevent the desktop GameButton from flashing before
  // the client knows whether this is a mobile viewport.
  if (!mounted) {
    return null;
  }

  if (isMobile) {
    const profilePending = pendingHref === profileHref;
    const leaderboardPending = pendingHref === '/leaderboard';
    const explorePending = pendingHref === '/explore';

    return (
      <>
        <nav className='fixed bottom-0 left-0 right-0 h-20 z-40 how-it-works-hidden shadow-[0_4px_24px_0_var(--cyber-nav-shadow,rgba(80,160,220,0.14))] android:pb-10 pb-4'>
          <div className='absolute inset-0 rounded-t-3xl bg-gradient-to-b from-[#7db3e0] to-[#b3d8f7] dark:from-[#0d1b2e] dark:to-[#132b47] backdrop-blur-sm' />

          <div className='relative h-full grid grid-cols-[1fr_1fr_1.5fr_1fr_1fr] items-center pt-2'>
            <Link
              href={profileHref}
              onClick={(e) => {
                if (!account.address) {
                  e.preventDefault();
                  openConnectModal?.();
                  return;
                }

                handleNavigationStart(profileHref);
              }}
              className={mobileNavClass(
                isProfileActive,
                profilePending
              )}
            >
              <MobileIcon
                pending={profilePending}
                active={isProfileActive}
              >
                <ProfileIcon size={24} />

                {((user?.data?.withdrawalArbitrum ?? 0) > 0 ||
                  (user?.data?.withdrawalBase ?? 0) > 0 ||
                  (user?.data?.withdrawalDegen ?? 0) > 0 ||
                  (user?.data?.withdrawalMainnet ?? 0) > 0) && (
                  <div className='absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full ring-1 ring-white' />
                )}
              </MobileIcon>

              <span className='text-[10px] whitespace-nowrap'>
                {profilePending ? 'loading...' : 'profile'}
              </span>
            </Link>

            <Link
              href='/leaderboard'
              onClick={() => handleNavigationStart('/leaderboard')}
              className={mobileNavClass(
                pathname === '/leaderboard',
                leaderboardPending
              )}
            >
              <MobileIcon
                pending={leaderboardPending}
                active={pathname === '/leaderboard'}
              >
                <LeaderboardIcon size={24} />
              </MobileIcon>

              <span className='text-[10px] whitespace-nowrap'>
                {leaderboardPending ? 'loading...' : 'scores'}
              </span>
            </Link>

            {/* center slot keeps label aligned with other nav items */}
            <div className='flex flex-col items-center justify-center gap-1 text-white z-10'>
              <div className='w-6 h-6' />

              <span className='text-[10px] whitespace-nowrap'>
                create {type}
              </span>
            </div>

            <Link
              href={feedHref}
              onClick={() =>
                handleNavigationStart(feedHref)
              }
              className={mobileNavClass(
                pathname === '/feed',
                feedPending
              )}
            >
              <MobileIcon
                pending={feedPending}
                active={pathname === '/feed'}
              >
                <ImageIcon size={24} />

                {account.address &&
                  hasUnseenYouActivity && (
                    <div className='absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full ring-1 ring-white' />
                  )}
              </MobileIcon>

              <span className='text-[10px] whitespace-nowrap'>
                {feedPending ? 'loading...' : 'feed'}
              </span>
            </Link>

            <Link
              href='/explore'
              onClick={() => handleNavigationStart('/explore')}
              className={mobileNavClass(
                pathname === '/explore',
                explorePending
              )}
            >
              <MobileIcon
                pending={explorePending}
                active={pathname === '/explore'}
              >
                <MagnifyingGlassIcon size={24} />
              </MobileIcon>

              <span className='text-[10px] whitespace-nowrap'>
                {explorePending ? 'loading...' : 'explore'}
              </span>
            </Link>

            {/* floating create button:
                its center sits exactly on the navbar's top edge */}
            <div className='absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 z-30'>
              <div
                onClick={handleClick}
                className='cursor-pointer flex items-center justify-center scale-75 origin-center active:scale-[0.70] transition-transform duration-100'
              >
                {showForm ? (
                  <PlainGameButton hideShadow={true} />
                ) : (
                  <div className='button flex items-center justify-center'>
                    <GameButton hideShadow={true} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </nav>

        {type === 'bounty' ? (
          <FormBounty
            open={showForm}
            onClose={() => setShowForm(false)}
          />
        ) : (
          bounty.data && (
            <FormClaim
              bountyId={bounty.data.id}
              onChainBountyId={bounty.data.onChainId}
              open={showForm}
              onClose={() => setShowForm(false)}
            />
          )
        )}
      </>
    );
  }

  // Desktop view
  return (
    <div className='fixed bottom-16 z-40 w-full flex justify-center items-center lg:flex-col how-it-works-hidden'>
      {!showForm && (
        <div
          className='absolute button bottom-0 flex cursor-pointer flex-col items-center justify-center'
          onClick={handleClick}
        >
          <GameButton />

          <ButtonCTA>
            create {type}
          </ButtonCTA>
        </div>
      )}

      {type === 'bounty' ? (
        <FormBounty
          open={showForm}
          onClose={() => setShowForm(false)}
        />
      ) : (
        bounty.data && (
          <FormClaim
            bountyId={bounty.data.id}
            onChainBountyId={bounty.data.onChainId}
            open={showForm}
            onClose={() => setShowForm(false)}
          />
        )
      )}
    </div>
  );
}
