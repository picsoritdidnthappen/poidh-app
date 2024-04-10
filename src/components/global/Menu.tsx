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
    <div className='flex items-center gap-x-5 flex-col lg:flex-row lg:absolute lg:left-1/2 lg:-translate-x-1/2'>
      {menuPoints.map((point, index) => (
        <div key={index}>
          <Link  href={createSlug(point)}>
           {point}
          </Link>
        </div>
      ))}
    </div>
  );
};

export default Menu;
