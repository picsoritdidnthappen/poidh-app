import { useEffect, useState } from 'react';
import { trpc } from '@/trpc/client';
import { useAccount } from 'wagmi';

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

export function useYouFeedNotification() {
  const account = useAccount();

  const [hasUnseenYouActivity, setHasUnseenYouActivity] = useState(false);

  const latestYouActivity = trpc.accounts.activities.useQuery(
    {
      address: account.address,
      limit: 1,
      excludeOwnActivity: true,
    },
    {
      enabled: !!account.address,
      staleTime: 30_000,
      refetchOnWindowFocus: true,
    }
  );

  useEffect(() => {
    if (!account.address || typeof window === 'undefined') {
      setHasUnseenYouActivity(false);
      return;
    }

    const newestActivity = latestYouActivity.data?.items?.[0];

    const newestActivityKey = getActivityKey(newestActivity);

    if (!newestActivityKey) {
      setHasUnseenYouActivity(false);
      return;
    }

    const storageKey = getYouFeedStorageKey(account.address);

    const lastSeenActivityKey = window.localStorage.getItem(storageKey);

    setHasUnseenYouActivity(lastSeenActivityKey !== newestActivityKey);
  }, [account.address, latestYouActivity.data]);

  useEffect(() => {
    if (!account.address || typeof window === 'undefined') {
      return;
    }

    const address = account.address;

    const refreshSeenState = () => {
      const newestActivity = latestYouActivity.data?.items?.[0];

      const newestActivityKey = getActivityKey(newestActivity);

      if (!newestActivityKey) {
        setHasUnseenYouActivity(false);
        return;
      }

      const storageKey = getYouFeedStorageKey(address);

      const lastSeenActivityKey = window.localStorage.getItem(storageKey);

      setHasUnseenYouActivity(lastSeenActivityKey !== newestActivityKey);
    };

    window.addEventListener('poidh-you-feed-seen', refreshSeenState);

    return () => {
      window.removeEventListener('poidh-you-feed-seen', refreshSeenState);
    };
  }, [account.address, latestYouActivity.data]);

  return {
    hasUnseenYouActivity,
  };
}
