import { useChainInfo } from '@/hooks/useGetChain';
import { getEnsOrDegenName } from '@/utils/web3';
import { useEffect, useState } from 'react';

export default function useDegenOrEnsName(addr: string) {
  const [result, setResult] = useState<string | null>(null);
  const chain = useChainInfo();

  useEffect(() => {
    const cb = async () => {
      const ensOrDegenName = await getEnsOrDegenName({
        chainName: chain.slug,
        address: addr,
      });
      setResult(ensOrDegenName);
    };

    cb();
  }, [addr, chain]);

  return result;
}
