import { usePathname } from 'next/navigation';

const useGetChain = (): string => {
  const pathname = usePathname();
  const currentUrl = pathname.split('/')[1];
  return currentUrl !== '' ? currentUrl : 'base';
};

export default useGetChain;
