import React from 'react';

interface FilterButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  show?: boolean;
}

const FilterButton = ({ children, onClick, show }: FilterButtonProps) => {
  let buttonClasses = `border border-white rounded-full px-5 py-2`
  let gradienClasses = `bg-gradient-to-r bg-gradient-to-l`
  
  return (
    <div
      className={`transition-all shadow shadow-white text-nowrap bg-gradient-to-r from-red-500 from-10% via-30% to-50% gap-x-5 ${buttonClasses}`}
      onClick={onClick}
      // style={{ display: show ? 'block' : 'none' }}
    >
      {children}
    </div>
  );
};

export default FilterButton;
