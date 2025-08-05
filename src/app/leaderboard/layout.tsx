import { generateMetadataForLeaderboardPage } from '@/utils/generateMetadata';

export const generateMetadata = generateMetadataForLeaderboardPage;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
