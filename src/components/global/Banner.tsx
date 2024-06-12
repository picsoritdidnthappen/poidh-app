import React from 'react';

interface bannerProps {
  networkName: string;
}

const Banner = ({ networkName }: bannerProps) => {
  return (
    <div className='flex items-center justify-center text-center bg-[#F15E5F] text-white absolute w-full top-0 left-0'>
      this app is in beta
    </div>
  );
};

export default Banner;
