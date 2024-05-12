import { usePathname } from 'next/navigation';

import BountyInfo from '@/components/bounty/BountyInfo';
import BountyProofs from '@/components/bounty/BountyProofs';
import { BountyProvider } from '@/components/bounty/BountyProvider';

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
