
const ButtonCTA = ({ children }: { children: React.ReactNode }) => {
  let buttonClasses = `border border-white rounded-full px-5 py-2`
  return (
    <div>
      <button className={` flex bg-white bg-opacity-50 backdrop-blur-md	text-bold bg-gradient-to-t from-white-200 from-10%  via-30% to-50% gap-x-5  ${buttonClasses} `}  >
           {children}
      </button>
    </div>
  );
};

export default ButtonCTA;