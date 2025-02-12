/* eslint-disable react/jsx-no-undef */
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { CopyIcon } from '@/components/global/Icons';
import { toast } from 'react-toastify';
import { useAccount } from 'wagmi';
import FormClaim from '@/components/claims/FormClaim';
import ButtonCTA from '@/components/global/ButtonCTA';
import FormJoinBounty from '@/components/bounty/FormJoinBounty';
import CreateClaim from '@/components/claims/CreateClaim';

// Types
interface ChainInfo {
  symbol: string;
  isEVM: boolean;
  name: string;
}

type ChainId = 8453 | 42161 | 666666666;

interface User {
  address: string;
  ens?: string | null;
  degen_name?: string | null;
}

interface Claim {
  id: number;
  chain_id: number;
  title: string;
  description: string;
  url: string;
  issuer: User;
  is_accepted: boolean | null;
  bounty_id: number;
  owner: string;
}

interface BountyParticipant {
  address: string;
  amount: string;
  user: User | null;
}

interface BountyStatus {
  in_progress: boolean;
  is_canceled: boolean;
  is_joined_bounty: boolean;
  is_multiplayer: boolean;
  is_voting: boolean;
}

interface BountyIssuer {
  address: string;
}

interface Bounty {
  id: number;
  chain_id: ChainId;
  title: string;
  description: string;
  amount: string;
  issuer: BountyIssuer;
  status: BountyStatus;
  deadline: number | null;
  claims: Claim[];
  participants: BountyParticipant[];
}

interface BountyResponse {
  bounty: Bounty;
}

// Chain configuration
const CHAIN_INFO: Record<ChainId, ChainInfo> = {
  8453: {
    symbol: 'ETH',
    isEVM: true,
    name: 'Base',
  },
  42161: {
    symbol: 'ETH',
    isEVM: true,
    name: 'Arbitrum',
  },
  666666666: {
    symbol: 'DEGEN',
    isEVM: false,
    name: 'Degen',
  },
};

// Amount formatting utility
const formatAmount = (amount: string, chainId: ChainId): string => {
  try {
    if (!amount) return '0';

    const chain = CHAIN_INFO[chainId];
    if (!chain) return amount;

    if (chain.isEVM) {
      const weiAmount = BigInt(amount);
      const ethAmount = Number(weiAmount) / 1e18;

      return `${chain.name} ${ethAmount.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 4,
      })} ${chain.symbol}`;
    } else {
      const numberAmount = (parseInt(amount) / 1000000000000000000).toString();
      return `${numberAmount.toLocaleString()} DEGEN`;
    }
  } catch (error) {
    console.error('Error formatting amount:', error);
    return amount;
  }
};

interface ClaimsProps {
  bountyId: string;
  chainId: string;
}

