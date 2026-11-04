'use client';

import Dialog from '@mui/material/Dialog';

export type NominationStatus =
  | 'confirming'
  | 'confirmed'
  | 'unknown'
  | 'failed';

export type NominationState = {
  status: NominationStatus;
  hash: `0x${string}`;
  at?: number;
};

const DOCS_URL =
  'https://docs.poidh.xyz/using-poidh/voting-on-claims.html';

export default function VoteNominationStatusModal({
  state,
  chainId,
  onClose,
}: {
  state: NominationState | null;
  chainId: number;
  onClose: () => void;
}) {
  const explorer =
    chainId === 1
      ? 'https://etherscan.io'
      : chainId === 42161
        ? 'https://arbiscan.io'
        : 'https://basescan.org';

  const confirmed = state?.status === 'confirmed';
  const confirming = state?.status === 'confirming';
  const failed = state?.status === 'failed';

  return (
    <Dialog
      open={!!state}
      onClose={onClose}
      fullWidth
      maxWidth='sm'
      PaperProps={{
        sx: {
          backgroundColor: '#1b3857',
          color: 'white',
          border: '1px solid rgba(255,255,255,.35)',
          borderRadius: '16px',
        },
      }}
    >
      <div className='p-6 sm:p-8' aria-live='polite'>
        <h2 className='text-xl font-bold'>
          {confirmed
            ? '✅ claim submitted for vote!'
            : confirming
              ? '⏳ confirming your nomination...'
              : failed
                ? 'transaction failed'
                : 'transaction status not yet confirmed'}
        </h2>

        <p className='mt-4 text-sm leading-relaxed'>
          {confirmed
            ? 'Your transaction is confirmed onchain. You successfully nominated this claim for the contributor vote.'
            : confirming
              ? 'Your wallet submitted the transaction. poidh is checking that it was confirmed onchain. Please do not submit it again.'
              : failed
                ? 'The transaction failed onchain, so the vote was not started.'
                : 'Your transaction was submitted, but poidh could not verify its final status yet. Check the transaction before attempting another nomination.'}
        </p>

        {confirmed && (
          <>
            <h3 className='mt-5 font-bold'>
              what happens next?
            </h3>
            <p className='mt-2 text-sm leading-relaxed'>
              Your nomination casts your voting shares as YES.
              Other bounty contributors have 48 hours to
              vote YES or NO.
            </p>

            <div className='mt-5 rounded-lg border border-white/30 bg-white/10 p-4'>
              <p className='text-sm font-bold'>
                the voting section might not appear immediately
              </p>
              <p className='mt-2 text-sm leading-relaxed'>
                poidh may need a little time to update the
                bounty page. If you don't see the voting
                display, refresh the page. Your nomination
                is already confirmed — you do not need
                to submit it again.
              </p>
            </div>
          </>
        )}

        {state && (
          <a
            href={`${explorer}/tx/${state.hash}`}
            target='_blank'
            rel='noopener noreferrer'
            className='mt-5 block w-fit text-sm underline hover:opacity-80'
          >
            view transaction ↗
          </a>
        )}

        <a
          href={DOCS_URL}
          target='_blank'
          rel='noopener noreferrer'
          className='mt-3 block w-fit text-sm underline hover:opacity-80'
        >
          questions? read the voting docs ↗
        </a>

        <div className='mt-7 flex flex-wrap gap-3'>
          {confirmed && (
            <button
              type='button'
              onClick={() => window.location.reload()}
              className='rounded-lg bg-poidhRed px-5 py-3 text-sm font-bold text-white'
            >
              refresh bounty page
            </button>
          )}

          <button
            type='button'
            onClick={onClose}
            className='rounded-lg border border-white/40 px-5 py-3 text-sm text-white hover:bg-white/10'
          >
            {confirmed ? 'done' : 'close'}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
