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
      return <ArbitrumIcon size={size} />;
    case 'base':
      return <BaseIcon size={size} />;
    case 'degen':
      return <DegenIcon size={size} />;
    default:
      return null;
  }
}
