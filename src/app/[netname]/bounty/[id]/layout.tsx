import * as React from 'react';
import { generateMetadataForBounty } from '@/utils/generateMetadata';

export const generateMetadata = generateMetadataForBounty;

export default function BountyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
