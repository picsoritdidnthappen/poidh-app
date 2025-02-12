import * as React from 'react';
import '@/styles/colors.css';
import { generateMetadataForBountyFrame } from '@/utils/generateMetadataForBountyFrame';

export const generateMetadata = generateMetadataForBountyFrame;

export default function BountyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
