import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getBountiesForAlbum } from '@/lib/queries';
import { BountyCard } from '@/components/bounty-card';
import { LoadingSpinner } from '@/components/loading-spinner';

interface AlbumPageProps {
  params: {
    slug: string;
  };
}

export default async function AlbumPage({ params }: AlbumPageProps) {
  const { slug } = params;
  
  try {
    const bounties = await getBountiesForAlbum(slug);
    
    if (!bounties || bounties.length === 0) {
      notFound();
    }

    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold capitalize">{slug} Album</h1>
          <p className="text-gray-600 mt-2">
            {bounties.length} bounties found
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bounties.map((bounty) => (
            <Suspense key={bounty.id} fallback={<LoadingSpinner />}>
              <BountyCard bounty={bounty} />
            </Suspense>
          ))}
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error fetching album bounties:', error);
    notFound();
  }
}

export async function generateMetadata({ params }: AlbumPageProps) {
  const { slug } = params;
  
  return {
    title: `${slug.charAt(0).toUpperCase() + slug.slice(1)} Album - POIDH`,
    description: `Browse bounties in the ${slug} album on POIDH`,
  };
}