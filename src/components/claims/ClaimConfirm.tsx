import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import Image from 'next/image';

export default function ClaimConfirm({
  isOpen,
  onClose,
  imageUrl,
  onConfirm,
}: {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  onConfirm: () => void;
}) {
  return (
    <>
      <Dialog open={isOpen} onClose={onClose} className='relative z-50'>
        <div className='fixed inset-0 bg-black/30 flex items-center justify-center p-4'>
          <DialogPanel className='w-[calc(100vw-2rem)] sm:w-[450px] max-w-[450px] rounded-xl p-6 bg-poidhBlue dark:bg-[#132b47] border border-[#D1ECFF]'>
            <DialogTitle className='font-mono text-2xl font-bold text-white mb-4 text-center'>
              Confirm Your Claim
            </DialogTitle>

            <div className='flex flex-col items-center gap-4'>
              <div className='w-full aspect-square rounded-lg overflow-hidden bg-white/10 relative'>
                <Image
                  src={imageUrl}
                  alt='Claim preview'
                  fill
                  className='object-cover'
                />
              </div>

              <p className='text-white text-sm'>
                you're about to mint your claim as an nft. you cannot undo this
                action. if the bounty creator selects your claim, the nft will
                transfer to them, and the bounty funds will transfer to you.
              </p>

              <div className='flex gap-3 w-full mt-2'>
                <button
                  onClick={onClose}
                  className='flex-1 px-4 py-2 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors'
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  className='flex-1 px-4 py-2 rounded-lg bg-poidhRed text-white font-semibold hover:bg-[#FF3737] transition-colors'
                >
                  submit claim
                </button>
              </div>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
}
