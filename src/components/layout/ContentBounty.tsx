import BountyClaims from '@/components/bounty/BountyClaims';
import BountyInfo from '@/components/bounty/BountyInfo';
import CreateClaim from '@/components/ui/CreateClaim';

export default function ContentBounty({ bountyId }: { bountyId: string }) {
  return (
    <>
      <BountyInfo bountyId={bountyId} />
      <BountyClaims bountyId={bountyId} />
      <CreateClaim bountyId={bountyId} />
      <div className='h-80' />
    </>
  );
}
