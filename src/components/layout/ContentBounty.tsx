import { usePathname } from 'next/navigation';

import { BountyClaims, BountyInfo, BountyProvider } from '@/components/bounty';

const ContentBounty = () => {
  const pathname = usePathname();
  const bountyId = pathname.split('/').pop() || '';
  return (
    <BountyProvider bountyId={bountyId}>
      <div className='pb-44'>
        <BountyInfo bountyId={bountyId} />
        <BountyClaims bountyId={bountyId} />
      </div>
    </BountyProvider>
  );
};

export default ContentBounty;
