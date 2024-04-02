import React from 'react';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import BountyItem from '@/components/ui/BountyItem'; 
import FilterButton from '@/components/ui/FilterButton';

const container = {
  hidden: { opacity: 1, scale: 0 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      delayChildren: 0.3,
      staggerChildren: 0.2
    }
  }
};
  
const item = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1
  }
};

interface BountiesData {
  id: string;
  issuer: string;
  name: string;
  description: string;
  claimer: string;
  createdAt: string;
  claimId: string;
}

interface BountyListProps {
  bountiesData: BountiesData[];
}

const BountyList: React.FC<BountyListProps> = ({ bountiesData }) => {
const [showFilters, setShowFilters] = useState(false);



  useEffect(() => {
    if (window.location.pathname === '/account') {
      setShowFilters(true);
    } else {
      setShowFilters(false);
    }
  }, []);

  return (
    <>
      {showFilters && (
        <div className='flex flex-row items-center py-12 border-b border-white justify-center gap-x-5 '>
          <FilterButton>nft's (3) </FilterButton>
          <FilterButton>your bounties (0) </FilterButton>
          <FilterButton>submitted claims (0)</FilterButton>
          <FilterButton>collab bounties (0) </FilterButton>
        </div>
      )}

      <motion.div className='container mx-auto px-5 py-12 flex flex-col gap-12 lg:grid lg:grid-cols-12 lg:gap-12 lg:px-0 '
       variants={container}
       initial="hidden" 
       animate="visible">

        {bountiesData.map((bounty) => (
          <motion.div className='lg:col-span-4' key={bounty.id} variants={item}>
            <BountyItem id={bounty.id} title={bounty.name} description={bounty.description} />
          </motion.div>
        ))}

        
      </motion.div>
    </>
  );
};

export default BountyList;
