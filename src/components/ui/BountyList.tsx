import { motion } from 'framer-motion';
import React from 'react';

import BountyItem from '@/components/ui/BountyItem'; 

import {  BountyListProps } from '../../types/web3';


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


const BountyList: React.FC<BountyListProps> = ({ bountiesData }) => {
// const [showFilters, setShowFilters] = useState(false);



  // useEffect(() => {
  //   if (window.location.pathname === '/account') {
  //     setShowFilters(true);
  //   } else {
  //     setShowFilters(false);
  //   }
  // }, []);

  return (
    <>
     

      <motion.div className='container mx-auto px-5 py-12 flex flex-col gap-12 lg:grid lg:grid-cols-12 lg:gap-12 lg:px-0 '
       variants={container}
       initial="hidden" 
       animate="visible">

        {bountiesData.map((bounty) => (
          <motion.div className='lg:col-span-4' key={bounty.id} variants={item}>
            <BountyItem id={bounty.id} title={bounty.name} description={bounty.description} amount={bounty.amount} />
          </motion.div>
        ))}

        
      </motion.div>
    </>
  );
};

export default BountyList;
