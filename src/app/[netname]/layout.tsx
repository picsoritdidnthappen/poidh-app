import React from 'react';

import { Netname } from '@/utils/types';
import { generateMetadataForNetnameFrame } from '@/utils/generateMetadata';

type Props = {
  children: React.ReactNode;
  params: { netname: Netname };
};

export const generateMetadata = generateMetadataForNetnameFrame;

export default function Layout({ children }: Props) {
  return children;
}
