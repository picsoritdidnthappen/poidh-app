'use client';

import { useRef, useState } from 'react';
import { useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { toast } from 'react-toastify';
import FormBounty, {
  type BountyDraftFields,
  type FormBountyHandle,
} from '@/components/bounty/FormBounty';
import DisplayAddress from '@/components/global/DisplayAddress';

export function DraftAuthor({ address }: { address: string }) {
  return (
    <div className='mt-2 inline-flex max-w-full items-center'>
      <DisplayAddress
        address={address}
        pfpSize={24}
        showPfpIfExists
        showFallbackPfp
        showLoadingSkeleton
      />
    </div>
  );
}

export default function DraftActions({ draft }: { draft: BountyDraftFields }) {
  const account = useAccount();
  const { openConnectModal } = useConnectModal();
  const formRef = useRef<FormBountyHandle>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const closeForm = () => {
    setFormOpen(false);
    // Opening the draft again always starts from the original IPFS snapshot.
    // Any edits made in the form never modify the shared draft.
    setFormKey((previous) => previous + 1);
  };

  const handleCreate = () => {
    // Show the existing creation form while awaiting wallet confirmation.
    setFormOpen(true);

    if (!account.address) {
      toast.info('Connect your wallet to create this bounty');
      openConnectModal?.();
      return;
    }

    // Calls the *existing* FormBounty validation and mutation, rather than
    // creating another transaction path for IPFS drafts.
    formRef.current?.createBounty();
  };

  return (
    <>
      <div className='mt-8 flex flex-col gap-3 sm:flex-row sm:items-center'>
        <button
          type='button'
          onClick={handleCreate}
          className='rounded-lg bg-poidhRed px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90'
        >
          create bounty
        </button>
        <button
          type='button'
          onClick={() => setFormOpen(true)}
          className='rounded-lg border border-white/40 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/20'
        >
          edit bounty
        </button>
      </div>
      <p className='mt-3 text-xs text-white/70'>
        creating a bounty submits an onchain transaction from your wallet.
        editing changes only your copy; the shared draft stays the same.
      </p>

      <FormBounty
        key={formKey}
        ref={formRef}
        open={formOpen}
        onClose={closeForm}
        initialDraft={draft}
      />
    </>
  );
}
