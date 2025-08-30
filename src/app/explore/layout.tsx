import { generateMetadaForExplorePage } from '@/utils/generateMetadata';

export const generateMetadata = generateMetadaForExplorePage;

export default function ExploreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
