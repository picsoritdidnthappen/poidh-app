'use client';

import * as React from 'react';
import { useState } from 'react';
import { ToastContainer } from 'react-toastify';

import 'react-toastify/dist/ReactToastify.css';

import { ContentHome } from '@/components/layout';
import { CreateBounty, NetworkSelector } from '@/components/ui';

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
