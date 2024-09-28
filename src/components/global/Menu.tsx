import Link from 'next/link';
import React from 'react';

const Menu: React.FC = () => {
  return (
    <div className='flex items-center gap-x-5 flex-col lg:flex-row lg:absolute lg:left-1/2 lg:translate-y-[-12px] lg:-translate-x-1/2'>
      <Link href='https://dune.com/yesyes/poidh-pics-or-it-didnt-happen'>analytics</Link>
      <span>|</span>
      <Link href='https://paragraph.xyz/@poidh/poidh-beginner-guide'>how it works</Link>
    </div>
  );
};

export default Menu;
