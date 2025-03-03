import { CopyDoneIcon, CopyIcon } from '@/components/global/Icons';
import { useState } from 'react';
import { toast } from 'react-toastify';

export default function CopyAddressButton({
  address,
  size = 20,
}: {
  address: string;
  size?: number;
}) {
  const [isCopied, setCopied] = useState(false);

  return (
    <div
      onClick={(e) => {
        setCopied(true);
        navigator.clipboard.writeText(address);
        toast.success('address copied to clipboard');
        setTimeout(() => {
          setCopied(false);
        }, 1000);
      }}
      className='cursor-pointer hover:text-gray-200 shrink-0'
    >
      {isCopied ? (
        <CopyDoneIcon width={size} height={size} />
      ) : (
        <CopyIcon width={size} height={size} />
      )}
    </div>
  );
}
