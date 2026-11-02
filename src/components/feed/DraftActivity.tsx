import Link from 'next/link';
import DisplayAddress from '@/components/global/DisplayAddress';

export type PublicBountyDraft = {
  cid: string;
  url: string;
  creator: string;
  title: string;
  amount: string;
  chain: 'mainnet' | 'base' | 'arbitrum';
  currency: 'ETH';
  createdAt: string;
  status: 'draft';
};

const chainLabels: Record<PublicBountyDraft['chain'], string> = {
  mainnet: 'Ethereum',
  base: 'Base',
  arbitrum: 'Arbitrum',
};

export default function DraftActivity({ draft }: { draft: PublicBountyDraft }) {
  const createdAt = new Date(draft.createdAt);
  const date = createdAt.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const time = createdAt.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div className='w-full max-w-full sm:max-w-3xl bg-white/5 border border-white/8 rounded-lg backdrop-blur-sm mt-4 sm:mt-5 overflow-hidden shadow-sm'>
      <div className='px-4 py-3 sm:px-6 sm:py-4 bg-[#7fb7ee] dark:bg-[#132b47]'>
        <div className='flex items-start justify-between gap-4'>
          <DisplayAddress
            address={draft.creator}
            pfpSize={36}
            showPfpIfExists
            showFallbackPfp
            showLoadingSkeleton
          />
          <div className='text-xs sm:text-sm text-white/60 whitespace-nowrap ml-auto text-right'>
            <div>{date}</div>
            <div>{time}</div>
          </div>
        </div>
        <p className='mt-3 text-sm sm:text-base text-white/90 font-mono leading-relaxed'>
          saved a new bounty draft 📝
        </p>
      </div>
      <div className='border-t border-white/6 px-4 pb-4 pt-2'>
        <div className='mt-3 p-3 sm:p-4 border border-white/6 rounded-md bg-gradient-to-b from-[#2a81d5] via-[#70aae2] to-[#2a81d5] dark:from-[#0d1b2e] dark:via-[#1a3a5c] dark:to-[#0d1b2e]'>
          <Link href={draft.url} className='flex items-center justify-between gap-4'>
            <div className='flex flex-col flex-1 min-w-0 gap-2'>
              <span className='font-mono text-base break-words'>{draft.title}</span>
              <span className='font-mono text-sm text-white/70'>
                proposed: {draft.amount} {draft.currency} · {chainLabels[draft.chain]}
              </span>
              <span className='font-mono text-xs text-white/70'>draft · not funded</span>
            </div>
            <span className='text-xs text-white/60 hover:text-poidhRed shrink-0'>open</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
