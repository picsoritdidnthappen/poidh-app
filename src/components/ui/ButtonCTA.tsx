const ButtonCTA = ({ children }: { children: React.ReactNode }) => {
  const buttonClasses = `border border-white rounded-full px-5 py-2`;
  return (
    <div>
      <div
        className={` flex cursor-pointer hover:bg-poidhRed active:bg-poidhRed  backdrop-blur-sm bg-[#D1ECFF]/20 	text-bold bg-gradient-to-t from-white-200 from-10%  via-30% to-50% gap-x-5  ${buttonClasses} `}
      >
        {children}
      </div>
    </div>
  );
};

export default ButtonCTA;
