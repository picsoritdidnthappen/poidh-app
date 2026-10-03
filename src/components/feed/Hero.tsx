'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';

import { useHeroCycle, useHeroPolaroids } from '@/hooks/useHeroPolaroids';
import { useIsOnScreen } from '@/hooks/useIsOnScreen';
import { ALBUMS } from '@/utils/constants';
import HeroPolaroidRow, {
  POLAROID_FADE_MS,
} from '@/components/feed/HeroPolaroidRow';

/*
 * The homepage hero: "social bounties for <album>" over the polaroid row.
 * Both run on one clock (useHeroCycle): each step the album word turns over
 * and every polaroid slot gets its next one. Pauses while a polaroid or the
 * album link is hovered or focused, and while off-screen or in a background tab.
 */
export default function Hero() {
  const polaroids = useHeroPolaroids();

  const [isHovered, setIsHovered] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);
  const heroRef = useRef<HTMLElement>(null);
  const isOnScreen = useIsOnScreen(heroRef);
  const step = useHeroCycle(polaroids, isHovered || hasFocus || !isOnScreen);

  const album = ALBUMS[step % ALBUMS.length];

  return (
    <section
      ref={heroRef}
      // Paused only while a polaroid or the album link is under the pointer,
      // not the heading text or the gaps between cards.
      onPointerOver={(event) =>
        setIsHovered(!!(event.target as Element).closest('a'))
      }
      onPointerLeave={() => setIsHovered(false)}
      // The links are all that can take focus in here.
      onFocus={() => setHasFocus(true)}
      onBlur={(event) => {
        // Still paused while focus moves between the links.
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setHasFocus(false);
        }
      }}
    >
      <div className='flex flex-col items-center text-center px-6 pt-6 pb-2 lg:pt-14'>
        <h3 className='font-mono mt-4 mb-2 text-2xl sm:text-3xl md:text-4xl'>
          <span className='block'>social bounties for</span>
          {/* Always its own line, so the heading never reflows between words. */}
          <Link
            href={`/a/${album.slug}`}
            className='block mx-auto w-fit h-fit overflow-hidden no-underline'
          >
            <span
              key={step}
              className='block motion-reduce:![animation:none]'
              style={{
                animation: `turnstile ${POLAROID_FADE_MS}ms ease-in-out`,
              }}
            >
              {album.name}
            </span>
          </Link>
        </h3>
      </div>
      <HeroPolaroidRow
        polaroids={polaroids.polaroidsForStep(step)}
        isLoading={polaroids.isLoading}
      />
    </section>
  );
}
