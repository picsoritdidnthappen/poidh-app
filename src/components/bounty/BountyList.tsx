import { motion } from 'framer-motion';
import { cn } from '@/utils/utils';
import BountyItem from './BountyItem';
import { Bounty } from '@/utils/types';
import { useIsHydrating } from '@/hooks/useIsHydrating';

const GRID_CLASS =
  'container list mx-auto px-5 pb-12 pt-5 flex flex-col gap-12 lg:grid lg:grid-cols-12 lg:gap-12 lg:px-0';

export default function BountyList({
  bounties,
  showStatusEmoji = false,
  showChainIcon = false,
}: {
  bounties: Bounty[];
  showStatusEmoji?: boolean;
  showChainIcon?: boolean;
}) {
  // A list from the server shows straight away. Starting it at scale 0 would
  // hide the server HTML until the JS loads and plays the entrance.
  const isHydrating = useIsHydrating();

  if (!bounties || bounties.length === 0) {
    return (
      <div className='text-center py-20 text-white/60'>
        no bounties available
      </div>
    );
  }

  return (
    <>
      <motion.div
        className={GRID_CLASS}
        variants={{
          hidden: { opacity: 1, scale: 0 },
          visible: {
            opacity: 1,
            scale: 1,
            transition: {
              delayChildren: 0.3,
            },
          },
        }}
        initial={isHydrating ? false : 'hidden'}
        animate='visible'
      >
        {bounties.map((bounty) => (
          <motion.div
            className={cn(
              bounty.inProgress && 'canceled',
              bounty.hasClaims ? 'pendingClaims' : 'noClaims',
              'bountyItem lg:col-span-4 h-full'
            )}
            key={bounty.id}
            variants={{
              hidden: { y: 20, opacity: 0 },
              visible: {
                y: 0,
                opacity: 1,
              },
            }}
          >
            <BountyItem
              bounty={{
                ...bounty,
              }}
              showStatusEmoji={showStatusEmoji}
              showChainIcon={showChainIcon}
            />
          </motion.div>
        ))}
      </motion.div>
    </>
  );
}

// Cards at the real cards' height, so the grid keeps its size while loading
export function BountyListSkeleton({ count }: { count: number }) {
  return (
    <div className={GRID_CLASS}>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className='lg:col-span-4 h-[300px] sm:h-[310px] rounded-xl border-2 border-white/10 bg-white/10 animate-pulse'
        />
      ))}
    </div>
  );
}
