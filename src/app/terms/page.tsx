'use client';

import * as React from 'react';

const Bounty = () => {
  return (
    <section className='px-5 lg:px-20 flex flex-col gap-x-5 text'>
      <h1 className='my-10 text-center '>Terms of Service</h1>

      <p>
        Welcome to poidh, operated by poidh, inc. ("we", "our", or "us"). These
        poidh Terms of Service ("Terms") govern your use of the poidh platform,
        which connects bounty posters with users that upload photos to claim
        bounties. By using our platform, you agree to these Terms.
      </p>
      <h2 className='mt-10 mb-3'>Acceptance of Terms</h2>
      <p>
        By accessing or using the platform, you acknowledge that you have read,
        understood, and agree to be bound by these Terms.
      </p>

      <h2 className='mt-10 mb-3'>Eligibility</h2>
      <p>
        To use our services, you must be at least 18 years old and capable of
        entering into legally binding contracts.
      </p>

      <h2 className='mt-10 mb-3'>Prohibited Conduct</h2>
      <p>Users may not:</p>
      <ul>
        <li>Post illegal or unethical bounties</li>
        <li>
          Post bounties requesting content that is violent or sexual in nature
        </li>
        <li>Use the platform for fraudulent purposes</li>
        <li>Post illegal or unethical photos/claims</li>
        <li>Post violent or sexual photos/claims</li>
        <li>Harass other users</li>
      </ul>

      <h2 className='mt-10 mb-3'>Termination</h2>
      <p>
        We reserve the right to block users, bounties, and claims that violate
        these Terms.
      </p>

      <h2 className='mt-10 mb-3'>Disclaimers</h2>
      <p>
        The platform is provided "as is". We make no guarantees regarding the
        accuracy, completeness, or reliability of any user-posted content.
      </p>

      <h2 className='mt-10 mb-3'>Limitation of Liability</h2>
      <p>
        Pics or it didn’t happen (poidh) or poidh, inc. shall not be liable for
        any indirect, incidental, special, or consequential damages resulting
        from the use of the platform.
      </p>

      <h2 className='mt-10 mb-3'>Updates to These Terms</h2>
      <p>
        We may modify these Terms at any time. By continuing to use the platform
        after changes are made, you agree to be bound by the updated Terms.
      </p>

      <h2 className='mt-10 mb-3'>Geographic Limitations</h2>
      <p>
        Users from Cuba, Iran, North Korea, Syria, and Venezuela are not
        permitted to utilize poidh for posting or claiming bounties.
      </p>

      <h2 className='mt-10 mb-3'>Contact</h2>
      <p>For any questions about these Terms, contact poidhxyz@gmail.com</p>

      <h2 className='mt-10 mb-3'>Fees</h2>
      <p>
        Completed bounties via the poidh contract will pay a 2.5% fee
        automatically to the poidh treasury address. poidh NFTs that are resold
        will pay a 5% fee to the poidh treasury address.
      </p>

      <h2 className='mt-10 mb-3'>Governing Law</h2>
      <p>These Terms are governed by the laws of the United States.</p>

      <p className='mb-20 mt-10'>© 2024</p>
    </section>
  );
};

export default Bounty;
