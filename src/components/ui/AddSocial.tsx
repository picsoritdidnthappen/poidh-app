import React, { useState } from 'react';
import { DialogPanel, DialogTitle, Dialog } from '@headlessui/react';
import { TwitterXIcon, FarcasterIcon } from '../global/Icons';
import { toast } from 'react-toastify';
import { useAccount, useSignMessage, useSwitchChain } from 'wagmi';
import { trpc } from '@/trpc/client';
import { useMutation } from '@tanstack/react-query';
import {
  FARCASTER_URL_REGEX,
  TWITTER_URL_REGEX,
  getAddSocialSignatureFirstLine,
} from '@/utils/utils';
import { SocialType } from '@/utils/types';

export default function AddSocial({
  open,
  onClose,
  address,
}: {
  open: boolean;
  onClose: () => void;
  address: string;
}) {
  const account = useAccount();
  const switctChain = useSwitchChain();
  const { signMessageAsync } = useSignMessage();

  const [socialType, setSocialType] = useState<SocialType>('twitter');
  const [link, setLink] = useState('');

  const utils = trpc.useUtils();
  const addSocialNetwork = trpc.addSocialNetwork.useMutation();

  const signMutation = useMutation({
    mutationFn: async ({
      link,
      socialType,
    }: {
      link: string;
      socialType: SocialType;
    }) => {
      const chainId = await account.connector?.getChainId();
      if (chainId !== 8453) {
        //arbitrum has a problem with message signing, so all confirmations are on base
        await switctChain.switchChainAsync({ chainId: 8453 });
      }
      const message = getAddSocialSignatureFirstLine({
        link,
        type: socialType,
        address,
      });

      if (account.address) {
        const signature = await signMessageAsync({ message }).catch(() => null);
        if (!signature) {
          throw new Error('Failed to sign message');
        }

        await addSocialNetwork.mutateAsync({
          address,
          link,
          socialType,
          message,
          signature,
        });

        return socialType;
      }
    },
    onSuccess: (data) => {
      toast.success(`${data} added`);
    },
    onError: (error) => {
      toast.error('Failed to add social network: ' + error.message);
    },
    onSettled: () => {
      utils.accountSocials.refetch();
      onClose();
    },
  });

  function validateLink() {
    if (!link) {
      toast.error('Link is required');
      return false;
    }

    if (socialType === 'twitter') {
      if (!link.match(TWITTER_URL_REGEX)) {
        toast.error('Invalid Twitter link');
        return false;
      }
    } else {
      if (!link.match(FARCASTER_URL_REGEX)) {
        toast.error('Invalid Farcaster link');
        return false;
      }
    }
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (validateLink()) {
      await signMutation.mutateAsync({ link, socialType });
    }
  }

  return (
    <Dialog open={open} onClose={onClose} className='relative z-50'>
      <div className='fixed inset-0 flex items-center justify-center overflow-y-auto'>
        <div
          className='fixed inset-0 bg-black/30 backdrop-blur-sm'
          aria-hidden='true'
        />

        <div className='relative flex min-h-full items-center justify-center p-4'>
          <DialogPanel className='w-full max-w-sm rounded-xl p-3 bg-gradient-to-b from-[#2a81d5] to-[#70aae2]'>
            <div className='bg-blur rounded-lg p-4 space-y-6 border border-white/20'>
              <DialogTitle
                as='h3'
                className='text-lg font-bold text-center border-b-2 border-white/20 pb-2 text-white'
              >
                Add Social Account
              </DialogTitle>

              <form onSubmit={handleSubmit} className='space-y-6'>
                <div className='flex justify-center gap-4'>
                  {(['twitter', 'farcaster'] as const).map((type) => (
                    <button
                      key={type}
                      type='button'
                      onClick={() => {
                        setSocialType(type);
                        setLink('');
                      }}
                      className={`p-3 rounded-lg transition-all duration-200 transform hover:scale-105 ${
                        socialType === type
                          ? 'bg-blur-white text-white border-2 border-white/20 shadow-lg'
                          : 'bg-blur text-white/70 hover:text-white border border-white/10 hover:border-white/30'
                      }`}
                    >
                      {type === 'twitter' ? (
                        <TwitterXIcon width={28} height={28} />
                      ) : (
                        <FarcasterIcon width={28} height={28} />
                      )}
                    </button>
                  ))}
                </div>

                <div className='space-y-2'>
                  <label
                    htmlFor='link'
                    className='block text-sm font-medium text-white/90'
                  >
                    Link
                  </label>
                  <input
                    id='link'
                    type='text'
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    placeholder={`Enter your ${socialType} handle`}
                    className='w-full px-4 py-3 rounded-lg bg-blur-white border border-white/20 text-white placeholder-white/40 focus:border-white/40 focus:ring-1 focus:ring-white/40 transition-colors duration-200'
                  />
                </div>

                <div className='flex justify-end gap-3 pt-4'>
                  <button
                    type='button'
                    onClick={onClose}
                    className='px-4 py-2 rounded-lg bg-blur text-white/80 hover:text-white border border-white/20 transition-all duration-200 hover:border-white/40'
                  >
                    Cancel
                  </button>
                  <button type='submit' className='relative group'>
                    <div className='absolute inset-0 bg-[#2a81d5] rounded-lg transform translate-y-[2px]'></div>
                    <div className='relative bg-[#3498db] text-white py-2 px-6 rounded-lg text-sm font-bold transition-all duration-75 group-hover:-translate-y-[1px] group-active:translate-y-[2px] border-2 border-t-[#4aa3ef] border-l-[#4aa3ef] border-r-[#2a81d5] border-b-[#2a81d5]'>
                      <span className='drop-shadow-[1px_1px_0px_rgba(0,0,0,0.5)] tracking-wide'>
                        Add Social
                      </span>
                    </div>
                  </button>
                </div>
              </form>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
