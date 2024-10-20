export default function ButtonCTA({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className='flex backdrop-blur-sm bg-[#D1ECFF]/20 	text-bold bg-gradient-to-t from-white-200 from-10%  via-30% to-50% gap-x-5 border border-white rounded-full px-5 py-2'>
        {children}
      </div>
    </div>
  );
}
