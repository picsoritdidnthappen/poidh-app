import React, { useState } from 'react';



const FilterButton = ({ children }: { children: React.ReactNode }) => {


  let buttonClasses = `border border-white rounded-full px-5 py-2`
  let gradienClasses = `bg-gradient-to-r bg-gradient-to-l`
  

  return (
      <div 
      className={` transition-all shadow shadow-white text-nowrap  bg-gradient-to-r from-red-500 from-10%  via-30% to-50% gap-x-5  ${buttonClasses} `}  
      >
            {children}
      </div>

  );
};

export default FilterButton;
