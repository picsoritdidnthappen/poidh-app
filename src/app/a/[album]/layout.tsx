import * as React from 'react';
import { generateMetadataForAlbumPage } from '@/utils/generateMetadata';

export const generateMetadata = generateMetadataForAlbumPage;

export default function AlbumLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
