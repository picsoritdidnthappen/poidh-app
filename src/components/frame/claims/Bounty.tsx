// components/frame/claims/Bounty.tsx
import { BountyResponse } from '@/app/api/bounties/[chainName]/[bountyId]/route';
import React from 'react';

const calculateFontSize = (title: string) => {
  if (title.length > 100) return '18px';
  if (title.length > 50) return '22px';
  return '28px';
};

// Utility function to format amounts
export const formatAmount = (amount: string, chainName: string) => {
  try {
    // Handle empty or invalid amounts
    if (!amount) return '0';

    if (chainName.toLowerCase() === 'degen') {
      const numberAmount = (parseInt(amount) / 1000000000000000000).toString();
      return `${numberAmount.toLocaleString()} DEGEN`;
    } else {
      // For Base and Arbitrum, convert from wei to ETH
      const weiAmount = BigInt(amount);
      const ethAmount = Number(weiAmount) / 1e18;

      // Format with maximum 4 decimal places
      const formattedAmount = ethAmount.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 4,
      });

      return `${formattedAmount} ETH`;
    }
  } catch (error) {
    console.error('Error formatting amount:', error);
    return amount; // Return original amount if conversion fails
  }
};

const BountyCard = ({
  bounty: bountyData,
  chainName,
}: {
  bounty: BountyResponse['bounty'];
  chainName: string;
}) => {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        background:
          'linear-gradient(to bottom, #2a81d5, #70aae2, #6fa9e1, #2a81d5)',
        color: 'white',
        fontFamily: 'Inter',
      }}
    >
      {/* Logo Header */}
      <div
        style={{
          width: '100%',
          height: '48px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: '8px',
        }}
      >
        <img
          src='https://poidh-app-theta.vercel.app/Logo_poidh.svg'
          width='96'
          height='48'
          alt='Logo'
          style={{
            objectFit: 'contain',
          }}
        />
      </div>

      {/* Bounty Content */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          flex: 1,
        }}
      >
        <h3
          style={{
            fontSize: calculateFontSize(bountyData.title),
            fontWeight: 700,
            margin: 0,
            textAlign: 'center',
            maxWidth: '500px',
            lineHeight: 1,
            wordWrap: 'break-word',
            padding: '0 10px',
          }}
        >
          {bountyData.title}
        </h3>

        <p
          style={{
            fontSize: '14px',
            fontWeight: 500,
            margin: 0,
            textAlign: 'center',
            maxWidth: '500px',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            lineHeight: 1,
            padding: '0 10px',
          }}
        >
          {bountyData.description}
        </p>

        {/* Amount Display with Conversion */}
        <div
          style={{
            fontSize: '16px',
            fontWeight: 600,
            marginTop: 'auto',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '8px 16px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
          }}
        >
          {formatAmount(bountyData.amount, chainName)}
        </div>
      </div>
    </div>
  );
};

export default BountyCard;
