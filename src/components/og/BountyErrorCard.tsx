import React from 'react';

export default function BountyErrorCard({ message }: { message?: string }) {
  return (
    <div
      tw='w-full h-full p-6 flex flex-col items-center justify-center'
      style={{
        background:
          'linear-gradient(to bottom, #2a81d5, #70aae2, #6fa9e1, #2a81d5)',
      }}
    >
      <div tw='w-full text-center flex items-center justify-center'>
        <span tw='text-red-500 font-bold text-xl'>poidh</span>
      </div>

      <div
        style={{ gap: '8px', flexDirection: 'column' }}
        tw='flex flex-col items-center justify-start text-white'
      >
        {message ? (
          <span tw='text-2xl font-bold mb-2'>{message}</span>
        ) : (
          <>
            <span tw='text-2xl font-bold mb-2'>Oops!</span>
            <br />
            <span tw='text-lg'>Bounty not found</span>
          </>
        )}
      </div>
    </div>
  );
}
