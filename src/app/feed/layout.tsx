import { generateMetadaForFeedPage } from '@/utils/generateMetadata';

export const generateMetadata = generateMetadaForFeedPage;

export default function FeedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