const Claims: React.FC<ClaimsProps> = ({ bountyId, chainId }) => {
  const [bounty, setBounty] = useState<Bounty | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [imageUrls, setImageUrls] = useState<Record<number, string>>({});
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const { address, isConnected } = useAccount();

  const fetchImageUrl = async (url: string, claimId: number) => {
    try {
      const response = await fetch(url);
      const data = await response.json();
      setImageUrls((prev) => ({
        ...prev,
        [claimId]: data.image || '',
      }));
    } catch (error) {
      console.error('Error fetching image:', error);
    }
  };

  useEffect(() => {
    const fetchBounty = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/bounties/${chainId}/${bountyId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch bounty');
        }
        const data: BountyResponse = await response.json();
        setBounty(data.bounty);

        // Fetch images for all claims
        data.bounty.claims.forEach((claim) => {
          void fetchImageUrl(claim.url, claim.id);
        });
      } catch (error) {
        console.error('Error fetching bounty:', error);
        setBounty(null);
      } finally {
        setLoading(false);
      }
    };

    void fetchBounty();
  }, [bountyId, chainId]);

  // Check if there's an accepted claim
  const hasAcceptedClaim = bounty?.claims.some((claim) => claim.is_accepted);

  const showCreateClaimButton = isConnected && !hasAcceptedClaim;

  const isOpen = bounty?.status.is_multiplayer;
  const isVoting = bounty?.status.is_voting;

  console.log('b', bounty);

  if (loading) {
    return (
      <div className='text-center text-white font-bold w-full'>
        Bounty Loading...
      </div>
    );
  }

  if (!bounty) {
    return (
      <div className='text-center text-white font-bold w-full'>
        Bounty Not Found :(
      </div>
    );
  }

  // Sort claims to show accepted ones first
  const sortedClaims = [...bounty.claims].sort((a, b) => {
    if (a.is_accepted && !b.is_accepted) return -1;
    if (!a.is_accepted && b.is_accepted) return 1;
    return 0;
  });

  return (
    <div className='w-full flex items-center justify-start px-4 md:px-6 py-4 flex-col gap-4'>
      <div className='w-full flex items-center justify-start flex-col gap-3'>
        <h3 className='text-xl md:text-2xl font-semibold text-center px-2'>
          "{bounty.title}"
        </h3>
        <p className='w-screen text-lg md:text-xl font-medium text-center px-2'>
          {bounty.description}
        </p>
        <p className='text-base md:text-lg font-medium text-center'>
          {formatAmount(bounty.amount, bounty.chain_id)}
        </p>
        <p className='text-base md:text-lg font-medium text-center'>
          bounty issuer:{' '}
          {`${bounty.issuer.address.slice(0, 5)}…${bounty.issuer.address.slice(
            -6
          )}`}
        </p>
        <p className='text-base md:text-lg font-medium text-center'>
          Total Claims:{' '}
          <span className='underline'>{bounty.claims.length}</span>
        </p>

        {/* Action Buttons Container */}
        <div className='flex flex-row gap-4 items-center justify-center'>
          {showCreateClaimButton && (
            <>
              <div onClick={() => setShowClaimForm(true)}>
                <button className='flex backdrop-blur-sm bg-[#FFD1D1]/20 text-bold bg-gradient-to-t from-[#F15E5F]/20 from-10% via-30% to-50% gap-x-5 border border-[#F15E5F] rounded-full px-5 py-2 hover:bg-[#F15E5F]/30 transition-all duration-200'>
                  create claim
                </button>
              </div>
              <FormClaim
                bountyId={bountyId}
                onClose={() => setShowClaimForm(false)}
                open={showClaimForm}
              />
            </>
          )}

          {!hasAcceptedClaim && isOpen && !isVoting && (
            <>
              <div onClick={() => setShowJoinForm(true)}>
                <ButtonCTA>join bounty</ButtonCTA>
              </div>
              <FormJoinBounty
                bountyId={bountyId}
                onClose={() => setShowJoinForm(false)}
                open={showJoinForm}
              />
            </>
          )}
        </div>
      </div>

      {bounty.claims.length === 0 ? (
        <p className='text-center text-white font-bold w-full'>
          No Claims found
        </p>
      ) : (
        <div className='w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6'>
          {sortedClaims.map((claim) => (
            <div
              key={claim.id}
              className='p-[2px] text-white relative bg-[#F15E5F] border-[#F15E5F] border-2 rounded-xl w-full'
            >
              {claim.is_accepted && (
                <div className='left-5 top-5 text-white bg-[#F15E5F] border border-[#F15E5F] rounded-[8px] py-2 px-5 absolute'>
                  accepted
                </div>
              )}
              <div
                style={{ backgroundImage: `url(${imageUrls[claim.id] || ''})` }}
                className='bg-[#12AAFF] bg-cover bg-center w-full aspect-w-1 aspect-h-1 rounded-[8px] overflow-hidden'
              />
              <div className='p-3'>
                <div className='flex flex-col'>
                  <p className='text-base md:text-lg font-medium mb-2 normal-case overflow-ellipsis overflow-hidden break-words'>
                    {claim.title}
                  </p>
                  <p className='text-sm md:text-base normal-case w-full h-16 md:h-20 overflow-y-auto overflow-x-hidden overflow-hidden break-words'>
                    {claim.description}
                  </p>
                </div>
                <div className='mt-2 py-2 flex flex-row justify-between text-sm border-t border-dashed'>
                  <span>issuer</span>
                  <span className='flex flex-row'>
                    <Link
                      href={`/${chainId}/account/${claim.issuer.address}`}
                      className='hover:text-gray-200'
                    >
                      {`${claim.issuer.address.slice(
                        0,
                        5
                      )}…${claim.issuer.address.slice(-6)}`}
                    </Link>
                    <button
                      className='ml-1 text-white'
                      onClick={async () => {
                        await navigator.clipboard.writeText(
                          claim.issuer.address
                        );
                        toast.success('Address copied to clipboard');
                      }}
                    >
                      <CopyIcon />
                    </button>
                  </span>
                </div>
                <div>claim id: {claim.id}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      <CreateClaim bountyId={String(bounty.id)} />
    </div>
  );
};

export default Claims;
