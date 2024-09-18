'use client';

import * as React from 'react';

import 'react-toastify/dist/ReactToastify.css';

import { NetworkSelector } from '@/components/ui';

const Home = () => {
  return (
    <div className='flex flex-col items-center justify-center text-center p-6 min-h-[85vh]'>
      <h1 className='text-4xl mb-8'>poidh</h1>
      <p className='text-lg mb-8'>the easiest way to get stuff done</p>

      <h3 className='text-2xl mb-6'>step 1 - fund a bounty 💰</h3>
      <p className='mb-6'>
        write a bounty description and deposit funds to incentivize task
        completion
      </p>

      <h3 className='text-2xl mb-6'>step 2 - share the bounty 📢</h3>
      <p className='mb-6'>
        get your bounty in front of people who are interested in completing it
      </p>

      <h3 className='text-2xl mb-6'>step 3 - approve a claim 🤝</h3>
      <p className='mb-6'>
        monitor your submissions and confirm a claim with a single click
      </p>
      <h3 className='text-2xl mt-8'>select a network to get started</h3>
      <NetworkSelector />
    </div>
  );
};

export default Home;
