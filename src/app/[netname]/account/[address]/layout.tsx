import * as React from 'react';

import '@/styles/colors.css';
import { generateMetadataForAccountPage } from '@/utils/generateMetadata';

export const generateMetadata = generateMetadataForAccountPage;

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
