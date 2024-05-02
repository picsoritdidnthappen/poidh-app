import { motion } from 'framer-motion';
import React, { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

import BountyItem from '@/components/ui/BountyItem';

import { getClaimsByBountyId } from '@/app/context/web3';

import { BountyListProps } from '../../types/web3';

export interface EnhancedBounty {
  canceledOrClaimed: boolean;
  hasClaims: boolean;
  id: string;
  issuer: string;
  name: string;
  amount: string | number | bigint;
  description: string;
  claimer: string;
  createdAt: bigint;
  claimId: string;
  isMultiplayer: boolean;
}

const container = {
  hidden: { opacity: 1, scale: 0 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      delayChildren: 0.3,
      staggerChildren: 0.2,
    },
  },
};

const item = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
  },
};

const BountyList: React.FC<BountyListProps> = ({ bountiesData }) => {
  const [enhancedBounties, setEnhancedBounties] = useState<EnhancedBounty[]>(
    []
  );

  useEffect(() => {
    const fetchClaims = async () => {
      const promises = bountiesData.map(async (bounty) => {
        const hasClaims = await getClaimsByBountyId(bounty.id);
        return {
          ...bounty,
          canceledOrClaimed:
            bounty.claimer !== '0x0000000000000000000000000000000000000000',
          hasClaims: hasClaims.length > 0,
        };
      });
      const results = await Promise.all(promises);
      setEnhancedBounties(results);
    };

    fetchClaims();
  }, [bountiesData]);

  return (
    <>
      <motion.div
        className='container list mx-auto px-5 py-12 flex flex-col gap-12 lg:grid lg:grid-cols-12 lg:gap-12 lg:px-0'
        variants={container}
        initial='hidden'
        animate='visible'
      >
        {enhancedBounties.map((bounty) => (
          <motion.div
            className={cn(
              bounty.canceledOrClaimed && 'canceled',
              !bounty.hasClaims ? 'noClaims' : 'pendingClaims',
              'bountyItem lg:col-span-4'
            )}
            key={bounty.id}
            variants={item}
          >
            <BountyItem
              id={bounty.id}
              title={bounty.name}
              description={bounty.description}
              amount={bounty.amount}
              isMultiplayer={bounty.isMultiplayer}
            />
          </motion.div>
        ))}
      </motion.div>
    </>
  );
};

export default BountyList;
