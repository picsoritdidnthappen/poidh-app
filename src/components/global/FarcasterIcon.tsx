import React, { useEffect } from 'react';
import Image from 'next/image';

// Props for the component
interface FarcasterLinkProps {
  address: string; // The Ethereum address to fetch the Farcsetr username for
  className?: string;
}

const FarcasterLink: React.FC<FarcasterLinkProps> = ({
  address,
  className,
}) => {
  const [username, setUsername] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);

  useEffect(() => {
    async function fetchUsername() {
      try {
        const response = await fetch(`/api/farcaster-user?address=${address}`);
        const data = await response.json();

        if (response.ok && data.username) {
          setUsername(data.username);
          console.log('Fetched username:', data.username);
        } else {
          setUsername(null);
          console.log('No username found for address:', address);
        }
      } catch (error) {
        console.error('Error fetching Farcaster username:', error);
        setUsername(null);
      } finally {
        setLoading(false);
      }
    }
    fetchUsername();
  }, [address]);

  // If loading, show a loading spinner or placeholder
  if (loading) {
    return null;
  }

  // If no username is found, don't render the link
  if (!username) {
    return null;
  }

  const farcasterUrl = `https://warpcast.com/${username}`;

  return (
    <a
      href={farcasterUrl}
      target='_blank'
      rel='noopener noreferrer'
      className={`inline-block ${className}`}
      aria-label={`Visit ${username}'s Warpcast profile`}
    >
      {/* Farcaster Icon */}
      <Image
        src='/images/farcaster_arch.webp'
        alt='Warpcast'
        width={17}
        height={20}
        className='hover:opacity-80 transition-opacity'
      />
    </a>
  );
};

export default FarcasterLink;
