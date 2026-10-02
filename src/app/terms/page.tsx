'use client';

import Navbar from '@/components/global/Navbar';

export default function Terms() {
  return (
    <main className='min-h-screen bg-poidhBlue/10 dark:bg-[#0d1b2e]/50 pt-16 pb-24 px-4'>
      <div className='mx-auto max-w-3xl'>
        <header className='mb-8 text-center'>
          <h1 className="text-3xl sm:text-4xl font-['PixeloidSans'] font-extrabold tracking-tight mb-3 text-poidhRed [text-shadow:-0.5px_-0.5px_0_white,0.5px_-0.5px_0_white,-0.5px_0.5px_0_white,0.5px_0.5px_0_white]">
            Terms of Service
          </h1>
          <p className='text-sm'>
            Last updated: <time dateTime="2026-10-02">October 2, 2026</time>
          </p>
        </header>

        <article className='relative rounded-2xl bg-white/20 border border-white/80 backdrop-blur-sm p-8 prose prose-neutral dark:prose-invert max-w-none'>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <p style={{ margin: 0, lineHeight: 1.7 }}>
              These Terms of Service (“Terms”) govern your use of poidh.xyz and related
              interfaces and services operated by poidh, inc., a Delaware corporation
              (“we,” “our,” or “us”), collectively the “Service.” The Service allows
              users to access the poidh protocol to create and fund bounties, submit
              claims, and receive rewards through blockchain smart contracts.
            </p>
            <p style={{ margin: 0, lineHeight: 1.7 }}>
              By using the Service after being presented with notice of these Terms, you
              agree to them. If you do not agree, do not use the Service.
            </p>
            <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h2 className='text-lg font-semibold text-poidhRed'>
                Eligibility
              </h2>
              <p style={{ margin: 0, lineHeight: 1.7 }}>
                You must be at least 18 years old and legally capable of entering into a
                binding agreement. If you use the Service for an organization, you must
                have authority to act on its behalf.
              </p>
              <p style={{ margin: 0, lineHeight: 1.7 }}>
                You may not use the Service if doing so would violate applicable law,
                including sanctions or export restrictions. You may not use the Service
                on behalf of a person or entity subject to restrictions that prohibit
                the relevant activity, or use another wallet or intermediary to evade
                those restrictions.
              </p>
            </section>

            <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h2 className='text-lg font-semibold text-poidhRed'>
                The Service and the protocol
              </h2>
              <p style={{ margin: 0, lineHeight: 1.7 }}>
                poidh, inc. operates the Service. The underlying poidh protocol consists
                of public blockchain smart contracts that may also be accessible through
                independent interfaces or directly onchain.
              </p>
              <p style={{ margin: 0, lineHeight: 1.7 }}>
                <strong>poidh, inc. does not take custody of user wallet assets or
                escrowed bounty funds.</strong> Wallet assets remain controlled through
                users&#x27; wallets, and bounty funds are held and released by the
                applicable smart contracts. We have no special administrative authority
                to withdraw, freeze, redirect, or release escrowed bounty funds, or to
                override the contracts&#x27; payout rules. If we participate in a bounty,
                we are subject to the same contract rules as other participants.
              </p>
              <p style={{ margin: 0, lineHeight: 1.7 }}>
                These Terms govern use of the Service. They do not change smart-contract
                code or previously executed transactions. We cannot reverse confirmed
                blockchain transactions, rewrite immutable contracts, or delete public
                blockchain records.
              </p>
              <p style={{ margin: 0, lineHeight: 1.7 }}>
                Restricting a user, bounty, or claim through the Service does not
                necessarily cancel its onchain existence, release its funds, or prevent
                access through another interface. We do not control independent
                interfaces simply because they access the poidh protocol.
              </p>
            </section>

            <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h2 className='text-lg font-semibold text-poidhRed'>
                Bounties and claims
              </h2>
              <p style={{ margin: 0, lineHeight: 1.7 }}>
                Bounty creators are responsible for their descriptions, requirements,
                deadlines, selection criteria, and requested activities, including
                compliance with laws applicable to contests, promotions, prizes, and
                other arrangements. Contributors and claimants are responsible for
                reviewing those requirements before participating.
              </p>
              <p style={{ margin: 0, lineHeight: 1.7 }}>
                Creators must describe bounties honestly. Claimants must submit truthful
                evidence and have the rights and permissions necessary for their
                submissions. Users must not fabricate completion evidence or
                misrepresent their identity, affiliation, or eligibility.
              </p>
              <p style={{ margin: 0, lineHeight: 1.7 }}>
                Funding, withdrawals, voting, acceptance, payments, and NFT transfers
                are governed by the applicable smart contracts. A bounty description or
                offchain promise does not itself change those contracts or guarantee
                automatic enforcement of a deadline or requirement.
              </p>
              <p style={{ margin: 0, lineHeight: 1.7 }}>
                Submitting a claim does not guarantee acceptance, payment, or
                reimbursement of expenses. Funding a bounty does not guarantee
                completion or a refund. Funds may become unavailable for withdrawal
                under the applicable contract rules.
              </p>
              <p style={{ margin: 0, lineHeight: 1.7 }}>
                Unless we expressly act in that capacity for a particular bounty, poidh,
                inc. is not its creator, sponsor, judge, employer, or guarantor. We do
                not guarantee user performance, selection decisions, or resolution of
                disputes between participants. Displaying content does not mean that we
                have verified or endorsed it.
              </p>
            </section>

            <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h2 className='text-lg font-semibold text-poidhRed'>
                Prohibited conduct
              </h2>
              <p style={{ margin: 0, lineHeight: 1.7 }}>
                You may not use the Service to request, fund, submit, reward, or
                facilitate:
              </p>
              <ul className='list-disc ml-6 space-y-1' style={{ marginTop: 0, marginBottom: 0 }}>
                <li>Illegal activities, fraud, scams, money laundering, sanctions evasion, or unlawful gambling.</li>
                <li>Suicide, self-harm, intentional physical injury, or activities creating a substantial and foreseeable risk of serious physical harm.</li>
                <li>Assault, threats, abuse, animal cruelty, or the promotion of actual violence; or graphic real-world depictions of serious injury, torture, or death.</li>
                <li>Pornography, explicit sexual acts, sexual exploitation, nonconsensual intimate imagery, or sexual content involving minors.</li>
                <li>Harassment, stalking, doxxing, targeted intimidation, or violations of another person&#x27;s privacy or other rights.</li>
                <li>Copyright, trademark, or other intellectual-property infringement.</li>
                <li>Fabricated or misleading claims, deceptive manipulation of voting or selection, or multiple identities or wallets used to evade bounty rules.</li>
                <li>Malware, phishing, credential theft, unauthorized access, or interference with the Service or its users.</li>
                <li>Spam or automated activity that materially disrupts the Service.</li>
              </ul>
              <p style={{ margin: 0, lineHeight: 1.7 }}>
                Fictional, artistic, or educational content is not prohibited solely
                because it depicts conflict or discusses sensitive subjects, but it must
                comply with the restrictions above.
              </p>
              <p style={{ margin: 0, lineHeight: 1.7 }}>
                These rules apply to both bounties and individual claims. A permitted
                bounty does not make every submission permissible. You remain
                responsible for actions taken through tools or agents you authorize.
              </p>
            </section>

            <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h2 className='text-lg font-semibold text-poidhRed'>
                Wallets, transactions, and risks
              </h2>
              <p style={{ margin: 0, lineHeight: 1.7 }}>
                You are responsible for your wallet, credentials, recovery methods,
                permissions, and authorized transactions. Review transaction details
                before approving them. Wallets and embedded account tools may be
                supplied by third parties under separate terms.
              </p>
              <p style={{ margin: 0, lineHeight: 1.7 }}>
                Blockchain activity involves risks, including irreversible transactions,
                incorrect addresses or networks, lost credentials, malicious approvals,
                smart-contract defects or exploits, network failures, transaction
                manipulation, and digital-asset price volatility. Audits do not
                eliminate these risks. You may lose funds or access to assets.
              </p>
              <p style={{ margin: 0, lineHeight: 1.7 }}>
                Bounty funds are held and released according to the applicable
                contracts. We do not guarantee recovery of funds, restoration of wallet
                access, or reimbursement for losses. Displayed balances, fiat values,
                and transaction statuses may be delayed or inaccurate. Rewards and NFTs
                have no guaranteed value or resale market.
              </p>
              <p style={{ margin: 0, lineHeight: 1.7 }}>
                You are responsible for evaluating the legal, financial, and physical
                risks of participating in a bounty. Information provided through the
                Service is not legal, tax, or investment advice.
              </p>
            </section>

            <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h2 className='text-lg font-semibold text-poidhRed'>
                Fees and taxes
              </h2>
              <p style={{ margin: 0, lineHeight: 1.7 }}>Completed bounties are subject to a <strong>2.5% protocol fee</strong> under the applicable contract. Claim NFTs specify a <strong>5% secondary-sale royalty</strong>; payment of that royalty depends on the marketplace and transaction mechanism.</p>
              <p style={{ margin: 0, lineHeight: 1.7 }}>
                Network gas fees and third-party charges may apply separately, including
                to failed transactions. Review the applicable fees before authorizing a
                transaction. Any additional fee charged by us will be disclosed before
                authorization. Updating these Terms does not change fees encoded in an
                immutable contract.
              </p>
              <p style={{ margin: 0, lineHeight: 1.7 }}>
                You are responsible for determining, reporting, and paying taxes arising
                from your use of the Service. We may request information or make reports
                when required by law.
              </p>
            </section>

            <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h2 className='text-lg font-semibold text-poidhRed'>
                User content and NFT rights
              </h2>
              <p style={{ margin: 0, lineHeight: 1.7 }}>
                You retain the intellectual-property rights you own in your
                descriptions, images, videos, and other submissions (“User Content”).
                You represent that you have the rights and permissions necessary to
                submit that content and grant the license below.
              </p>
              <p style={{ margin: 0, lineHeight: 1.7 }}>
                You grant us a nonexclusive, worldwide, royalty-free license to host,
                store, reproduce, display, distribute, and make technical adaptations of
                User Content to operate and improve the Service and promote poidh using
                publicly submitted content. Our service providers may exercise these
                rights on our behalf for those purposes. The license continues as
                necessary for displaying existing bounty and claim records, reasonable
                backups, legal retention, and previously published promotional
                materials.
              </p>
              <p style={{ margin: 0, lineHeight: 1.7 }}>
                Ownership or transfer of a claim NFT does not automatically transfer
                copyright or other rights in the underlying media. Any broader transfer
                or license requires an express agreement from the rights holder.
                Applicable open-source and other express licenses remain effective.
              </p>
            </section>

            <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h2 className='text-lg font-semibold text-poidhRed'>
                Public information and storage
              </h2>
              <p style={{ margin: 0, lineHeight: 1.7 }}>
                Wallet addresses, transactions, bounty descriptions, claims, and related
                information may be public and linked together. Do not submit
                credentials, confidential information, or personal information you are
                not authorized to disclose.
              </p>
              <p style={{ margin: 0, lineHeight: 1.7 }}>
                Blockchain records may be permanent. Media and links may be stored
                through IPFS or other third-party or distributed services. Removal from
                the Service does not guarantee deletion from a blockchain, another
                service, or copies held by others. We do not guarantee permanent media
                availability.
              </p>
            </section>

            <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h2 className='text-lg font-semibold text-poidhRed'>
                Moderation and access
              </h2>
              <p style={{ margin: 0, lineHeight: 1.7 }}>
                We may hide or remove content from the Service, restrict users or
                wallets, or suspend or terminate access when we reasonably believe these
                Terms have been violated or action is needed to address legal
                requirements, security concerns, or material harm. We may act without
                advance notice where necessary.
              </p>
              <p style={{ margin: 0, lineHeight: 1.7 }}>
                We do not undertake to review every bounty or claim before publication.
                We may change or discontinue features or support for particular networks
                or contracts. We do not guarantee uninterrupted or continued access.
              </p>
              <p style={{ margin: 0, lineHeight: 1.7 }}>To report a violation, copyright concern, or disputed restriction, email <strong><a className="underline hover:opacity-80" href="mailto:poidhxyz@gmail.com">poidhxyz@gmail.com</a></strong> with the relevant URLs or bounty and claim identifiers, your contact information, and an explanation. For copyright concerns, identify the work you own or represent and the allegedly infringing material. We may request further information and restrict access to infringing content or repeat infringers as appropriate.</p>
            </section>

            <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h2 className='text-lg font-semibold text-poidhRed'>
                Third-party services
              </h2>
              <p style={{ margin: 0, lineHeight: 1.7 }}>
                The Service may integrate with or link to wallets, blockchains, media
                hosts, marketplaces, and other third-party services. They may have
                separate terms, fees, and privacy practices. We do not guarantee their
                availability, accuracy, security, or conduct.
              </p>
            </section>

            <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h2 className='text-lg font-semibold text-poidhRed'>
                Disclaimers and limitation of liability
              </h2>
              <p style={{ margin: 0, lineHeight: 1.7 }}><strong>To the fullest extent permitted by law, the Service is provided “as is” and “as available,” without express or implied warranties, including merchantability, fitness for a particular purpose, and noninfringement. We do not guarantee that the Service, smart contracts, or third-party services will be uninterrupted, secure, accurate, or error-free.</strong></p>
              <p style={{ margin: 0, lineHeight: 1.7 }}><strong>To the fullest extent permitted by law, poidh, inc. and its officers, directors, employees, and agents will not be liable for indirect, incidental, special, consequential, or punitive damages, or lost profits, data, or goodwill, arising from use of the Service or these Terms.</strong></p>
              <p style={{ margin: 0, lineHeight: 1.7 }}><strong>Our total liability arising from the Service or these Terms will not exceed the greater of US $100 or the fees actually received by poidh, inc. from you in connection with the Service during the 12 months preceding the event giving rise to the claim, to the fullest extent permitted by law.</strong> Bounty funding, payments to other users, gas fees, and third-party charges are not included in those fees.</p>
              <p style={{ margin: 0, lineHeight: 1.7 }}>
                These provisions do not exclude liability for fraud, willful misconduct,
                gross negligence, or liability that cannot legally be excluded or
                limited. Your nonwaivable statutory and consumer rights remain
                unaffected.
              </p>
            </section>

            <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h2 className='text-lg font-semibold text-poidhRed'>
                Indemnification
              </h2>
              <p style={{ margin: 0, lineHeight: 1.7 }}>
                To the extent permitted by law, you agree to indemnify and hold harmless
                poidh, inc. and its officers, directors, employees, and agents against
                third-party claims, damages, liabilities, and reasonable legal costs
                arising from your unlawful conduct, violation of these Terms, or
                infringement of another person&#x27;s rights through User Content you
                submit. This obligation does not apply to the extent a claim results
                from our own negligence or misconduct. We will give you reasonably
                prompt notice of a covered claim.
              </p>
            </section>

            <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h2 className='text-lg font-semibold text-poidhRed'>
                Governing law
              </h2>
              <p style={{ margin: 0, lineHeight: 1.7 }}>
                These Terms are governed by Delaware law and applicable United States
                federal law, without regard to conflict-of-law rules. Subject to your
                nonwaivable rights under applicable law, disputes between you and poidh,
                inc. concerning the Service or these Terms will be brought in the state
                or federal courts located in Delaware, and both parties consent to those
                courts&#x27; jurisdiction.
              </p>
            </section>

            <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h2 className='text-lg font-semibold text-poidhRed'>
                Changes and general terms
              </h2>
              <p style={{ margin: 0, lineHeight: 1.7 }}>
                We may update these Terms by posting a revised version and updated date.
                We will provide prominent notice of material changes through the
                Service. Continued use after changes take effect, following appropriate
                notice and any consent required by law, constitutes acceptance. Changes
                apply prospectively and do not rewrite completed blockchain
                transactions.
              </p>
              <p style={{ margin: 0, lineHeight: 1.7 }}>
                If a provision is unenforceable, the remaining provisions remain
                effective to the extent permitted by law. Failure to enforce a provision
                is not a waiver. These Terms supersede earlier terms governing the same
                subject matter. Provisions concerning accrued obligations, content
                licenses, public records, taxes, liability, indemnification, and
                disputes survive termination as applicable.
              </p>
            </section>

            <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h2 className='text-lg font-semibold text-poidhRed'>
                Contact
              </h2>
              <p style={{ margin: 0, lineHeight: 1.7 }}><strong>poidh, inc.</strong><br /><strong><a className="underline hover:opacity-80" href="mailto:poidhxyz@gmail.com">poidhxyz@gmail.com</a></strong></p>
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
