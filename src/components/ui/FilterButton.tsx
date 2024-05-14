import React from 'react';

interface FilterButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  show?: boolean;
}

const FilterButton = ({ children, onClick, show }: FilterButtonProps) => {
  const buttonClasses = `border border-white rounded-full px-5 py-2`;
  const gradienClasses = `bg-gradient-to-r bg-gradient-to-l`;

  return (
    <div
      className={`transition-all cursor-pointer shadow shadow-white text-nowrap gap-x-5
       ${buttonClasses}
       ${show ? '' : 'bg-gradient-to-r from-red-500 from-10% via-30% to-50%'}
       `}
      onClick={onClick}
      // style={{  show ? ' ' : '' }}
    >
      {children}
    </div>
  );
};

export default FilterButton;
