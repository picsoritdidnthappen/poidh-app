import BountyInfo from "@/components/bounty/BountyInfo";
import BountyProofs from "@/components/bounty/BountyProofs";
import { usePathname } from "next/navigation";

interface BountiesData {
  id: string;
  issuer: string;
  name: string;
  description: string;
  value: string;
  claimer: string;
  createdAt: string;
  claimId: string;
}



const ContentBounty = () => {
  const pathname = usePathname()
  const bountyId = pathname.split('/').pop() || ''; 



  return (
    <div className="pb-44">
    <BountyInfo bountyId={bountyId} />
    <BountyProofs bountyId={bountyId}  />
    </div>
  );
};

export default ContentBounty;