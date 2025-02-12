const Button = ({ children }: { children: React.ReactNode }) => {
  return (
    <div>
      <button
        className={
          'flex from-red-500 from-10%  via-30% to-50% gap-x-5 border border-[#F15E5F] text-[#F15E5F] hover:bg-red-400 hover:text-white rounded-md px-5 py-2'
        }
      >
        {children}
      </button>
    </div>
  );
};

export default Button;
