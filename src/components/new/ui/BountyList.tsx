/* eslint-disable simple-import-sort/imports */
import { motion } from 'framer-motion';
import React from 'react';

import { cn } from '@/lib/utils';
import BountyItem from '@/components/new/ui/BountyItem';

type Bounty = {
  id: string;
  title: string;
  description: string;
  network: string;
  amount: string;
  isMultiplayer: boolean;
  inProgress: boolean;
  hasClaims: boolean;
};

export default function BountyList({ bounties }: { bounties: Bounty[] }) {
  return (
    <>
      <motion.div
        className='container list mx-auto px-5 py-12 flex flex-col gap-12 lg:grid lg:grid-cols-12 lg:gap-12 lg:px-0'
        variants={{
          hidden: { opacity: 1, scale: 0 },
          visible: {
            opacity: 1,
            scale: 1,
            transition: {
              delayChildren: 0.3,
              staggerChildren: 0.2,
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
                title: bounty.title,
                network: bounty.network,
                description: bounty.description,
                amount: bounty.amount,
                isMultiplayer: bounty.isMultiplayer,
              }}
            />
          </motion.div>
        ))}
      </motion.div>
    </>
  );
}
