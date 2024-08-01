import { useEffect, useState } from 'react';

import { getDegenOrEnsName } from '@/app/context';

/**
 * @note we can replace this hook with useQuery from react-query if we decide to install the package and use it
 * */
export const useDegenOrEnsName = (addr: string) => {
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    const cb = async () => {
      const degenOrEnsName = await getDegenOrEnsName(addr);
      setResult(degenOrEnsName);
    };

    cb();
  }, [addr]);

  return result;
};
