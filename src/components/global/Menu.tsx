import Link from 'next/link';
import React from 'react';

interface MenuProps {
  menuPoints: string[];
}

const createSlug = (point: string) => {
  return `/${point.toLowerCase().replace(/ /g, '-')}`;
};

const Menu: React.FC<MenuProps> = ({ menuPoints }) => {
  return (
    <div className='flex items-center gap-x-5 flex-col lg:flex-row lg:absolute lg:left-1/2 lg:translate-y-[-12px] lg:-translate-x-1/2'>
      <Link href='https://info.poidh.xyz'>about us</Link>
      <span>|</span>
      <Link href='https://paragraph.xyz/@poidh'>how it works</Link>
    </div>
  );
};

export default Menu;
