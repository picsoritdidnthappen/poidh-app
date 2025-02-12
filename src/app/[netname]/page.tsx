'use client';

import React from 'react';
import ContentHome from '@/components/layout/ContentHome';
import NavBarMobile from '@/components/global/NavBarMobile';
import { useScreenSize } from '@/hooks/useScreenSize';
import CreateBounty from '@/components/bounty/CreateBounty';

export default function Home() {
  const isMobile = useScreenSize();

  return (
    <>
      <ContentHome />
      {isMobile ? <NavBarMobile type='bounty' /> : <CreateBounty />}
    </>
  );
}
