import { motion } from 'framer-motion';
import React from 'react';

import { cn } from '@/utils';
import BountyItem from './BountyItem';
import { ChainId } from '@/utils/types';

type Bounty = {
  id: string;
  chainId: ChainId;
  title: string;
  description: string;
  network: string;
  amount: string;
  isMultiplayer: boolean;
  inProgress: boolean;
  hasClaims: boolean;
  isCanceled: boolean;
};

export default function BountyList({
  bounties,
  showStatusEmoji = false,
}: {
  bounties: Bounty[];
  showStatusEmoji?: boolean;
}) {
  return (
    <>
      <motion.div
        className='container list mx-auto px-5 pb-12 pt-5 flex flex-col gap-12 lg:grid lg:grid-cols-12 lg:gap-12 lg:px-0'
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
        initial='hidden'
        animate='visible'
      >
        {bounties.map((bounty) => (
          <motion.div
            className={cn(
              bounty.inProgress && 'canceled',
              bounty.hasClaims ? 'pendingClaims' : 'noClaims',
              'bountyItem lg:col-span-4'
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
                id: bounty.id,
                chainId: bounty.chainId,
                title: bounty.title,
                network: bounty.network,
                description: bounty.description,
                amount: bounty.amount,
                isMultiplayer: bounty.isMultiplayer,
                inProgress: bounty.inProgress,
                isCanceled: bounty.isCanceled,
              }}
              showStatusEmoji={showStatusEmoji}
            />
          </motion.div>
        ))}
      </motion.div>
    </>
  );
}
