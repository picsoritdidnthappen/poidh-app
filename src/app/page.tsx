'use client';

import * as React from 'react';

import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';

import ContentHome from '@/components/layout/ContentHome';
import CreateBounty from '@/components/ui/CreateBounty';
import { Network } from 'ethers';
import NetworkSelector from '@/components/ui/NetworkSelector';
import { useState } from 'react';

const Home = () => {
  const [showSections, setShowSections] = useState(false);

  return (
    <>
      <NetworkSelector setShowSections={setShowSections} />
      {showSections && (
        <div>
          <ContentHome />
          <CreateBounty />
          <ToastContainer />
        </div>
      )}
    </>
  );
};

export default Home;
