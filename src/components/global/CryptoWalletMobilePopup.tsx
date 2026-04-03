'use client';

import sdk from '@farcaster/frame-sdk';
import Cookies from 'js-cookie';
import { useEffect, useState } from 'react';

export default function CryptoWalletMobilePopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const popupClosed = Cookies.get('walletPopupClosed');
    const isHomePage = window.location.pathname === '/';
    const isMobile = /Mobi|Android|iPhone|iPad|iPod|Tablet|Mobile|CriOS/i.test(
      navigator.userAgent
    );
    const isMiniApp = sdk.isInMiniApp();

    if (isMobile && !isMiniApp && !isHomePage && !popupClosed) {
      setOpen(true);
    }
  }, []);

  const handleClose = () => {
    setOpen(false);
    Cookies.set('walletPopupClosed', 'true', { expires: 365 * 100 });
  };

  if (!open) {
    return null;
  }

  return (
    <div
      className='fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4'
      onClick={handleClose}
      style={{ minHeight: '-webkit-fill-available' }}
    >
      <div
        className='bg-poidhBlue/80 dark:bg-[#132b47] rounded-xl w-[calc(100vw-2rem)] sm:w-[450px] max-w-[450px] p-6 relative animate-fadeIn border border-[#D1ECFF]'
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className='absolute top-0 right-0 text-white/70 hover:text-white transition-colors p-2'
          onClick={handleClose}
        >
          <svg
            className='w-5 h-5'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M6 18L18 6M6 6l12 12'
            />
          </svg>
        </button>
        <div className='space-y-4'>
          <h3 className='font-mono text-lg font-bold text-poidhRed text-center'>
            mobile wallet recommended
          </h3>
          <p className='text-center text-white/90 leading-relaxed'>
            for best results we recommend using your crypto wallet's mobile
            browser
          </p>
          <div className='text-center'>
            <span className='text-white/90'>
              if you need a wallet, we suggest{' '}
            </span>
            <a
              href='https://rainbow.me'
              className='text-[#D1ECFF] hover:text-white font-medium transition-colors underline'
              target='_blank'
              rel='noopener noreferrer'
            >
              rainbow.me
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
