'use client';

import { useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import { usePublicClient } from 'wagmi';

type TransactionStatus = 'confirming' | 'confirmed' | 'failed' | 'unknown';

type Props = {
  open: boolean;
  hash: `0x${string}` | null;
  chainId: number;
  onClose: (failed: boolean) => void;
};

const VOTING_DOCS_URL =
  'https://docs.poidh.xyz/using-poidh/voting-on-claims.html';

export default function SubmitVotingSuccessModal({
  open,
  hash,
  chainId,
  onClose,
}: Props) {
  const publicClient = usePublicClient({ chainId });
  const [result, setResult] = useState<{
    hash: `0x${string}`;
    status: TransactionStatus;
  } | null>(null);
  const [checkAttempt, setCheckAttempt] = useState(0);

  const status: TransactionStatus =
    result?.hash === hash ? result.status : 'confirming';

  useEffect(() => {
    if (!hash) return;

    let cancelled = false;
    setResult({ hash, status: 'confirming' });

    if (!publicClient) {
      setResult({ hash, status: 'unknown' });
      return;
    }

    publicClient
      .waitForTransactionReceipt({
        hash,
        confirmations: 1,
        timeout: 90_000,
      })
      .then((receipt) => {
        if (cancelled) return;
      
        const originalTransactionConfirmed =
          receipt.transactionHash.toLowerCase() === hash.toLowerCase();
      
        setResult({
          hash,
          status: !originalTransactionConfirmed
            ? 'unknown'
            : receipt.status === 'success'
              ? 'confirmed'
              : 'failed',
        });
      })
      .catch(() => {
        if (!cancelled) setResult({ hash, status: 'unknown' });
      });

    return () => {
      cancelled = true;
    };
  }, [hash, publicClient, checkAttempt]);

  const explorer =
    chainId === 42161
      ? 'https://arbiscan.io'
      : chainId === 8453
        ? 'https://basescan.org'
        : 'https://etherscan.io';

  return (
    <Dialog
      open={open}
      onClose={() => onClose(status === 'failed')}
      fullWidth
      maxWidth='sm'
      aria-labelledby='nomination-status-heading'
      PaperProps={{
        sx: {
          backgroundColor: '#173653',
          color: 'white',
          border: '1px solid rgba(255,255,255,0.35)',
          borderRadius: '16px',
        },
      }}
    >
      <div className='p-5 sm:p-8 normal-case' aria-live='polite'>
        <div className='flex items-start justify-between gap-4'>
          <h2 id='nomination-status-heading' className='text-xl sm:text-2xl font-bold normal-case'>
            {status === 'confirmed'
              ? '✅ claim submitted for vote!'
              : status === 'confirming'
                ? '⏳ confirming your nomination...'
                : status === 'failed'
                  ? 'transaction failed'
                  : 'transaction status not yet confirmed'}
          </h2>
          <button
            type='button'
            aria-label='Close nomination status'
            onClick={() => onClose(status === 'failed')}
            className='shrink-0 text-2xl leading-none text-white hover:opacity-70'
          >
            ×
          </button>
        </div>

        <p className='mt-4 text-sm sm:text-base leading-relaxed normal-case'>
          {status === 'confirmed'
            ? 'your transaction is confirmed onchain and your nomination is now up for contributor vote.'
            : status === 'confirming'
              ? 'your wallet submitted the transaction and we are waiting for onchain confirmation.'
              : status === 'failed'
                ? 'your transaction reverted onchain and the nomination did not start.'
                : 'we could not verify the final transaction status yet, please check the transaction on the block explorer before trying to nominate again.'}
        </p>

        {status === 'confirmed' && (
          <>
            <h3 className='mt-6 font-bold normal-case'>what happens next?</h3>
            <p className='mt-2 text-sm sm:text-base leading-relaxed normal-case'>
              your nomination also casts your voting shares as YES. other
              contributors have 48 hours to vote YES or NO.
            </p>
            <div className='mt-5 rounded-lg border border-white/30 bg-white/10 p-4'>
              <p className='font-bold normal-case'>
                voting may take a little time to appear
              </p>
              <p className='mt-2 text-sm leading-relaxed normal-case'>
                poidh may need a moment to index your transaction. if you do not
                see the voting section on the bounty page, refresh the page.
                your nomination is already confirmed — you do not need to
                submit it again.
              </p>
            </div>
          </>
        )}

        {hash && (
          <a
            href={`${explorer}/tx/${hash}`}
            target='_blank'
            rel='noopener noreferrer'
            className='mt-5 block w-fit underline text-sm text-white hover:opacity-75 normal-case'
          >
            view transaction ↗
          </a>
        )}
        <a
          href={VOTING_DOCS_URL}
          target='_blank'
          rel='noopener noreferrer'
          className='mt-3 block w-fit underline text-sm text-white hover:opacity-75 normal-case'
        >
          questions? read the voting docs ↗
        </a>

        <div className='mt-7 flex flex-wrap gap-3'>
          {status === 'confirmed' && (
            <button
              type='button'
              onClick={() => window.location.reload()}
              className='rounded-lg bg-poidhRed px-5 py-3 font-semibold text-white hover:opacity-90 normal-case'
            >
              refresh bounty page
            </button>
          )}
          {status === 'unknown' && (
            <button
              type='button'
              onClick={() => setCheckAttempt((count) => count + 1)}
              className='rounded-lg bg-poidhRed px-5 py-3 font-semibold text-white hover:opacity-90 normal-case'
            >
              check transaction again
            </button>
          )}
          <button
            type='button'
            onClick={() => onClose(status === 'failed')}
            className='rounded-lg border border-white/40 px-5 py-3 text-white hover:bg-white/10 normal-case'
          >
            {status === 'confirmed' ? 'done' : 'close'}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
