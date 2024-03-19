import ProofList from '@/components/bounty/ProofList';
import React from 'react';

const BountyProofs = () => {
  return (
    <div>
      <div className='flex flex-row gap-x-2 py-4 border-b border-dashed'>
      <span>(2)</span>
      <span>proofs</span>
      </div>
      <ProofList/>



    </div>
  );
};

export default BountyProofs;