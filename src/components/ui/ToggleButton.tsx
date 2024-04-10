import React, { useState } from 'react';

interface ToggleButtonProps {
  option1: string;
  option2: string;
  handleToggle: (option: string) => void;
}

const ToggleButton: React.FC<ToggleButtonProps> = ({ option1, option2, handleToggle }) => {
  const [isOption1, setIsOption1] = useState(false);

  const toggleOption = () => {
    setIsOption1(!isOption1);
    const selectedOption = isOption1 ? option2 : option1;
    handleToggle(selectedOption);
  };

  let buttonClasses = `border border-white rounded-full px-5 py-2`

  let gradientClasses = `bg-gradient-to-r bg-gradient-to-l`
  
  return (
    <div className='flex container mx-auto border-b border-white  py-12 w-full  justify-center'> 
      <button className={` flex transition-all  bg-gradient-to-${isOption1 ? "l" : "r"} from-red-500 from-10%  via-30% to-50% gap-x-5 ${isOption1 ? "option1" : "option2"} ${buttonClasses} `}  onClick={toggleOption}>
            {option1} <span>|</span> {option2}
      </button>
    </div>
  );
};

export default ToggleButton;
