import App from '@/app/(frames)/frames/[netname]/[id]/app';
import { generateMetadataForBountyFrame } from '@/utils/generateMetadataForBountyFrame';

export const generateMetadata = generateMetadataForBountyFrame;

const FrameHome = ({ params }: { params: { id: string; netname: string } }) => {
  return <App bountyId={params.id} chainId={params.netname} />;
};

export default FrameHome;
