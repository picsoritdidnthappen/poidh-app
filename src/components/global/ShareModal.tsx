'use client';

import { useEffect } from 'react';
import type { ReactNode } from 'react';

export type ShareOption = {
  name: string;
  icon: ReactNode;
  onClick: () => void | Promise<void>;
  description?: string;
};

export default function ShareModal({
  title,
  onClose,
  options,
  footerText,
}: {
  title: string;
  onClose: () => void;
  options: ShareOption[];
  footerText?: string;
}) {
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [onClose]);

  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className='fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4'
      onClick={handleBackdropClick}
    >
      <div className='bg-poidhBlue/90 dark:bg-[#132b47] border border-[#D1ECFF] rounded-[30px] shadow-2xl w-full max-w-sm mx-auto transform transition-all'>
        <div className='flex items-center justify-between p-6 border-b border-white/20'>
          <h2 className='text-xl font-semibold text-white'>{title}</h2>
          <button
            onClick={onClose}
            className='p-2 hover:bg-white/20 rounded-full transition-colors text-white'
            aria-label='Close'
          >
            <svg
              width='20'
              height='20'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
            >
              <path d='M18 6L6 18M6 6l12 12' />
            </svg>
          </button>
        </div>

        <div className='p-6'>
          <div className='flex flex-col gap-3'>
            {options.map((option) => (
              <button
                key={option.name}
                onClick={option.onClick}
                className='flex items-center gap-4 p-4 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 transition-all group w-full text-left'
              >
                <div className='text-white group-hover:text-white transition-colors'>
                  {option.icon}
                </div>
                <span className='text-base font-medium text-white group-hover:text-white transition-colors'>
                  {option.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {footerText ? (
          <div className='px-6 pb-6'>
            <p className='text-sm text-white/70 text-center'>{footerText}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
