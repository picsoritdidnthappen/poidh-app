'use client';

import Navbar from '@/components/global/Navbar';

export default function Privacy() {
  return (
    <main className='min-h-screen bg-poidhBlue/10 dark:bg-[#0d1b2e]/50 pt-16 pb-24 px-4'>
      <div className='mx-auto max-w-3xl'>
        <header className='mb-8 text-center'>
          <h1 className="text-3xl sm:text-4xl font-['PixeloidSans'] font-extrabold tracking-tight mb-3 text-poidhRed [text-shadow:-0.5px_-0.5px_0_white,0.5px_-0.5px_0_white,-0.5px_0.5px_0_white,0.5px_0.5px_0_white]">
            Privacy Policy
          </h1>
          <p className='text-sm'>
            Last updated: <time dateTime='2026-10-06'>October 6, 2026</time>
          </p>
        </header>

        <article className='relative rounded-2xl bg-white/20 border border-white/80 backdrop-blur-sm p-8 prose prose-neutral dark:prose-invert max-w-none'>
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
          >
            <p style={{ margin: 0, lineHeight: 1.7 }}>
              This Privacy Policy explains how poidh, inc., a Delaware
              corporation (“poidh,” “we,” “our,” or “us”), handles information
              when you use poidh.xyz and related interfaces and services
              (collectively, the “Service”).
            </p>

            <p style={{ margin: 0, lineHeight: 1.7 }}>
              poidh is an onchain bounty platform. Some information associated
              with use of the Service — including wallet addresses,
              transactions, bounty activity, claims, and other blockchain data —
              is public by design and may be permanently available through
              public blockchains or distributed storage systems.
            </p>

            <section
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <h2 className='text-lg font-semibold text-poidhRed'>
                Information we process
              </h2>

              <p style={{ margin: 0, lineHeight: 1.7 }}>
                Depending on how you use the Service, we may process the
                following categories of information:
              </p>

              <ul
                className='list-disc ml-6 space-y-1'
                style={{ marginTop: 0, marginBottom: 0 }}
              >
                <li>
                  <strong>Wallet and blockchain information.</strong> Wallet
                  addresses, chain IDs, transaction hashes, bounty activity,
                  contributions, claims, voting activity, withdrawals, NFT
                  activity, and other public blockchain data.
                </li>
                <li>
                  <strong>Content you submit.</strong> Bounty titles and
                  descriptions, claim descriptions, comments, images, videos,
                  links, and other content you choose to submit through the
                  Service.
                </li>
                <li>
                  <strong>Profile and social information.</strong> Public
                  profile information associated with a wallet address, such as
                  a Farcaster profile, when the Service retrieves it from
                  third-party services.
                </li>
                <li>
                  <strong>Wallet and account state.</strong> Information needed
                  to remember a connected wallet, selected network, interface
                  preferences, and similar product state.
                </li>
                <li>
                  <strong>Technical and usage information.</strong> Hosting,
                  analytics, security, and infrastructure providers may process
                  standard request and device information such as IP address,
                  browser or device type, requested pages, timestamps, and
                  similar technical data.
                </li>
                <li>
                  <strong>Communications.</strong> If you contact us, we may
                  receive your email address and the contents of your message.
                </li>
              </ul>
            </section>

            <section
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <h2 className='text-lg font-semibold text-poidhRed'>
                Public blockchain and distributed storage
              </h2>

              <p style={{ margin: 0, lineHeight: 1.7 }}>
                Blockchain transactions are public. Information recorded
                onchain may be copied, indexed, analyzed, and displayed by
                third parties independently of poidh. We cannot delete, modify,
                or reverse information that has been permanently recorded on a
                public blockchain.
              </p>

              <p style={{ margin: 0, lineHeight: 1.7 }}>
                Claim media and related metadata may be stored through IPFS or
                other distributed or third-party storage services. Removing
                content from the poidh interface does not guarantee that all
                copies will disappear from those networks, gateways, caches, or
                third-party services.
              </p>

              <p style={{ margin: 0, lineHeight: 1.7 }}>
                Do not submit passwords, private keys, seed phrases,
                confidential information, or personal information that you are
                not authorized to disclose.
              </p>
            </section>

            <section
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <h2 className='text-lg font-semibold text-poidhRed'>
                Wallets and embedded accounts
              </h2>

              <p style={{ margin: 0, lineHeight: 1.7 }}>
                You may connect a third-party wallet or create an embedded
                wallet through providers integrated with the Service.
                Third-party wallet providers may process information needed to
                connect, authenticate, secure, or operate your wallet under
                their own privacy policies.
              </p>

              <p style={{ margin: 0, lineHeight: 1.7 }}>
                poidh currently uses ZeroDev and related infrastructure for its
                embedded-wallet experience. Sign-in methods may include email,
                Google, or passkeys. Authentication credentials, signing
                infrastructure, and recovery methods may be handled by those
                providers rather than directly by poidh.
              </p>

              <p style={{ margin: 0, lineHeight: 1.7 }}>
                Never send us your wallet private key, seed phrase, or recovery
                secret.
              </p>
            </section>

            <section
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <h2 className='text-lg font-semibold text-poidhRed'>
                Cookies and browser storage
              </h2>

              <p style={{ margin: 0, lineHeight: 1.7 }}>
                poidh uses first-party browser storage to provide requested
                functionality and remember interface preferences. This may
                include cookies, local storage, and other browser storage used
                by wallet or authentication providers.
              </p>

              <p style={{ margin: 0, lineHeight: 1.7 }}>
                Current examples include:
              </p>

              <ul
                className='list-disc ml-6 space-y-1'
                style={{ marginTop: 0, marginBottom: 0 }}
              >
                <li>
                  <strong>wagmi.store</strong> — stores wallet connection state
                  so the Service can reconnect your wallet and, where
                  supported, render the connected-wallet state correctly.
                </li>
                <li>
                  <strong>theme</strong> — remembers your selected light, dark,
                  or cyber theme.
                </li>
                <li>
                  <strong>poidh_anychain_enabled</strong> — remembers whether
                  you enabled cross-chain funding features.
                </li>
                <li>
                  <strong>poidh_disclose_balances</strong> — remembers your
                  balance-visibility preference.
                </li>
                <li>
                  <strong>poidh:lastSeenYouFeed:&lt;wallet&gt;</strong> — keeps
                  track of the most recent personalized-feed activity you have
                  seen so the Service can show notification state correctly.
                </li>
              </ul>

              <p style={{ margin: 0, lineHeight: 1.7 }}>
                These technologies are used for wallet connectivity,
                authentication, security, interface preferences, notifications,
                and other product functionality. We do not currently use
                advertising cookies, retargeting pixels, or cross-site
                behavioral advertising on poidh.
              </p>

              <p style={{ margin: 0, lineHeight: 1.7 }}>
                You can clear cookies and local storage through your browser
                settings. Doing so may disconnect your wallet, reset interface
                preferences, or require you to sign in again.
              </p>
            </section>

            <section
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <h2 className='text-lg font-semibold text-poidhRed'>
                Analytics
              </h2>

              <p style={{ margin: 0, lineHeight: 1.7 }}>
                We use Vercel Analytics to understand aggregate usage of the
                Service, such as page visits and general traffic patterns. We
                use this information to operate, maintain, and improve poidh.
              </p>

              <p style={{ margin: 0, lineHeight: 1.7 }}>
                We do not currently use Google Analytics, Meta Pixel, TikTok
                Pixel, or similar advertising and retargeting technologies on
                poidh.
              </p>
            </section>

            <section
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <h2 className='text-lg font-semibold text-poidhRed'>
                How we use information
              </h2>

              <p style={{ margin: 0, lineHeight: 1.7 }}>
                We may use information described in this policy to:
              </p>

              <ul
                className='list-disc ml-6 space-y-1'
                style={{ marginTop: 0, marginBottom: 0 }}
              >
                <li>Operate and provide the Service.</li>
                <li>Connect wallets and support embedded accounts.</li>
                <li>Display bounties, claims, profiles, and activity.</li>
                <li>Process uploads and resolve submitted media.</li>
                <li>Provide notifications and remember user preferences.</li>
                <li>Measure performance and understand aggregate usage.</li>
                <li>Prevent fraud, abuse, security incidents, and misuse.</li>
                <li>Debug, maintain, and improve the Service.</li>
                <li>Respond to questions, reports, and support requests.</li>
                <li>Comply with legal obligations and enforce our Terms.</li>
              </ul>
            </section>

            <section
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <h2 className='text-lg font-semibold text-poidhRed'>
                Third-party services
              </h2>

              <p style={{ margin: 0, lineHeight: 1.7 }}>
                We rely on third parties to provide parts of the Service. These
                may include:
              </p>

              <ul
                className='list-disc ml-6 space-y-1'
                style={{ marginTop: 0, marginBottom: 0 }}
              >
                <li>
                  <strong>Vercel</strong> for hosting, infrastructure, and
                  analytics.
                </li>
                <li>
                  <strong>ZeroDev and related wallet infrastructure</strong> for
                  embedded wallets, authentication, account functionality, and
                  transaction infrastructure.
                </li>
                <li>
                  <strong>WalletConnect, RainbowKit, and wallet providers</strong>{' '}
                  for wallet connection functionality.
                </li>
                <li>
                  <strong>Pinata and IPFS infrastructure</strong> for media and
                  metadata storage and retrieval.
                </li>
                <li>
                  <strong>Neynar and Farcaster-related services</strong> for
                  public social-profile information and related integrations.
                </li>
                <li>
                  <strong>Blockchain networks and RPC providers</strong> for
                  reading blockchain data and submitting transactions.
                </li>
              </ul>

              <p style={{ margin: 0, lineHeight: 1.7 }}>
                These providers may process information under their own privacy
                policies and terms. Their practices may change independently of
                poidh.
              </p>
            </section>

            <section
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <h2 className='text-lg font-semibold text-poidhRed'>
                How information may be shared
              </h2>

              <p style={{ margin: 0, lineHeight: 1.7 }}>
                We may make information available or disclose it:
              </p>

              <ul
                className='list-disc ml-6 space-y-1'
                style={{ marginTop: 0, marginBottom: 0 }}
              >
                <li>
                  <strong>Publicly,</strong> when you submit information that is
                  intended to appear on the Service or on a public blockchain.
                </li>
                <li>
                  <strong>To service providers,</strong> when necessary to host,
                  secure, operate, analyze, or support the Service.
                </li>
                <li>
                  <strong>For legal and safety reasons,</strong> when we
                  reasonably believe disclosure is required by law or necessary
                  to protect rights, safety, users, or the Service.
                </li>
                <li>
                  <strong>In a business transaction,</strong> such as a merger,
                  acquisition, financing, reorganization, or sale of assets,
                  subject to applicable law.
                </li>
              </ul>

              <p style={{ margin: 0, lineHeight: 1.7 }}>
                We do not sell personal information or share personal
                information for cross-context behavioral advertising.
              </p>
            </section>

            <section
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <h2 className='text-lg font-semibold text-poidhRed'>
                Retention
              </h2>

              <p style={{ margin: 0, lineHeight: 1.7 }}>
                We retain information for as long as reasonably necessary to
                operate the Service, meet legal obligations, resolve disputes,
                enforce agreements, maintain security, and support legitimate
                business needs.
              </p>

              <p style={{ margin: 0, lineHeight: 1.7 }}>
                Browser storage remains on your device until it expires, is
                replaced, or is cleared through the Service or your browser.
                Public blockchain records may be permanent. Content distributed
                through IPFS or other decentralized systems may remain
                accessible even after it is no longer displayed by poidh.
              </p>
            </section>

            <section
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <h2 className='text-lg font-semibold text-poidhRed'>
                Your choices and privacy rights
              </h2>

              <p style={{ margin: 0, lineHeight: 1.7 }}>
                You may disconnect your wallet, clear browser storage, stop
                using the Service, or contact us about information maintained
                by poidh.
              </p>

              <p style={{ margin: 0, lineHeight: 1.7 }}>
                Depending on where you live, applicable law may give you rights
                to request access to, correction of, deletion of, restriction
                of, or portability of certain personal information, or to
                object to certain processing. You may also have the right to
                complain to a local data-protection authority.
              </p>

              <p style={{ margin: 0, lineHeight: 1.7 }}>
                These rights do not allow us to erase or alter information that
                is outside our control, including immutable blockchain records
                or copies retained independently by third parties or
                decentralized networks.
              </p>
            </section>

            <section
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <h2 className='text-lg font-semibold text-poidhRed'>
                International processing
              </h2>

              <p style={{ margin: 0, lineHeight: 1.7 }}>
                poidh is operated from the United States. Our service providers
                may process information in the United States and other
                countries. Where required by applicable law, appropriate
                safeguards may apply to international transfers of personal
                information.
              </p>
            </section>

            <section
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <h2 className='text-lg font-semibold text-poidhRed'>
                Security
              </h2>

              <p style={{ margin: 0, lineHeight: 1.7 }}>
                We use reasonable technical and organizational measures
                intended to protect the information we control. No website,
                wallet, blockchain, storage system, or transmission method is
                completely secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <h2 className='text-lg font-semibold text-poidhRed'>Children</h2>

              <p style={{ margin: 0, lineHeight: 1.7 }}>
                The Service is intended for users who are at least 18 years old.
                We do not knowingly collect personal information from children
                through the Service.
              </p>
            </section>

            <section
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <h2 className='text-lg font-semibold text-poidhRed'>
                Changes to this policy
              </h2>

              <p style={{ margin: 0, lineHeight: 1.7 }}>
                We may update this Privacy Policy from time to time. We will
                post the revised version with an updated date and provide
                additional notice when required by law.
              </p>
            </section>

            <section
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <h2 className='text-lg font-semibold text-poidhRed'>Contact</h2>

              <p style={{ margin: 0, lineHeight: 1.7 }}>
                <strong>poidh, inc.</strong>
                <br />
                <strong>
                  <a
                    className='underline hover:opacity-80'
                    href='mailto:poidhxyz@gmail.com'
                  >
                    poidhxyz@gmail.com
                  </a>
                </strong>
              </p>
            </section>

            <p className='mt-8 text-sm text-white/60'>
              © {new Date().getFullYear()} poidh, inc.
            </p>
          </div>
        </article>
      </div>

      <Navbar type='bounty' />
    </main>
  );
}
