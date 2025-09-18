import { Netname } from '@/utils/types';
import { generateMetadataForNetnameFrame } from '@/utils/generateMetadata';

export const generateMetadata = generateMetadataForNetnameFrame;

export default function Layout({
  children,
}: {
  children: React.ReactNode;
  params: { netname: Netname };
}) {
  return children;
}
