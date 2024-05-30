import React from 'react';

interface bannerProps {
  networkName: string;
}

const Banner = ({ networkName }: bannerProps) => {
  return (
    <div className='flex items-center justify-center text-center bg-[#F15E5F] text-white absolute w-full top-0 left-0'>
      {networkName} with us but please remember this app is in alpha stage
    </div>
  );
};

export default Banner;
