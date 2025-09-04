export default function Terms() {
  return (
    <main className='min-h-screen bg-poidhBlue/10 py-16 px-4'>
      <div className='mx-auto max-w-3xl'>
        <header className='mb-8 text-center'>
          <h1 className="text-3xl sm:text-4xl font-['PixeloidSans'] font-extrabold tracking-tight mb-3 text-poidhRed [text-shadow:-0.5px_-0.5px_0_white,0.5px_-0.5px_0_white,-0.5px_0.5px_0_white,0.5px_0.5px_0_white]">
            Terms of Service
          </h1>
        </header>

        <article className='relative rounded-2xl bg-white/20 border border-white/80 backdrop-blur-sm p-8 prose prose-neutral dark:prose-invert max-w-none'>
          <div>
            <p>
              Welcome to poidh, operated by poidh, inc. ("we", "our", or "us").
              These poidh Terms of Service ("Terms") govern your use of the
              poidh platform, which connects bounty posters with users that
              upload photos to claim bounties. By using our platform, you agree
              to these Terms.
            </p>

            <section className='mt-8'>
              <h2 className='text-lg font-semibold mb-2 text-poidhRed'>
                Acceptance of Terms
              </h2>
              <p>
                By accessing or using the platform, you acknowledge that you
                have read, understood, and agree to be bound by these Terms.
              </p>
            </section>

            <section className='mt-6'>
              <h2 className='text-lg font-semibold mb-2 text-poidhRed'>
                Eligibility
              </h2>
              <p>
                To use our services, you must be at least 18 years old and
                capable of entering into legally binding contracts.
              </p>
            </section>

            <section className='mt-6'>
              <h2 className='text-lg font-semibold mb-2 text-poidhRed'>
                Prohibited Conduct
              </h2>
              <p className='mb-2'>Users may not:</p>
              <ul className='list-disc ml-6 space-y-1'>
                <li>Post illegal or unethical bounties</li>
                <li>
                  Post bounties requesting content that is violent or sexual in
                  nature
                </li>
                <li>Use the platform for fraudulent purposes</li>
                <li>Post illegal or unethical photos/claims</li>
                <li>Post violent or sexual photos/claims</li>
                <li>Harass other users</li>
              </ul>
            </section>

            <section className='mt-6'>
              <h2 className='text-lg font-semibold mb-2 text-poidhRed'>
                Termination
              </h2>
              <p>
                We reserve the right to block users, bounties, and claims that
                violate these Terms.
              </p>
            </section>

            <section className='mt-6'>
              <h2 className='text-lg font-semibold mb-2 text-poidhRed'>
                Disclaimers
              </h2>
              <p>
                The platform is provided "as is". We make no guarantees
                regarding the accuracy, completeness, or reliability of any
                user-posted content.
              </p>
            </section>

            <section className='mt-6'>
              <h2 className='text-lg font-semibold mb-2 text-poidhRed'>
                Limitation of Liability
              </h2>
              <p>
                Pics or it didn’t happen (poidh) or poidh, inc. shall not be
                liable for any indirect, incidental, special, or consequential
                damages resulting from the use of the platform.
              </p>
            </section>

            <section className='mt-6'>
              <h2 className='text-lg font-semibold mb-2 text-poidhRed'>
                Updates to These Terms
              </h2>
              <p>
                We may modify these Terms at any time. By continuing to use the
                platform after changes are made, you agree to be bound by the
                updated Terms.
              </p>
            </section>

            <section className='mt-6'>
              <h2 className='text-lg font-semibold mb-2 text-poidhRed'>
                Geographic Limitations
              </h2>
              <p>
                Users from Cuba, Iran, North Korea, Syria, and Venezuela are not
                permitted to utilize poidh for posting or claiming bounties.
              </p>
            </section>

            <section className='mt-6'>
              <h2 className='text-lg font-semibold mb-2 text-poidhRed'>
                Contact
              </h2>
              <p>
                For any questions about these Terms, contact
                <a
                  className='ml-1 underline hover:opacity-80'
                  href='mailto:poidhxyz@gmail.com'
                >
                  poidhxyz@gmail.com
                </a>
              </p>
            </section>

            <section className='mt-6'>
              <h2 className='text-lg font-semibold mb-2 text-poidhRed'>Fees</h2>
              <p>
                Completed bounties via the poidh contract will pay a 2.5% fee
                automatically to the poidh treasury address. poidh NFTs that are
                resold will pay a 5% fee to the poidh treasury address.
              </p>
            </section>

            <section className='mt-6'>
              <h2 className='text-lg font-semibold mb-2 text-poidhRed'>
                Governing Law
              </h2>
              <p>These Terms are governed by the laws of the United States.</p>
            </section>

            <p className='mt-8 text-sm text-white/60'>© 2025 poidh, inc.</p>
          </div>
        </article>
      </div>
    </main>
  );
}
