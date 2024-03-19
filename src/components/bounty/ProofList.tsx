// ProofList.tsx
import ProofItem from '@/components/bounty/ProofItem';
import React from 'react';

const bounties = [
  { id: '1', title: 'first proof', description: 'this is the first bounty.' },
  { id: '2', title: 'second proof', description: 'this is the second bounty.' },
];

const ProofList = () => {
  return (
    <div className='container mx-auto px-5 py-12 flex flex-col gap-12 lg:grid lg:grid-cols-12 lg:gap-12 lg:px-0 '>
      {bounties.map((bounty) => (
        <ProofItem key={bounty.id} id={bounty.id} title={bounty.title} description={bounty.description} />
      ))}
    </div>
  );
};

export default ProofList;
