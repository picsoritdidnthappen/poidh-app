import React, { useEffect } from 'react';
import Image from 'next/image';
import { TwitterXIcon } from '@/components/global/Icons';

// Props for the component
interface XLinkProps {
  address: string; // The Ethereum address to fetch the Farcsetr username for
  className?: string;
}

const XLink: React.FC<XLinkProps> = ({ address, className }) => {
  const [username, setUsername] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);

  useEffect(() => {
    async function fetchUsername() {
      try {
        const response = await fetch(`/api/farcaster-user?address=${address}`);
        const data = await response.json();

        if (response.ok && data.x_username) {
          setUsername(data.x_username);
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

  const xUrl = `https://x.com/${username}`;

  return (
    <a
      href={xUrl}
      target='_blank'
      rel='noopener noreferrer'
      className={`inline-block ${className}`}
      aria-label={`Visit ${username}'s X profile`}
    >
      <TwitterXIcon width={17} height={20} />
    </a>
  );
};

export default XLink;
