import { Transition } from '@headlessui/react';

export default function Loading({
  open,
  status,
}: {
  open: boolean;
  status: string;
}) {
  return (
    <div className='fixed top-0 left-0 right-0 z-50'>
      <Transition
        open={open}
        enter='transition-transform duration-500 ease-out'
        enterFrom='-translate-y-full'
        enterTo='translate-y-0'
        leave='transition-transform duration-400 ease-in'
        leaveFrom='translate-y-0'
        leaveTo='-translate-y-full'
      >
        <div className='bg-white/70 backdrop-blur-sm border-b border-gray-200/20 text-primary-700 px-6 py-3 flex items-center justify-center shadow-sm'>
          <div className='flex items-center space-x-4'>
            <div className='animate-spin h-5 w-5 border-[2.5px] border-primary-600 border-t-transparent rounded-full' />
            <span className='text-sm font-medium text-primary-600'>
              {status}
            </span>
          </div>
        </div>
      </Transition>
    </div>
  );
}
