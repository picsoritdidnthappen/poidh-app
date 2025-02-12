import { useState } from 'react';
import { ExpandMoreIcon } from '@/components/global/Icons';
import { cn } from '@/utils';
import CopyAddressButton from '../global/CopyAddressButton';
import DisplayAddress from '../global/DisplayAddress';
import { useGetChain } from '@/hooks/useGetChain';
import Link from 'next/link';

type Transactions = {
  tx: string;
  address: string;
  action: string;
  timestamp: number;
};

export default function BountyHistory({
  transactions,
}: {
  transactions: Transactions[];
}) {
  const [showHistory, setShowHistory] = useState(false);
  const chain = useGetChain();

  return (
    <div className='max-w-3xl border border-white/20 rounded-lg backdrop-blur-sm bg-[#D1ECFF]/10 mt-5'>
      <button
        onClick={() => setShowHistory((prev) => !prev)}
        className='w-full px-5 py-3 flex justify-between items-center hover:bg-[#D1ECFF]/10 transition-all'
      >
        <span>{transactions.length} transactions</span>
        <span
          className={cn(
            'transition-transform duration-200',
            showHistory ? 'rotate-180' : ''
          )}
        >
          <ExpandMoreIcon width={16} height={16} />
        </span>
      </button>

      {showHistory && (
        <div className='divide-y divide-white/10'>
          {transactions.map((transaction, index) => (
            <div
              key={`${transaction.tx}-${index}`}
              className='flex items-center p-4 hover:bg-[#D1ECFF]/10 transition-all'
            >
              <div className='flex flex-col sm:flex-row sm:items-center w-full gap-2 sm:gap-4'>
                <div className='flex items-center gap-1 min-w-[200px]'>
                  {transaction.address !== '0x00' && (
                    <>
                      <CopyAddressButton
                        address={transaction.address}
                        size={12}
                      />
                      <DisplayAddress
                        chain={chain}
                        address={transaction.address}
                      />
                    </>
                  )}
                </div>

                <Link
                  className='flex items-center justify-between w-full sm:justify-start gap-4'
                  href={chain.explorer + transaction.tx}
                  target='_blank'
                >
                  <div className='px-2 py-0.5 rounded-md bg-white/10 text-sm'>
                    {transaction.action}
                  </div>
                  <div className='text-sm text-white/60'>
                    {new Date(
                      transaction.timestamp * 1000
                    ).toLocaleDateString()}
                  </div>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
