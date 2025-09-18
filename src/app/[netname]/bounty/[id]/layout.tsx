import * as React from 'react';
import { generateMetadataForBountyFrame } from '@/utils/generateMetadata';

export const generateMetadata = generateMetadataForBountyFrame;

export default function BountyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
