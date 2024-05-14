const Button = ({ children }: { children: React.ReactNode }) => {
  const buttonClasses = `border border-[#F15E5F] text-[#F15E5F] rounded-md px-5 py-2`;

  return (
    <div>
      <button
        className={` flex  from-red-500 from-10%  via-30% to-50% gap-x-5  ${buttonClasses} `}
      >
        {children}
      </button>
    </div>
  );
};

export default Button;
