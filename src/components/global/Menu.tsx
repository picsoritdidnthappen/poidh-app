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
    <div className='flex items-center gap-x-5 lg:absolute lg:left-1/2 -translate-x-1/2'>
      {menuPoints.map((point, index) => (
        <div>
          <Link key={index} href={createSlug(point)}>
           {point}
          </Link>
        </div>
      ))}
    </div>
  );
};

export default Menu;
