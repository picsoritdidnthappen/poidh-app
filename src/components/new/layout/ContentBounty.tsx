import BountyClaims from '@/components/new/bounty/BountyClaims';
import BountyInfo from '@/components/new/bounty/BountyInfo';

export default function ContentBounty({ bountyId }: { bountyId: string }) {
  return (
    <div className='pb-44'>
      <BountyInfo bountyId={bountyId} />
      <BountyClaims bountyId={bountyId} />
    </div>
  );
}
