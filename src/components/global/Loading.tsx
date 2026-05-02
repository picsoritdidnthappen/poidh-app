import { Transition } from '@headlessui/react';

export default function Loading({
  open,
  status,
}: {
  open: boolean;
  status: string;
}) {
  return (
    <div className='fixed top-0 left-0 right-0 z-[1401]'>
      <Transition
        show={open}
        enter='transition-transform duration-500 ease-out'
        enterFrom='-translate-y-full'
        enterTo='translate-y-0'
        leave='transition-transform duration-400 ease-in'
        leaveFrom='translate-y-0'
        leaveTo='-translate-y-full'
      >
        <div className='bg-white/70 dark:bg-[#0d1b2e]/90 backdrop-blur-sm border-b border-gray-200/20 dark:border-white/10 px-6 py-3 flex items-center justify-center shadow-sm'>
          <div className='flex items-center space-x-4'>
            <div className='animate-spin h-5 w-5 border-[2.5px] border-poidhBlue border-t-transparent rounded-full' />
            <span className='text-sm font-medium text-poidhBlue dark:text-white'>
              {status}
            </span>
          </div>
        </div>
      </Transition>
    </div>
  );
}
