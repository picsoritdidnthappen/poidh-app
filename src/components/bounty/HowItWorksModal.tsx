import Link from 'next/link';
import { useEffect } from 'react';

export default function HowItWorksModal({ onClose }: { onClose: () => void }) {
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  useEffect(() => {
    document.body.classList.add('how-it-works-modal-open');

    return () => {
      document.body.classList.remove('how-it-works-modal-open');
    };
  }, []);

  return (
    <div
      className='fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4'
      onClick={handleBackdropClick}
    >
      <div className='bg-poidhBlue/90 dark:bg-[#132b47] border border-[#D1ECFF] rounded-[30px] shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col transform transition-all'>
        <div className='flex justify-end p-4 pb-2'>
          <button
            onClick={onClose}
            className='p-1 hover:bg-white/20 rounded-full transition-colors text-white'
            aria-label='Close'
          >
            <svg
              width='16'
              height='16'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
            >
              <path d='M18 6L6 18M6 6l12 12' />
            </svg>
          </button>
        </div>
        <div className='overflow-y-auto p-6 pt-0 space-y-6'>
          <div>
            <h3 className='text-lg font-medium mb-3 text-white'>
              💡 what are bounties?
            </h3>
            <p className='text-white/80 leading-relaxed'>
              Bounties on poidh are community challenges with real rewards. They
              can be something simple like "take a photo of something blue" or
              as ambitious as "break the world record for kickflips in one
              minute." Anyone can create a bounty and other users can chip in
              funds to increase the reward pool, turning small ideas into big
              prizes.
            </p>
          </div>

          <div>
            <h3 className='text-lg font-medium mb-3 text-white'>
              🏆 how do I claim a bounty?
            </h3>
            <p className='text-white/80 leading-relaxed'>
              Find a bounty you like, connect your wallet, and click the big red
              "create claim" button. You'll be asked to submit an image, a title
              for your claim, and to provide a claim description. If the bounty
              you are claiming asks for proof beyond a single image, you can
              link to external resources like social media posts or video URLs
              within your claim description.
            </p>
          </div>

          <div>
            <h3 className='text-lg font-medium mb-3 text-white'>
              💰 how do I get paid?
            </h3>
            <p className='text-white/80 leading-relaxed'>
              When a bounty is funded, the prize pool is locked onchain until
              someone wins. For bounties with a single contributor, after a
              claim is verified by the bounty creator, the payout is sent
              directly to the claimant's wallet. For bounties with multiple
              contributors, a 48 hour onchain voting period is required to allow
              all contributors to weigh in on the selection. If {'>'}50% of
              voting contributors (weighted by contribution amount) vote "no",
              the bounty will be reset and no payment will be made. If {'>'}50%
              vote "yes", the payout is confirmed. Payments are instant and
              transparent. However, poidh does take a 2.5% fee on completed
              bounties.
            </p>
          </div>
          <div className='pb-6 pt-0'>
            <p className='text-white/80 leading-relaxed'>
              still need help?{' '}
              <Link
                href='https://paragraph.com/@poidh/poidh-beginner-guide'
                target='_blank'
                rel='noopener noreferrer'
                className='text-white hover:text-white/80 underline transition-colors'
              >
                check out our beginner's guide
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
