import App from '@/app/(frames)/frames/[netname]/[id]/app';
import { generateMetadataForBountyFrame } from '@/utils/generateMetadataForBountyFrame';
import { Netname } from '@/utils/types';

export const generateMetadata = generateMetadataForBountyFrame;

const FrameHome = ({
  params,
}: {
  params: { id: string; netname: Netname };
}) => {
  return <App bountyId={params.id} chainId={params.netname} />;
};

export default FrameHome;
