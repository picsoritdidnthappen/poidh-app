'use client';

import React from 'react';
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
  Description as DialogDescription,
} from '@headlessui/react';
import { CloseIcon } from '@/components/global/Icons';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  side?: 'right' | 'left';
  className?: string;
}

export function Sheet({
  open,
  onClose,
  children,
  side = 'right',
  className = '',
}: SheetProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      className='relative z-[2147483647]'
      style={{ zIndex: 2147483647 }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html:
            '.Toastify__toast-container { z-index: 2147483647 !important; }',
        }}
      />
      <DialogBackdrop
        transition
        className='fixed inset-0 z-[2147483646] bg-black/60 backdrop-blur-[2px] transition-opacity duration-300 ease-out data-[closed]:opacity-0'
        style={{ zIndex: 2147483646 }}
      />

      <div
        className='fixed inset-0 z-[2147483647] overflow-hidden'
        style={{ zIndex: 2147483647 }}
      >
        <div className='absolute inset-0 overflow-hidden'>
          <div
            className={`pointer-events-none fixed inset-y-0 z-[2147483647] flex max-w-full ${
              side === 'right' ? 'right-0 pl-10' : 'left-0 pr-10'
            }`}
            style={{ zIndex: 2147483647 }}
          >
            <DialogPanel
              transition
              className={`pointer-events-auto z-[2147483647] w-screen max-w-md transform transition duration-300 ease-in-out ${
                side === 'right'
                  ? 'data-[closed]:translate-x-full border-l'
                  : 'data-[closed]:-translate-x-full border-r'
              } bg-[#121B28] border-white/10 text-white shadow-2xl flex flex-col font-mono normal-case ${className}`}
              style={{ zIndex: 2147483647 }}
            >
              {children}
            </DialogPanel>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

export function SheetHeader({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`p-5 pb-4 border-b border-white/10 flex items-start justify-between ${className}`}
    >
      {children}
    </div>
  );
}

export function SheetTitle({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <DialogTitle
      className={`text-base font-bold text-white tracking-wide normal-case ${className}`}
    >
      {children}
    </DialogTitle>
  );
}

export function SheetDescription({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <DialogDescription
      className={`text-xs text-gray-400 mt-1 normal-case ${className}`}
    >
      {children}
    </DialogDescription>
  );
}

export function SheetContent({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex-1 overflow-y-auto p-5 ${className}`}>{children}</div>
  );
}

export function SheetFooter({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`p-5 pt-3 border-t border-white/10 flex items-center gap-2 ${className}`}
    >
      {children}
    </div>
  );
}

export function SheetClose({
  onClick,
  className = '',
}: {
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      className={`text-white/60 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors ${className}`}
      aria-label='Close'
    >
      <CloseIcon size={18} />
    </button>
  );
}
