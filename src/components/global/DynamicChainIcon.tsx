import { ArbitrumIcon, BaseIcon, DegenIcon } from '@/components/global/Icons';
import { Netname } from '@/utils/types';

export default function DynamicChainIcon({
  chain,
  size = 80,
}: {
  chain: Netname;
  size?: number;
}) {
  switch (chain.toLowerCase()) {
    case 'arbitrum':
      return <ArbitrumIcon width={size} height={size} />;
    case 'base':
      return <BaseIcon width={size} height={size} />;
    case 'degen':
      return <DegenIcon width={size} height={size} />;
    default:
      return null;
  }
}
