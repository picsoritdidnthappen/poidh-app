import React, { useEffect } from 'react';
import Image from 'next/image';

// Props for the component
interface WarpcastLinkProps {
  address: string; // The Ethereum address to fetch the Warpcast username for
  className?: string; // Optional Tailwind CSS classes for styling
}

const WarpcastLink: React.FC<WarpcastLinkProps> = ({ address, className }) => {
  const [username, setUsername] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);

  useEffect(() => {
    async function fetchUsername() {
      try {
        // Fetch the Farcaster username from the new API route
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

  const warpcastUrl = `https://warpcast.com/${username}`;

  return (
    <a
      href={warpcastUrl}
      target='_blank'
      rel='noopener noreferrer'
      className={`inline-block ${className}`}
      aria-label={`Visit ${username}'s Warpcast profile`}
    >
      {/* Warpcast Icon */}
      <Image
        src='/images/farcaster_arch.webp'
        alt='Warpcast'
        width={24} // Adjust size as needed
        height={24}
        className='hover:opacity-80 transition-opacity'
      />
    </a>
  );
};

export default WarpcastLink;
