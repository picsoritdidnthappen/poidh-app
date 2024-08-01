import { usePathname } from 'next/navigation';

import { BountyInfo, BountyProofs, BountyProvider } from '@/components/bounty';


const ContentBounty = () => {
  const pathname = usePathname();
  const bountyId = pathname.split('/').pop() || '';
  return (
    <BountyProvider bountyId={bountyId}>
      <div className='pb-44'>
        <BountyInfo bountyId={bountyId} />
        <BountyProofs bountyId={bountyId} />
      </div>
    </BountyProvider>
  );
};

export default ContentBounty;
